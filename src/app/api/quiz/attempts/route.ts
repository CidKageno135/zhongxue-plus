import { NextResponse } from "next/server";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, user.id))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(10);
    return NextResponse.json({ attempts });
  } catch (e) {
    console.error("quiz attempts error", e);
    return NextResponse.json({ error: "Failed to load quiz history" }, { status: 500 });
  }
}
