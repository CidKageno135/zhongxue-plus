import {NextResponse} from "next/server";
import {db} from "@/db";
import {dictionaryBookmarks,dictionaryHistory} from "@/db/schema";
import {and,desc,eq} from "drizzle-orm";
import {getSessionUser} from "@/lib/auth";
import {getDictionary,getDictionaryDetail} from "@/lib/dictionary-store";
import {searchDictionary,publicEntry,type SearchMode} from "@/lib/dictionary";
import metadata from "../../../../data/dictionary/metadata.json";
import {assertSameOrigin,enforceRequests,apiFailure} from '@/lib/api-security';
export const dynamic="force-dynamic";
const idPattern=/^cv-[a-f0-9]{24}$/;
export async function GET(req:Request) {
 try {
  const params=new URL(req.url).searchParams;
  if (params.has("id")) {
   const id=params.get("id")!;
   if (!idPattern.test(id)) return NextResponse.json({error:"無效的詞條。"},{status:400});
   const detail=await getDictionaryDetail(id);
   if (!detail) return NextResponse.json({error:"找不到這個詞條。"},{status:404});
   const user=await getSessionUser();
   const bookmarked=user?await db.select({id:dictionaryBookmarks.id}).from(dictionaryBookmarks).where(and(eq(dictionaryBookmarks.userId,user.id),eq(dictionaryBookmarks.entryId,id))).limit(1):[];
   return NextResponse.json({...detail,saved:bookmarked.length>0});
  }
  if (params.has("shelf")) return await shelf(params.get("shelf")!);
  const query=params.get("q") ?? "",mode=params.get("mode") ?? "all",offset=Number(params.get("offset") ?? 0);
  if (query.length>80 || !["all","hanzi","pinyin","vi"].includes(mode) || !Number.isInteger(offset) || offset<0 || offset>400) return NextResponse.json({error:"請輸入最多 80 字，並選擇有效的查詢方式。"},{status:400});
  const {entries}=await getDictionary();
  return NextResponse.json({...searchDictionary(entries,query,mode as SearchMode,offset),offset,count:entries.length,source:metadata.name});
 } catch {return NextResponse.json({error:"詞典暫時無法載入，請重試。"},{status:500});}
}
async function shelf(kind:string) {
 if (!["saved","history"].includes(kind)) return NextResponse.json({error:"無效的清單。"},{status:400});
 const user=await getSessionUser();
 if (!user) return NextResponse.json({error:"請先登入。"},{status:401});
 const table=kind==="saved"?dictionaryBookmarks:dictionaryHistory;
 const order=kind==="saved"?dictionaryBookmarks.createdAt:dictionaryHistory.updatedAt;
 const rows=await db.select().from(table).where(eq(table.userId,user.id)).orderBy(desc(order)).limit(kind==="saved"?100:12);
 const {byId}=await getDictionary();
 const results=rows.flatMap(row=>{const entry=byId.get(row.entryId);return entry?[publicEntry(entry)]:[];});
 return NextResponse.json({results});
}
export async function POST(req:Request) {
 try {
  assertSameOrigin(req);const body=await req.json();
  if (!body || typeof body.id!=="string" || !idPattern.test(body.id) || !["save","unsave","view"].includes(body.action)) return NextResponse.json({error:"請選擇有效的詞條與操作。"},{status:400});
  const {byId}=await getDictionary();
  if (!byId.has(body.id)) return NextResponse.json({error:"找不到這個詞條。"},{status:404});
  const user=await getSessionUser();
  if (!user) return NextResponse.json({error:"請先登入。"},{status:401});
  await enforceRequests(req,'practice',user);
  if (body.action==="save") {
   await db.insert(dictionaryBookmarks).values({userId:user.id,entryId:body.id}).onConflictDoNothing();
  } else if (body.action==="unsave") {
   await db.delete(dictionaryBookmarks).where(and(eq(dictionaryBookmarks.userId,user.id),eq(dictionaryBookmarks.entryId,body.id)));
  } else {
   await db.insert(dictionaryHistory).values({userId:user.id,entryId:body.id}).onConflictDoUpdate({target:[dictionaryHistory.userId,dictionaryHistory.entryId],set:{updatedAt:new Date()}});
  }
  return NextResponse.json({ok:true});
 } catch(e) {return apiFailure(e,'dictionary save');}
}
