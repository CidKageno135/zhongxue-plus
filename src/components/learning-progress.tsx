"use client";
import useSWR from "swr";
import Link from "next/link";
import {useState} from 'react';
import { UNITS, getUnit } from "@/lib/curriculum";
import type { summarizeActivities, ActivityRecord } from "@/lib/learning";
import {PageTitle,requestJson} from "./learning-common";
interface LearningData {summary:ReturnType<typeof summarizeActivities>;records:ActivityRecord[];hasMore:boolean;page:number}
const names={lesson:"詞彙與語法",speech:"口說辨識",text:"文字練習",conversation:"情境對話"};
export function LearningProgress({dashboard=false}:{dashboard?:boolean}) {
  const [page,setPage]=useState(0);
  const {data,error,isLoading,mutate}=useSWR<LearningData>(`/api/learning?page=${page}`,requestJson,{refreshInterval:15000});
  const summary=data?.summary,unit=getUnit(summary?.recommendationUnitId ?? 1)!;
  return <><PageTitle eyebrow={dashboard?"ZHONGXUE+ · 智慧華語學習":"學習紀錄 · Tiến độ học"} title={dashboard?"每天一點，慢慢說得更好":"看見每一次練習"} vi={dashboard?"Học tiếng Trung A1–A2 qua từ vựng, mẫu câu và hội thoại hằng ngày.":"Theo dõi bài đã hoàn thành, luyện nói và đối thoại."}/>
    {error?<div role="alert" className="zx-panel">紀錄載入失敗。<button className="zx-link-button" onClick={()=>mutate()}>重試</button></div>:isLoading?<p role="status">正在載入學習紀錄…</p>:<>
      <div className="zx-stats"><div><span>完成單元</span><strong>{summary?.completedUnits ?? 0}<small> / 20</small></strong></div><div><span>口說辨識</span><strong>{summary?.speakingAttempts ?? 0}<small> 次</small></strong></div><div><span>情境對話</span><strong>{summary?.conversationTurns ?? 0}<small> 次</small></strong></div><div><span>文字練習</span><strong>{summary?.textAttempts ?? 0}<small> 次</small></strong></div></div>
      <section className="zx-recommend"><div><span className="zx-eyebrow">下一步 / Bước tiếp theo</span><h2>{summary?.completedUnits===20?"再選一課，練習口說與對話":`${unit.level} · ${unit.title}`}</h2><p>{unit.vi}</p><small>依尚未完成的單元順序建議，屬於規則式安排。</small></div><Link className="zx-button" href={`/vocabulary?unit=${unit.id}`}>開始學習 →</Link></section>
      {dashboard?<div className="zx-feature-links">{[["01","詞彙與語法","20 個生活單元，中越對照","/vocabulary"],["02","口說練習","朗讀、辨識與句子比對","/speaking"],["03","AI 對話","選擇情境，練習回答","/conversation"],["04","學習紀錄","查看進度與練習歷程","/progress"]].map(([n,title,description,url])=><Link key={n} href={url}><span>{n}</span><h3>{title}</h3><p>{description}</p><b>開始 →</b></Link>)}</div>:<>
        <h2 className="zx-section-title">單元進度</h2><div className="zx-completions">{UNITS.map(u=><div key={u.id}><span className={summary?.completedIds.includes(u.id)?"done":""}>{summary?.completedIds.includes(u.id)?"✓":String(u.id).padStart(2,"0")}</span><p>{u.title}<small>{u.level} · {summary?.completedIds.includes(u.id)?"已完成":"尚未完成"}</small></p></div>)}</div>
        <h2 className="zx-section-title">練習歷程 / Lịch sử</h2>{!data?.records.length?<p className="zx-panel">這一頁還沒有紀錄。 / Trang này chưa có hoạt động.</p>:<div className="zx-panel zx-history">{data.records.map((r,i)=><div key={r.id ?? i}><strong>{getUnit(r.unitId)?.title}</strong><span>{names[r.kind]}{r.kind==="conversation"?"":r.kind==="lesson"?(r.score===100?" · 已完成":" · 請複習"):` · 文字相符度 ${r.score}%`}</span><time>{r.createdAt?new Date(r.createdAt).toLocaleString("zh-TW"):""}</time></div>)}</div>}
        <div className="zx-actions"><button className="zx-button secondary" disabled={page===0||isLoading} onClick={()=>setPage(n=>n-1)}>← 上一頁 / Trước</button><span>{page+1}</span><button className="zx-button secondary" disabled={!data?.hasMore||isLoading} onClick={()=>setPage(n=>n+1)}>下一頁 / Sau →</button></div>
      </>}
    </>}
    <p className="zx-footnote">紀錄從實際操作開始累積。單元完成與文字相符度是練習指標，不代表正式語言能力認證。</p>
  </>;
}
