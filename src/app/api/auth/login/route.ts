import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {parseCredentials} from '@/lib/request-policy';
import {ApiError,apiFailure,assertSameOrigin,enforceRequests} from '@/lib/api-security';
import {
  verifyPassword,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const input=parseCredentials(await req.json());if(!input.ok)throw new ApiError(input.error);
    const {email,password}=input;
    await enforceRequests(req,'login',undefined,email);

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "電子郵件或密碼不正確。" },
        { status: 401 }
      );
    }

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    return apiFailure(e,'login error');
  }
}
