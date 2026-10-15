import {and,desc,eq} from 'drizzle-orm';
import {db} from '@/db';
import {conversationThreads,learningActivities} from '@/db/schema';
import {ApiError} from './api-security';
import {appendDialogue} from './practice-feedback';
export type DialogueMode='ai'|'guided';
export async function loadDialogue(userId:number,unitId:number,mode:DialogueMode,threadId?:number){
 const rows=await db.select().from(conversationThreads).where(and(eq(conversationThreads.userId,userId),eq(conversationThreads.unitId,unitId),eq(conversationThreads.mode,mode))).orderBy(desc(conversationThreads.updatedAt),desc(conversationThreads.id)).limit(10);
 const thread=threadId?await findDialogue(userId,unitId,mode,threadId):rows[0]??null;
 return {thread,threads:rows.map(t=>({id:t.id,updatedAt:t.updatedAt,preview:t.messages.find(m=>m.role==='user')?.content.slice(0,32)||'新對話 / Hội thoại mới'}))};
}
export async function findDialogue(userId:number,unitId:number,mode:DialogueMode,id:number){
 const rows=await db.select().from(conversationThreads).where(and(eq(conversationThreads.id,id),eq(conversationThreads.userId,userId),eq(conversationThreads.unitId,unitId),eq(conversationThreads.mode,mode))).limit(1);
 if(!rows[0])throw new ApiError('找不到這段對話。 / Không tìm thấy hội thoại này.',404);return rows[0];
}
export async function newDialogue(userId:number,unitId:number,mode:DialogueMode){
 const [thread]=await db.insert(conversationThreads).values({userId,unitId,mode,messages:[]}).returning();return thread;
}
export async function storeReply(userId:number,unitId:number,mode:DialogueMode,thread:Awaited<ReturnType<typeof findDialogue>>|null,user:string,assistant:string){
 const messages=appendDialogue(thread?.messages??[],user,assistant);
 return db.transaction(async tx=>{
  const rows=thread?await tx.update(conversationThreads).set({messages,version:thread.version+1,updatedAt:new Date()}).where(and(eq(conversationThreads.id,thread.id),eq(conversationThreads.userId,userId),eq(conversationThreads.version,thread.version))).returning():await tx.insert(conversationThreads).values({userId,unitId,mode,messages}).returning();
  if(!rows.length)throw new ApiError('對話已更新，請重新載入後再回答。 / Hội thoại đã thay đổi, hãy tải lại.',409);
  await tx.insert(learningActivities).values({userId,unitId,kind:'conversation',score:0});return rows[0];
 });
}
