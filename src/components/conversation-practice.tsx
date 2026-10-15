"use client";
import {useEffect,useRef,useState} from "react";
import useSWR from "swr";
import {getUnit} from "@/lib/curriculum";
import type {Message} from "@/lib/conversation";
import {plainTutorText} from "@/lib/practice-feedback";
import {AudioButton,PageTitle,UnitSelect,requestJson} from "./learning-common";
interface Thread {id:number;messages:Message[]}
interface History {mode:"ai"|"guided";thread:Thread|null;threads:{id:number;updatedAt:string;preview:string}[]}
export function ConversationPractice({initialUnit=1}:{initialUnit?:number}){
 const [id,setId]=useState(initialUnit),[text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[guided,setGuided]=useState(false),[chosenThread,setChosenThread]=useState<number>();
 const chat=useRef<HTMLDivElement>(null),unit=getUnit(id)!;
 const key=`/api/conversation?unitId=${id}${guided?"&guided=1":""}${chosenThread?"&threadId="+chosenThread:""}`;
 const {data,error:historyError,isLoading,mutate}=useSWR<History>(key,requestJson,{revalidateOnFocus:false});
 const messages=data?.thread?.messages??[],mode=data?.mode;
 useEffect(()=>{if(chat.current)chat.current.scrollTop=chat.current.scrollHeight;},[data?.thread,busy]);
 async function send(e:React.FormEvent){
  e.preventDefault();if(!text.trim()||!data)return;setBusy(true);setError("");
  try{
   const result=await requestJson<{thread:Thread}>("/api/conversation"+(guided?"?guided=1":""),{unitId:id,threadId:data.thread?.id,messages:[{role:"user",content:text.trim()}]});
   await mutate({...data,thread:result.thread,threads:[{id:result.thread.id,updatedAt:new Date().toISOString(),preview:text.trim().slice(0,32)},...data.threads.filter(t=>t.id!==result.thread.id)].slice(0,10)},false);setText("");
  }catch(e){setError(e instanceof Error?e.message:"對話失敗，請重試。");}finally{setBusy(false);}
 }
 async function startNew(){
  setBusy(true);setError("");
  try{const result=await requestJson<{thread:Thread}>("/api/conversation"+(guided?"?guided=1":""),{action:"new",unitId:id});setChosenThread(result.thread.id);setText("");}
  catch(e){setError(e instanceof Error?e.message:"無法開始新對話。");}finally{setBusy(false);}
 }
 return <><PageTitle eyebrow="AI 對話 · Hội thoại" title="把中文用在生活裡" vi="Luyện theo chủ đề, xem pinyin và nghĩa tiếng Việt trong câu trả lời AI."/>
 <div className="zx-panel zx-practice"><UnitSelect value={id} disabled={busy} onChange={value=>{setId(value);setChosenThread(undefined);setText("");setError("");}}/>
  {historyError&&<p role="alert">對話載入失敗。 / Không tải được hội thoại. <button className="zx-link-button" onClick={()=>mutate()}>重試</button></p>}
  <div className="zx-mode">{mode==="ai"?"AI 模式 / Hội thoại AI":mode==="guided"?"情境示範 / Luyện theo mẫu":"正在載入…"}<p>{mode==="ai"?"AI 會回應並提供簡短訂正；內容仍可能有誤。":"使用固定句型提示，不會產生個別 AI 訂正。"}</p></div>
  <div className="zx-actions"><label className="zx-field">最近對話 / Hội thoại gần đây<select disabled={busy||isLoading||!data?.threads.length} value={data?.thread?.id??""} onChange={e=>{setChosenThread(Number(e.target.value));setError("");setText("");}}>{!data?.threads.length&&<option value="">尚無紀錄 / Chưa có</option>}{data?.threads.map(t=><option key={t.id} value={t.id}>{new Date(t.updatedAt).toLocaleDateString("zh-TW")} · {t.preview}</option>)}</select></label><button className="zx-button secondary" disabled={busy||isLoading} onClick={startNew}>新對話 / Hội thoại mới</button>{guided&&<button className="zx-link-button" disabled={busy} onClick={()=>{setGuided(false);setChosenThread(undefined);setError("");}}>回到 AI / Trở về AI</button>}</div>
  <details className="zx-hint"><summary>句型提示 / Gợi ý trả lời</summary><p>{unit.sentence}</p><p>{unit.pinyin}</p><p>{unit.sentenceVi}</p><button className="zx-link-button" disabled={busy} onClick={()=>setText(unit.sentence)}>使用這句 / Dùng câu này</button></details>
  {isLoading&&<p role="status">正在載入對話… / Đang tải hội thoại…</p>}
  <div ref={chat} className="zx-chat" aria-live="polite"><div className="zx-bubble assistant"><small>練習夥伴</small><p>{unit.opening}</p><AudioButton text={unit.opening}/></div>{messages.map((m,i)=><div key={i} className={`zx-bubble ${m.role}`}><small>{m.role==="user"?"你":mode==="ai"?"AI 練習夥伴":"情境提示"}</small><p>{plainTutorText(m.content)}</p>{m.role==="assistant"&&<AudioButton text={plainTutorText(m.content).split("\n").find(line=>line.startsWith("中文"))?.replace(/^中文[：:]\s*/,"")||plainTutorText(m.content).split("\n")[0]}/>}</div>)}{busy&&<div className="zx-bubble assistant" style={{opacity:0.85,fontStyle:"italic"}}><small>{mode==="ai"?"AI 練習夥伴":"情境提示"}</small><p style={{display:"flex",alignItems:"center",gap:"6px",margin:"6px 0 0"}}><span>Đang soạn câu trả lời… / 正在思考中</span><span>⏳</span></p></div>}</div>
  <form onSubmit={send}><label className="zx-field">你的回答 / Câu trả lời<textarea maxLength={600} value={text} disabled={busy||isLoading} onChange={e=>setText(e.target.value)} placeholder={unit.sentence}/></label><button className="zx-button" disabled={!text.trim()||busy||isLoading||!data}>{busy?"回應中…":"送出回答 / Gửi"}</button></form>
  {error&&<div role="alert" className="zx-status">{error}{mode==="ai"&&<button className="zx-link-button" onClick={()=>{setGuided(true);setChosenThread(undefined);setError("");}}>切換情境示範 / Chuyển sang mẫu</button>}</div>}
  <p className="zx-footnote">每段保留最近 8 輪；可查看最近 10 段對話。 / Mỗi hội thoại giữ 8 lượt gần nhất; xem được 10 hội thoại gần đây. AI 每分鐘最多 8 次，另有每日上限；文字會傳送至所設定的服務。請勿輸入私人資料。</p>
 </div></>;
}
