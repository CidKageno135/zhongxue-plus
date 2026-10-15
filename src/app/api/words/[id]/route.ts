import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, cards, sentences, reviewLogs } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { statusFor } from "@/lib/srs";
import { clamp } from "@/lib/utils";
import type { WordDetail } from "@/lib/types";

const POS_WHITELIST = new Set([
  "noun", "verb", "adj", "adv", "pron", "phrase", "measure word",
  "particle", "conjunction", "preposition", "interjection", "numeral",
]);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const wordId = Number(id);
    if (!Number.isInteger(wordId)) {
      return NextResponse.json({ error: "Invalid word id" }, { status: 400 });
    }

    const wordRows = await db
      .select()
      .from(words)
      .where(and(eq(words.id, wordId), eq(words.userId, user.id)))
      .limit(1);
    const word = wordRows[0];
    if (!word) return NextResponse.json({ error: "Word not found" }, { status: 404 });

    const cardRows = await db
      .select()
      .from(cards)
      .where(and(eq(cards.wordId, wordId), eq(cards.userId, user.id)))
      .limit(1);
    const card = cardRows[0] ?? null;

    const sentRows = await db
      .select()
      .from(sentences)
      .where(eq(sentences.wordId, wordId))
      .orderBy(asc(sentences.id));

    const logs = await db
      .select({ rating: reviewLogs.rating })
      .from(reviewLogs)
      .where(and(eq(reviewLogs.wordId, wordId), eq(reviewLogs.userId, user.id)));
    const correct = logs.filter((l) => l.rating >= 1).length;

    const detail: WordDetail = {
      word: {
        ...word,
        card,
        status: statusFor(card),
        sentenceCount: sentRows.length,
        sentences: sentRows,
      },
      sentences: sentRows,
      stats: {
        reviews: logs.length,
        correct,
        accuracy: logs.length > 0 ? Math.round((correct / logs.length) * 100) : 0,
      },
    };
    return NextResponse.json(detail);
  } catch (e) {
    console.error("word GET error", e);
    return NextResponse.json({ error: "Failed to load word" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const wordId = Number(id);
    const b = await req.json();

    const hanzi = String(b.hanzi ?? "").trim();
    const pinyin = String(b.pinyin ?? "").trim();
    const translation = String(b.translation ?? "").trim();
    if (!hanzi || !pinyin || !translation) {
      return NextResponse.json(
        { error: "Hanzi, pinyin and translation are all required." },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.id, wordId), eq(words.userId, user.id)))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    const [word] = await db
      .update(words)
      .set({
        hanzi,
        pinyin,
        translation,
        partOfSpeech: POS_WHITELIST.has(String(b.partOfSpeech))
          ? String(b.partOfSpeech)
          : "noun",
        hskLevel: clamp(Number(b.hskLevel) || 1, 1, 6),
        updatedAt: new Date(),
      })
      .where(eq(words.id, wordId))
      .returning();

    const cardRows = await db
      .select()
      .from(cards)
      .where(and(eq(cards.wordId, wordId), eq(cards.userId, user.id)))
      .limit(1);
    const card = cardRows[0] ?? null;

    return NextResponse.json({
      word: { ...word, card, status: statusFor(card) },
    });
  } catch (e) {
    console.error("word PATCH error", e);
    return NextResponse.json({ error: "Could not update the word" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const wordId = Number(id);
    const existing = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.id, wordId), eq(words.userId, user.id)))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    await db.delete(words).where(and(eq(words.id, wordId), eq(words.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("word DELETE error", e);
    return NextResponse.json({ error: "Could not delete the word" }, { status: 500 });
  }
}
