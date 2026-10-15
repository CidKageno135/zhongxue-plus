import { NextResponse } from "next/server";
import { db } from "@/db";
import { sentences, words } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const sentenceId = Number(id);
    const b = await req.json();
    const chinese = String(b.chinese ?? "").trim();
    if (!chinese) {
      return NextResponse.json(
        { error: "The Chinese sentence is required." },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: sentences.id })
      .from(sentences)
      .where(and(eq(sentences.id, sentenceId), eq(sentences.userId, user.id)))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Sentence not found" }, { status: 404 });
    }

    const [sentence] = await db
      .update(sentences)
      .set({
        chinese,
        pinyin: String(b.pinyin ?? "").trim(),
        english: String(b.english ?? "").trim(),
      })
      .where(eq(sentences.id, sentenceId))
      .returning();

    return NextResponse.json({ sentence });
  } catch (e) {
    console.error("sentence PATCH error", e);
    return NextResponse.json({ error: "Could not update the sentence" }, { status: 500 });
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
    const sentenceId = Number(id);
    const existing = await db
      .select({ id: sentences.id })
      .from(sentences)
      .where(and(eq(sentences.id, sentenceId), eq(sentences.userId, user.id)))
      .limit(1);
    if (!existing[0]) {
      return NextResponse.json({ error: "Sentence not found" }, { status: 404 });
    }

    await db
      .delete(sentences)
      .where(and(eq(sentences.id, sentenceId), eq(sentences.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("sentence DELETE error", e);
    return NextResponse.json({ error: "Could not delete the sentence" }, { status: 500 });
  }
}
