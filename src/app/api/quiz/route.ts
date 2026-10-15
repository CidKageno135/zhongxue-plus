import { NextResponse } from "next/server";
import { db } from "@/db";
import { words, cards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { clamp, shuffle } from "@/lib/utils";
import type { QuizQuestion, QuizQuestionType } from "@/lib/types";

const MIXED_TYPES: QuizQuestionType[] = [
  "hanzi_to_meaning",
  "meaning_to_hanzi",
  "pinyin_to_hanzi",
  "audio_to_meaning",
];

/**
 * Generate a quiz. Query params:
 *  - type: "mixed" (default) | "audio" (listening only)
 *  - count: number of questions (3-20, default 10)
 *  - scope: "all" | "learned" | "hsk1" ... "hsk6"
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") === "audio" ? "audio" : "mixed";
    const count = clamp(Number(sp.get("count")) || 10, 3, 20);
    const scope = sp.get("scope") || "all";

    const pool = await db
      .select()
      .from(words)
      .where(eq(words.userId, user.id));

    let eligible = pool;
    if (scope === "learned") {
      const carded = await db
        .select({ wordId: cards.wordId })
        .from(cards)
        .where(eq(cards.userId, user.id));
      const ids = new Set(carded.map((c) => c.wordId));
      eligible = pool.filter((w) => ids.has(w.id));
    } else if (scope.startsWith("hsk")) {
      const level = Number(scope.slice(3));
      if (Number.isInteger(level)) {
        eligible = pool.filter((w) => w.hskLevel === level);
      }
    }

    if (eligible.length < 4) {
      return NextResponse.json({
        questions: [],
        hint: "Add at least 4 words to take a quiz.",
      });
    }

    const selected = shuffle(eligible).slice(0, Math.min(count, eligible.length));
    const questions: QuizQuestion[] = [];

    selected.forEach((word, i) => {
      const qType: QuizQuestionType =
        type === "audio" ? "audio_to_meaning" : MIXED_TYPES[i % MIXED_TYPES.length];

      const others = shuffle(eligible.filter((w) => w.id !== word.id));

      let correct = "";
      let options: string[] = [];
      switch (qType) {
        case "hanzi_to_meaning":
        case "audio_to_meaning":
          correct = word.translation;
          options = [
            correct,
            ...others.map((w) => w.translation).filter((t) => t !== correct).slice(0, 3),
          ];
          break;
        case "meaning_to_hanzi":
          correct = word.hanzi;
          options = [
            correct,
            ...others.map((w) => w.hanzi).filter((h) => h !== correct).slice(0, 3),
          ];
          break;
        case "pinyin_to_hanzi":
          correct = word.hanzi;
          options = [
            correct,
            ...others.map((w) => w.hanzi).filter((h) => h !== correct).slice(0, 3),
          ];
          break;
      }

      options = shuffle(options);
      questions.push({
        id: `${word.id}-${qType}`,
        type: qType,
        prompt: { hanzi: word.hanzi, pinyin: word.pinyin, translation: word.translation },
        options,
        answer: options.indexOf(correct),
      });
    });

    return NextResponse.json({ questions });
  } catch (e) {
    console.error("quiz GET error", e);
    return NextResponse.json({ error: "Could not generate the quiz" }, { status: 500 });
  }
}
