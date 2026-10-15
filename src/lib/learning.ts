import { getUnit, UNITS } from "./curriculum";

export type ActivityKind = "lesson" | "speech" | "text" | "conversation";
export interface ActivityInput { unitId: number; kind: ActivityKind; score: number }
export interface ActivityRecord extends ActivityInput { id?:number; createdAt?:string | Date }
const variants = "学學生生语語国國湾灣师師图圖馆館书書这這钱錢课課无無糖糖欢歡车車边邊练練习習来來门門气氣买買间間医醫头頭经經验驗请請电電报報说說复複标標觉覺为為时時东東个個吗嗎点點会會动動后後饭飯现現应應难難听聽词詞再再离離准準备備过過两兩台臺面麵运運样樣么麼姐姊";
const pairs = new Map(Array.from({length:variants.length / 2},(_,i)=>[variants[i*2],variants[i*2+1]]));
export function normalizeSpeech(text: string): string {
  return Array.from(text.normalize("NFKC").toLowerCase()).map(c=>pairs.get(c) ?? c).join("").replace(/[^\p{L}\p{N}]/gu,"");
}
export function compareSpeech(expected: string, recognized: string) {
  const a = Array.from(normalizeSpeech(expected));
  const b = Array.from(normalizeSpeech(recognized));
  if (!a.length || !b.length) return {match:0,expected,recognized};
  let row = Array.from({length:b.length+1},(_,i)=>i);
  for (let i=0;i<a.length;i++) {
    const next = [i+1];
    for (let j=0;j<b.length;j++) next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(a[i]===b[j]?0:1)));
    row = next;
  }
  return {match:Math.max(0,Math.round((1-row[b.length]/Math.max(a.length,b.length))*100)),expected,recognized};
}
export function validateActivity(body: unknown): {ok:true; value:ActivityInput} | {ok:false; error:string} {
  if (!body || typeof body !== "object") return {ok:false,error:"請提供練習資料。"};
  const b = body as Record<string,unknown>;
  if (typeof b.unitId !== "number" || !getUnit(b.unitId) || !["lesson","speech","text","conversation"].includes(String(b.kind)) || typeof b.score !== "number" || !Number.isInteger(b.score) || b.score<0 || b.score>100) return {ok:false,error:"課程、練習類型或分數不正確。"};
  return {ok:true,value:{unitId:b.unitId,kind:b.kind as ActivityKind,score:b.score}};
}
export function summarizeActivities(records: ActivityRecord[]) {
  const completedIds = [...new Set(records.filter(r=>r.kind==="lesson" && r.score===100).map(r=>r.unitId))];
  const speech = records.filter(r=>r.kind==="speech");
  return {completedIds,completedUnits:completedIds.length,speakingAttempts:speech.length,
    speakingMatch:speech.length ? Math.round(speech.reduce((sum,r)=>sum+r.score,0)/speech.length):0,
    textAttempts:records.filter(r=>r.kind==="text").length,
    conversationTurns:records.filter(r=>r.kind==="conversation").length,
    recommendationUnitId:UNITS.find(u=>!completedIds.includes(u.id))?.id ?? 20};
}
