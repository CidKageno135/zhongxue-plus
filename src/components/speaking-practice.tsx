"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { getUnit } from "@/lib/curriculum";
import { compareSpeech } from "@/lib/learning";
import {alignSpeech} from '@/lib/practice-feedback';
import { AudioButton, PageTitle, UnitSelect, requestJson } from "./learning-common";
interface Recognition {
  lang:string;interimResults:boolean;continuous:boolean;
  onresult:((event:{results:{[n:number]:{[n:number]:{transcript:string}}}})=>void) | null;
  onerror:((event:{error:string})=>void) | null;onend:(()=>void) | null;
  start:()=>void;stop:()=>void;abort:()=>void;
}
type VoiceWindow=Window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function SpeakingPractice({initialUnit=1}:{initialUnit?:number}) {
  const [id,setId]=useState(initialUnit),[text,setText]=useState(""),[source,setSource]=useState<"voice"|"text">("text");
  const [listening,setListening]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[match,setMatch]=useState<number|null>(null);
  const [audioUrl,setAudioUrl]=useState<string|null>(null);
  const recognition=useRef<Recognition|null>(null),unit=getUnit(id)!;
  const mediaRecorder=useRef<MediaRecorder|null>(null),audioChunks=useRef<Blob[]>([]);

  useEffect(()=>()=>{
    if (recognition.current) {recognition.current.onresult=null;recognition.current.onerror=null;recognition.current.onend=null;recognition.current.abort();}
    if (mediaRecorder.current && mediaRecorder.current.state!=="inactive") {mediaRecorder.current.stop();}
  },[]);

  function stop() {
    recognition.current?.stop();
    if (mediaRecorder.current && mediaRecorder.current.state!=="inactive") {
      try { mediaRecorder.current.stop(); } catch {}
    }
  }

  function start() {
    setMessage("");setMatch(null);setAudioUrl(null);
    const ctor=(window as VoiceWindow).SpeechRecognition ?? (window as VoiceWindow).webkitSpeechRecognition;
    if (!ctor) {setMessage("此瀏覽器不支援語音辨識。請使用支援的瀏覽器，或輸入文字練習。");return;}

    // Try starting local audio recorder for self-listening
    if (typeof navigator!=="undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
        try {
          const mr=new MediaRecorder(stream);
          audioChunks.current=[];
          mr.ondataavailable=e=>{if(e.data.size>0) audioChunks.current.push(e.data);};
          mr.onstop=()=>{
            stream.getTracks().forEach(t=>t.stop());
            if(audioChunks.current.length>0){
              const blob=new Blob(audioChunks.current,{type:"audio/webm"});
              setAudioUrl(URL.createObjectURL(blob));
            }
          };
          mr.start();
          mediaRecorder.current=mr;
        } catch {}
      }).catch(()=>{});
    }

    const r=new ctor();r.lang="zh-TW";r.interimResults=false;r.continuous=false;
    r.onresult=event=>{setText(event.results[0][0].transcript);setSource("voice");setMessage("辨識完成。請確認文字，再進行比對。");};
    r.onerror=event=>{setListening(false);setMessage(event.error==="not-allowed"?"麥克風權限未開啟，請允許後重試。":"未能辨識語音，請檢查網路或改用文字練習。");};
    r.onend=()=>{
      setListening(false);
      if (mediaRecorder.current && mediaRecorder.current.state!=="inactive") {
        try { mediaRecorder.current.stop(); } catch {}
      }
    };
    recognition.current=r;
    try {r.start();setListening(true);} catch {setMessage("無法啟動麥克風，請重試。");}
  }

  async function compare() {
    const value=compareSpeech(unit.sentence,text).match;setBusy(true);setMatch(value);setMessage("");
    try {
      const result=await requestJson<{record:{score:number}}>("/api/learning",{unitId:id,kind:source==="voice"?"speech":"text",text});setMatch(result.record.score);
      setMessage(`${source==="voice"?"口說辨識":"文字練習"}已記錄。${value>=80?"內容接近例句！":"請聽例句，注意漏字或不同的詞。"}`);
    } catch(e) {setMessage(e instanceof Error?e.message:"儲存失敗。");}
    finally {setBusy(false);}
  }

  return <><PageTitle eyebrow="口說練習 · Luyện nói" title="聽一句，說一句" vi="Nghe câu mẫu, nói lại và xem nội dung được nhận diện."/>
    <div className="zx-panel zx-practice"><UnitSelect value={id} disabled={listening || busy} onChange={value=>{setId(value);setText("");setMatch(null);setMessage("");setAudioUrl(null);}}/>
      <div className="zx-example"><span className="zx-tag">{unit.level} · {unit.title}</span><h2>{unit.sentence}</h2><p>{unit.pinyin}</p><p className="zx-muted">{unit.sentenceVi}</p><AudioButton text={unit.sentence}/> <AudioButton text={unit.sentence} rate={0.6} label="慢速朗讀"/></div>
      <p className="zx-muted">Nhấn Bắt đầu nói và phát âm theo câu mẫu. Sau khi hoàn thành, bạn có thể nghe lại chính giọng của mình bên dưới.</p>
      <button className="zx-button" disabled={busy} onClick={listening?stop:start}>{listening?<Square size={18}/>:<Mic size={18}/>} {listening?"停止辨識 / Dừng nói":"開始口說 / Bắt đầu nói"}</button>
      {audioUrl && <div style={{marginTop:"14px",padding:"10px 14px",background:"var(--zx-subtle)",borderRadius:"10px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}><strong>🎙️ Giọng bạn vừa đọc / 您的錄音：</strong><audio src={audioUrl} controls style={{height:"36px"}}/></div>}
      <label className="zx-field">辨識文字 / Nội dung nhận diện<textarea maxLength={600} value={text} disabled={listening || busy} onChange={e=>{setText(e.target.value);setSource("text");setMatch(null);}} placeholder="也可以輸入文字練習；會分開記錄。"/></label>
      <button className="zx-button secondary" disabled={!text.trim() || listening || busy} onClick={compare}>{busy?"儲存中…":"比對句子並記錄 / Đối chiếu câu"}</button>
      {match!==null && <div className="zx-feedback"><strong>文字相符度 {match}%</strong><p>這是辨識內容與例句的相似程度，不是聲調、音準或正式口說評分。</p><p className="zx-speech-diff" aria-label="字詞比對">{alignSpeech(unit.sentence,text).map((part,i)=><span key={i} className={`zx-diff-${part.kind}`} title={part.kind==='missing'?`少了 / Thiếu：${part.expected}`:part.kind==='extra'?`多了 / Thừa：${part.received}`:part.kind==='different'?`${part.received} → ${part.expected}`:'相符 / Khớp'}>{part.kind==='different'?`${part.received}→${part.expected}`:part.expected||part.received}</span>)}</p><p>底線：缺字；刪除線：多字；箭頭：不同字。 / Gạch dưới: thiếu; gạch ngang: thừa; mũi tên: thay chữ.</p></div>}
      <p role="status" className="zx-status">{message}</p>
    </div></>;
}
