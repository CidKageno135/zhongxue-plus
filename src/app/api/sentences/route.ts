import { NextResponse } from "next/server";
import { db } from "@/db";
import { sentences, words } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import type { SentenceWithWord } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const rows = await db
      .select({
        id: sentences.id,
        wordId: sentences.wordId,
        chinese: sentences.chinese,
        pinyin: sentences.pinyin,
        english: sentences.english,
        createdAt: sentences.createdAt,
        word: {
          id: words.id,
          hanzi: words.hanzi,
          pinyin: words.pinyin,
          translation: words.translation,
          hskLevel: words.hskLevel,
        },
      })
      .from(sentences)
      .innerJoin(words, eq(sentences.wordId, words.id))
      .where(eq(sentences.userId, user.id))
      .orderBy(desc(sentences.createdAt))
      .limit(500);

    return NextResponse.json({ sentences: rows as SentenceWithWord[] });
  } catch (e) {
    console.error("sentences GET error", e);
    return NextResponse.json({ error: "Failed to load sentences" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const wordId = Number(b.wordId);
    const chinese = String(b.chinese ?? "").trim();
    const pinyin = String(b.pinyin ?? "").trim();
    const english = String(b.english ?? "").trim();

    if (!Number.isInteger(wordId) || !chinese) {
      return NextResponse.json(
        { error: "A word and the Chinese sentence are required." },
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

    const [sentence] = await db
      .insert(sentences)
      .values({ wordId, userId: user.id, chinese, pinyin, english })
      .returning();

    return NextResponse.json({ sentence }, { status: 201 });
  } catch (e) {
    console.error("sentences POST error", e);
    return NextResponse.json({ error: "Could not add the sentence" }, { status: 500 });
  }
}
