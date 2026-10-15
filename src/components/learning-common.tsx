"use client";
import { useState, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import { UNITS } from "@/lib/curriculum";
export async function requestJson<T>(url:string,body?:unknown):Promise<T> {
  const response=await fetch(url,body===undefined ? undefined:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const data=await response.json();
  if (!response.ok) throw new Error(data.error ?? "操作失敗，請重試。");
  return data;
}
export function PageTitle({eyebrow,title,vi,children}:{eyebrow:string;title:string;vi:string;children?:ReactNode}) {
  return <header className="zx-page-title"><p className="zx-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{vi}</p>{children}</header>;
}
export function UnitSelect({value,onChange,disabled=false}:{value:number;onChange:(id:number)=>void;disabled?:boolean}) {
  return <label className="zx-field">選擇情境 / Chọn chủ đề<select value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}>{UNITS.map(u=><option key={u.id} value={u.id}>{u.level} · {String(u.id).padStart(2,"0")} {u.title}</option>)}</select></label>;
}
export function AudioButton({text,rate=0.8,label='聽發音'}:{text:string;rate?:number;label?:string}) {
  const [error,setError]=useState("");
  function play() {
    setError("");
    if (!("speechSynthesis" in window)) {setError("此瀏覽器不支援朗讀。");return;}
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang="zh-TW";utterance.rate=rate;
    const voices=window.speechSynthesis.getVoices();
    const voice=voices.find(v=>v.lang.toLowerCase()==="zh-tw") ?? voices.find(v=>v.lang.startsWith("zh"));
    if (voice) utterance.voice=voice;
    utterance.onerror=()=>setError("無法播放語音，請檢查裝置的中文語音設定。");
    window.speechSynthesis.speak(utterance);
  }
  return <span><button className="zx-audio" onClick={play} aria-label={`${label}：${text}`}><Volume2 size={17}/> {label}</button>{error && <small role="alert">{error}</small>}</span>;
}
