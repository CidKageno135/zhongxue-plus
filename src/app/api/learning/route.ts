import {NextResponse} from "next/server";
import {db} from "@/db";
import {learningActivities} from "@/db/schema";
import {getSessionUser} from "@/lib/auth";
import {gradePractice} from '@/lib/practice';
import {learningOverview} from '@/lib/learning-store';
import {ApiError,apiFailure,assertSameOrigin,enforceRequests} from '@/lib/api-security';
export const dynamic="force-dynamic";
export async function GET(req:Request) {
 try {
  const user=await getSessionUser();
  if (!user) return NextResponse.json({error:"請先登入。"},{status:401});
  const page=Number(new URL(req.url).searchParams.get('page')??0);if(!Number.isInteger(page)||page<0||page>1000)throw new ApiError('無效的頁碼。');
  return NextResponse.json(await learningOverview(user.id,page));
 } catch(e) {return apiFailure(e,'learning history');}
}
export async function POST(req:Request) {
 try {
  assertSameOrigin(req);const validated=gradePractice(await req.json());
  if (!validated.ok) return NextResponse.json({error:validated.error},{status:400});
  const user=await getSessionUser();
  if (!user) return NextResponse.json({error:"請先登入。"},{status:401});
  await enforceRequests(req,'practice',user);
  const [record]=await db.insert(learningActivities).values({userId:user.id,...validated.value}).returning();
  return NextResponse.json({record,feedback:validated.feedback},{status:201});
 } catch(e) {return apiFailure(e,'learning save');}
}
