import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { db, ensureDbReady } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEMO_USER } from "./seed-data";
import type { SessionUser } from "./types";

export { hashPassword, verifyPassword } from "./password";

const COOKIE = "hf_session";
const SESSION_DAYS = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Resolve the current user. If no valid session cookie exists, we
 * automatically sign in as the demo learner — no login step required.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  await ensureDbReady();
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    try {
      const rows = await db
        .select({
          user: { id: users.id, name: users.name, email: users.email },
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.tokenHash, hashToken(token)))
        .limit(1);
      const session = rows[0];
      if (session && session.expiresAt.getTime() >= Date.now()) {
        return session.user;
      }
    } catch(error) {
      console.error('Session lookup failed',{name:error instanceof Error?error.name:'UnknownError'});
      return null;
    }
  }
  return getDemoUser();
}

async function getDemoUser(): Promise<SessionUser | null> {
  try {
    let rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, DEMO_USER.email))
      .limit(1);
    if (!rows[0]) {
      const { seedIfEmpty } = await import("@/db/seed");
      await seedIfEmpty();
      rows = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.email, DEMO_USER.email))
        .limit(1);
    }
    return rows[0] ?? null;
  } catch(error) {
    console.error('Demo lookup failed',{name:error instanceof Error?error.name:'UnknownError'});
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  store.delete(COOKIE);
}
