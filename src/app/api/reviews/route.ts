import { NextResponse } from "next/server";
import { db } from "@/db";
import { cards, words, reviewLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { scheduleCard, statusFor } from "@/lib/srs";
import type { Rating } from "@/lib/types";

/** Grade the current card (again / hard / good / easy) and schedule the next review. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const wordId = Number(b.wordId);
    const rating = Number(b.rating);

    if (!Number.isInteger(wordId) || ![0, 1, 2, 3].includes(rating)) {
      return NextResponse.json(
        { error: "A word id and a valid rating (0-3) are required." },
        { status: 400 }
      );
    }

    const wordRows = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.id, wordId), eq(words.userId, user.id)))
      .limit(1);
    if (!wordRows[0]) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, user.id), eq(cards.wordId, wordId)))
      .limit(1);

    const now = new Date();
    const scheduled = scheduleCard(existing[0] ?? null, rating as Rating, now);

    let card;
    if (existing[0]) {
      [card] = await db
        .update(cards)
        .set({ ...scheduled, lastReviewedAt: now, updatedAt: now })
        .where(eq(cards.id, existing[0].id))
        .returning();
    } else {
      [card] = await db
        .insert(cards)
        .values({ userId: user.id, wordId, ...scheduled, lastReviewedAt: now })
        .returning();
    }

    await db.insert(reviewLogs).values({
      userId: user.id,
      wordId,
      rating,
      intervalDays: scheduled.intervalDays,
    });

    return NextResponse.json({ card, status: statusFor(card) });
  } catch (e) {
    console.error("review POST error", e);
    return NextResponse.json({ error: "Could not save the review" }, { status: 500 });
  }
}
