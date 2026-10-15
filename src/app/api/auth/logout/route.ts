import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import {assertSameOrigin,apiFailure} from '@/lib/api-security';

export async function POST(req:Request) {
  try {
    assertSameOrigin(req);await destroySession();
    return NextResponse.json({ ok: true });
  } catch(e) {
    return apiFailure(e,'logout error');
  }
}
