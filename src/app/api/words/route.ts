import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, cards, sentences } from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { statusFor } from "@/lib/srs";
import { clamp } from "@/lib/utils";
import type { WordWithCard } from "@/lib/types";

const POS_WHITELIST = new Set([
  "noun", "verb", "adj", "adv", "pron", "phrase", "measure word",
  "particle", "conjunction", "preposition", "interjection", "numeral",
]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const wordRows = await db
      .select()
      .from(words)
      .where(eq(words.userId, user.id))
      .orderBy(desc(words.createdAt));

    const cardRows = await db
      .select()
      .from(cards)
      .where(eq(cards.userId, user.id));
    const cardMap = new Map(cardRows.map((c) => [c.wordId, c]));

    const countRows = await db
      .select({ wordId: sentences.wordId, n: count() })
      .from(sentences)
      .where(eq(sentences.userId, user.id))
      .groupBy(sentences.wordId);
    const countMap = new Map(countRows.map((r) => [r.wordId, Number(r.n)]));

    const data: WordWithCard[] = wordRows.map((w) => {
      const card = cardMap.get(w.id) ?? null;
      return {
        ...w,
        card,
        status: statusFor(card),
        sentenceCount: countMap.get(w.id) ?? 0,
      };
    });

    return NextResponse.json({ words: data });
  } catch (e) {
    console.error("words GET error", e);
    return NextResponse.json({ error: "Failed to load words" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const hanzi = String(b.hanzi ?? "").trim();
    const pinyin = String(b.pinyin ?? "").trim();
    const translation = String(b.translation ?? "").trim();
    const partOfSpeech = POS_WHITELIST.has(String(b.partOfSpeech))
      ? String(b.partOfSpeech)
      : "noun";
    const hskLevel = clamp(Number(b.hskLevel) || 1, 1, 6);

    if (!hanzi || !pinyin || !translation) {
      return NextResponse.json(
        { error: "Hanzi, pinyin and translation are all required." },
        { status: 400 }
      );
    }

    const [word] = await db
      .insert(words)
      .values({ userId: user.id, hanzi, pinyin, translation, partOfSpeech, hskLevel })
      .returning();

    const sents = Array.isArray(b.sentences) ? b.sentences.slice(0, 10) : [];
    const created: typeof sentences.$inferSelect[] = [];
    for (const s of sents) {
      const chinese = String(s?.chinese ?? "").trim();
      if (!chinese) continue;
      const [row] = await db
        .insert(sentences)
        .values({
          wordId: word.id,
          userId: user.id,
          chinese,
          pinyin: String(s?.pinyin ?? "").trim(),
          english: String(s?.english ?? "").trim(),
        })
        .returning();
      created.push(row);
    }

    const result: WordWithCard = {
      ...word,
      card: null,
      status: "new",
      sentenceCount: created.length,
      sentences: created,
    };
    return NextResponse.json({ word: result }, { status: 201 });
  } catch (e) {
    console.error("words POST error", e);
    return NextResponse.json({ error: "Could not create the word" }, { status: 500 });
  }
}
