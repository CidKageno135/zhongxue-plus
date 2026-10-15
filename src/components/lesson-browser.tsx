"use client";
import { useState } from "react";
import Link from "next/link";
import { UNITS, getUnit } from "@/lib/curriculum";
import { AudioButton, PageTitle } from "./learning-common";
import {LessonQuiz} from './lesson-quiz';
import {HanziStrokeWriter} from './hanzi-stroke-writer';
export function LessonBrowser({initialUnit=1}:{initialUnit?:number}) {
  const [level,setLevel]=useState("all"),[selected,setSelected]=useState(initialUnit);
  const [writingWord,setWritingWord]=useState<string|null>(null);
  const unit=getUnit(selected)!;
  function select(id:number) {setSelected(id);setWritingWord(null);}
  return <>
    <PageTitle eyebrow="詞彙與語法 · Từ vựng và ngữ pháp" title="從生活情境開始" vi="20 bài mẫu A1–A2, học từ mới và mẫu câu theo tình huống."/>
    <div className="zx-tabs" role="group" aria-label="課程等級">{[["all","全部"],["A1","A1 入門"],["A2","A2 基礎"]].map(([value,label])=><button key={value} className={level===value?"active":""} onClick={()=>{setLevel(value);if (value!=="all" && unit.level!==value) select(value==="A1"?1:11);}}>{label}</button>)}</div>
    <div className="zx-lessons">
      <aside className="zx-unit-list">{UNITS.filter(u=>level==="all" || u.level===level).map(u=><button key={u.id} onClick={()=>select(u.id)} className={selected===u.id?"active":""}><span>{String(u.id).padStart(2,"0")}</span><div><strong>{u.title}</strong><small>{u.vi}</small></div><em>{u.level}</em></button>)}</aside>
      <article className="zx-panel zx-lesson-detail"><span className="zx-tag">{unit.level} · 第 {unit.id} 課</span><h2>{unit.title}</h2><p className="zx-muted">{unit.vi}</p>
        <h3>本課生詞 / Từ mới</h3>
        {writingWord && <div style={{margin:"1rem 0"}}><HanziStrokeWriter text={writingWord} onClose={()=>setWritingWord(null)}/></div>}
        <div className="zx-word-list">{unit.words.map(w=><div key={w.hanzi}><strong>{w.hanzi}<button type="button" className="zx-link-button" onClick={()=>setWritingWord(writingWord===w.hanzi?null:w.hanzi)} style={{fontSize:"11px",marginLeft:"8px"}}>✍️ Luyện viết / 筆順</button><Link className="zx-word-lookup" href={`/dictionary?q=${encodeURIComponent(w.hanzi)}`}>查詞 / Tra từ →</Link></strong><span>{w.pinyin}</span><small>{w.vi}</small><AudioButton text={w.hanzi}/></div>)}</div>
        <h3>句型 / Mẫu câu</h3><p className="zx-grammar">{unit.grammar}</p><p className="zx-muted">{unit.grammarVi}</p>
        <div className="zx-example"><p>{unit.sentence}</p><small>{unit.pinyin}</small><p className="zx-muted">{unit.sentenceVi}</p><AudioButton text={unit.sentence}/></div>
        <LessonQuiz key={unit.id} unitId={unit.id}/>
        <div className="zx-next"><Link href={`/speaking?unit=${unit.id}`}>用這句練口說 →</Link><Link href={`/conversation?unit=${unit.id}`}>練習本課對話 →</Link></div>
      </article>
    </div><p className="zx-footnote">A1–A2 為本課程的提案分級；示範教材尚待華語教師審核，不代表官方 TOCFL 認證。</p>
  </>;
}
