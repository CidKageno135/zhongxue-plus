import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const b = await req.json();
    const total = Number(b.total);
    const correct = Number(b.correct);
    const scope = String(b.scope ?? "all").slice(0, 20);

    if (!Number.isInteger(total) || !Number.isInteger(correct) || total < 1 || correct < 0 || correct > total) {
      return NextResponse.json({ error: "Invalid quiz result." }, { status: 400 });
    }

    const [attempt] = await db
      .insert(quizAttempts)
      .values({ userId: user.id, total, correct, scope })
      .returning();

    return NextResponse.json({ attempt }, { status: 201 });
  } catch (e) {
    console.error("quiz submit error", e);
    return NextResponse.json({ error: "Could not save the result" }, { status: 500 });
  }
}
