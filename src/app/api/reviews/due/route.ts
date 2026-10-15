import { NextResponse } from "next/server";
import { db } from "@/db";
import { cards, words, sentences } from "@/db/schema";
import { and, asc, count, eq, inArray, lte, notInArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { clamp } from "@/lib/utils";
import type { DueItem, DueResponse } from "@/lib/types";

/**
 * Get the review queue: cards that are due now, plus fresh (never-seen)
 * words to learn, up to `newLimit`.
 * Add `?counts=1` to only fetch the due/new counts (used for nav badges).
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const sp = new URL(req.url).searchParams;
    const countsOnly = sp.get("counts") === "1";
    const newLimit = clamp(Number(sp.get("newLimit")) || 10, 1, 30);
    const limit = clamp(Number(sp.get("limit")) || 40, 1, 80);
    const now = new Date();

    const dueTotal = await db
      .select({ n: count() })
      .from(cards)
      .where(and(eq(cards.userId, user.id), lte(cards.dueAt, now)));
    const dueCount = Number(dueTotal[0]?.n ?? 0);

    const carded = await db
      .select({ wordId: cards.wordId })
      .from(cards)
      .where(eq(cards.userId, user.id));
    const cardedIds = [...new Set(carded.map((c) => c.wordId))];

    const newCond = [
      eq(words.userId, user.id),
      ...(cardedIds.length > 0 ? [notInArray(words.id, cardedIds)] : []),
    ];
    const newTotal = await db
      .select({ n: count() })
      .from(words)
      .where(and(...newCond));
    const newCount = Number(newTotal[0]?.n ?? 0);

    const counts = { due: dueCount, new: newCount };
    if (countsOnly) {
      return NextResponse.json({ items: [], counts });
    }

    const items: DueItem[] = [];

    const dueRows = await db
      .select({
        card: cards,
        word: words,
      })
      .from(cards)
      .innerJoin(words, eq(cards.wordId, words.id))
      .where(and(eq(cards.userId, user.id), lte(cards.dueAt, now)))
      .orderBy(asc(cards.dueAt))
      .limit(limit);
    for (const row of dueRows) {
      items.push({ word: row.word, card: row.card, sentences: [] });
    }

    const remaining = Math.max(0, limit - items.length);
    const newRows = await db
      .select()
      .from(words)
      .where(and(...newCond))
      .orderBy(asc(words.createdAt))
      .limit(Math.min(newLimit, remaining));
    for (const word of newRows) {
      items.push({ word, card: null, sentences: [] });
    }

    // Attach up to 2 example sentences per item for context while studying.
    const wordIds = items.map((i) => i.word.id);
    if (wordIds.length > 0) {
      const sentRows = await db
        .select()
        .from(sentences)
        .where(and(eq(sentences.userId, user.id), inArray(sentences.wordId, wordIds)))
        .orderBy(asc(sentences.id));
      const byWord = new Map<number, typeof sentRows>();
      for (const s of sentRows) {
        const list = byWord.get(s.wordId) ?? [];
        if (list.length < 2) list.push(s);
        byWord.set(s.wordId, list);
      }
      for (const item of items) {
        item.sentences = byWord.get(item.word.id) ?? [];
      }
    }

    const payload: DueResponse = { items, counts };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("reviews due GET error", e);
    return NextResponse.json({ error: "Failed to load the review queue" }, { status: 500 });
  }
}
