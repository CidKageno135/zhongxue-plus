import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";
import {parseCredentials} from '@/lib/request-policy';
import {ApiError,apiFailure,assertSameOrigin,enforceRequests} from '@/lib/api-security';

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input=parseCredentials(await req.json(),true);if(!input.ok)throw new ApiError(input.error);
    const {email,password,name}=input;
    await enforceRequests(req,'register');

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "此電子郵件已註冊。" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name })
      .returning({ id: users.id, name: users.name, email: users.email });

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    return apiFailure(e,'register error');
  }
}
