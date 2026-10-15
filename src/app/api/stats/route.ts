import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, cards, reviewLogs, quizAttempts } from "@/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { statusFor } from "@/lib/srs";
import { clamp, dayKey, dayLabel, startOfDay } from "@/lib/utils";
import type { DailyPoint, StatsPayload, WordStats } from "@/lib/types";

const DAY = 86_400_000;
const DAILY_GOAL = 20;

/** Aggregate stats for the dashboard (?days=14) and progress (?days=30) pages. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const sp = new URL(req.url).searchParams;
    const daysN = clamp(Number(sp.get("days")) || 14, 7, 60);
    const now = new Date();

    const allWords = await db
      .select()
      .from(words)
      .where(eq(words.userId, user.id))
      .orderBy(desc(words.createdAt));

    const allCards = await db
      .select()
      .from(cards)
      .where(eq(cards.userId, user.id));
    const cardMap = new Map(allCards.map((c) => [c.wordId, c]));

    let wordsNew = 0;
    let wordsLearning = 0;
    let wordsMastered = 0;
    for (const w of allWords) {
      const status = statusFor(cardMap.get(w.id) ?? null);
      if (status === "new") wordsNew++;
      else if (status === "learning") wordsLearning++;
      else wordsMastered++;
    }

    const dueCards = allCards.filter(
      (c) => c.dueAt && c.dueAt.getTime() <= now.getTime()
    ).length;
    const newWordsAvailable = Math.max(0, allWords.length - allCards.length);

    // ---- Review logs in window ----
    const since = startOfDay(new Date(now.getTime() - (daysN - 1) * DAY));
    const logs = await db
      .select()
      .from(reviewLogs)
      .where(and(eq(reviewLogs.userId, user.id), gte(reviewLogs.reviewedAt, since)))
      .orderBy(asc(reviewLogs.reviewedAt));

    const dailyMap = new Map<string, DailyPoint>();
    const byDayLogs = new Map<string, Set<number>>();

    for (let i = 0; i < daysN; i++) {
      const day = new Date(startOfDay(now).getTime() - (daysN - 1 - i) * DAY);
      dailyMap.set(dayKey(day), {
        date: dayKey(day),
        label: dayLabel(day),
        count: 0,
        correct: 0,
      });
    }

    let totalCorrect = 0;
    for (const log of logs) {
      const key = dayKey(log.reviewedAt);
      const point = dailyMap.get(key);
      if (point) {
        point.count += 1;
        if (log.rating >= 1) point.correct += 1;
      }
      totalCorrect += log.rating >= 1 ? 1 : 0;
      if (!byDayLogs.has(key)) byDayLogs.set(key, new Set());
      byDayLogs.get(key)!.add(log.wordId);
    }

    // cumulative unique words reviewed per day
    const dailySorted = [...dailyMap.values()].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const learnedSeries: { date: string; label: string; total: number }[] = [];
    let cumulative = 0;
    for (const point of dailySorted) {
      cumulative += byDayLogs.get(point.date)?.size ?? 0;
      learnedSeries.push({ date: point.date, label: point.label, total: cumulative });
    }

    // ---- Streaks ----
    const activeDays = new Set(
      dailySorted.filter((p) => p.count > 0).map((p) => p.date)
    );
    let streak = 0;
    let cursor = new Date(startOfDay(now));
    if (!activeDays.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - DAY);
    while (activeDays.has(dayKey(cursor))) {
      streak++;
      cursor = new Date(cursor.getTime() - DAY);
    }
    let longest = 0;
    let run = 0;
    for (const point of dailySorted) {
      if (point.count > 0) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }

    const reviewsToday = dailyMap.get(dayKey(now))?.count ?? 0;
    const totalReviews = logs.length;
    const accuracy =
      totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

    // ---- HSK distribution ----
    const hskMap = new Map<number, number>();
    for (const w of allWords) {
      hskMap.set(w.hskLevel, (hskMap.get(w.hskLevel) ?? 0) + 1);
    }
    const hsk = [...hskMap.entries()]
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => a.level - b.level);

    // ---- Per-word performance ----
    const perWord = new Map<number, { total: number; correct: number }>();
    for (const log of logs) {
      const entry = perWord.get(log.wordId) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (log.rating >= 1) entry.correct += 1;
      perWord.set(log.wordId, entry);
    }
    const wordMap = new Map(allWords.map((w) => [w.id, w]));
    const toStats = (): WordStats[] =>
      [...perWord.entries()]
        .map(([wordId, { total, correct }]) => {
          const word = wordMap.get(wordId);
          if (!word) return null;
          return {
            word,
            reviews: total,
            correct,
            accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          } as WordStats;
        })
        .filter((x): x is WordStats => x !== null);

    const ranked = toStats();
    const struggling = ranked
      .filter((s) => s.reviews >= 2)
      .sort((a, b) => a.accuracy - b.accuracy || b.reviews - a.reviews)
      .slice(0, 5);
    const strongest = ranked
      .filter((s) => s.reviews >= 2)
      .sort((a, b) => b.accuracy - a.accuracy || b.reviews - a.reviews)
      .slice(0, 5);

    // ---- Recent words & quiz attempts ----
    const recentWords = allWords.slice(0, 5).map((w) => {
      const card = cardMap.get(w.id) ?? null;
      return { ...w, card, status: statusFor(card), sentenceCount: 0 };
    });

    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, user.id))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(10);

    const payload: StatsPayload = {
      wordsTotal: allWords.length,
      wordsNew,
      wordsLearning,
      wordsMastered,
      dueCards,
      newWordsAvailable,
      reviewsToday,
      dailyGoal: DAILY_GOAL,
      streak,
      longestStreak: Math.max(longest, streak),
      totalReviews,
      accuracy,
      daily: dailySorted,
      learnedSeries,
      hsk,
      recentWords,
      struggling,
      strongest,
      quizAttempts: attempts,
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("stats GET error", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
