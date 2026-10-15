'use client';
import {useState} from 'react';
import {buildLessonQuestions,type LessonQuestion} from '@/lib/practice';
import {requestJson} from './learning-common';
function OrderAnswer({question,onChange,disabled}:{question:LessonQuestion;onChange:(answer:string)=>void;disabled:boolean}){
 const [order,setOrder]=useState<number[]>([]);
 const choices=question.options.map((text,id)=>({text,id})).toReversed();
 function select(id:number){const next=[...order,id];setOrder(next);onChange(next.map(i=>question.options[i]).join(''));}
 return <div className="zx-order"><p aria-live="polite">{order.length?order.map(i=>question.options[i]).join(''):'點選詞組組成句子 / Nhấn các phần để ghép câu'}</p><div>{choices.map(({text,id})=><button type="button" disabled={disabled||order.includes(id)} key={id} onClick={()=>select(id)}>{text}</button>)}</div><button className="zx-link-button" type="button" disabled={disabled} onClick={()=>{setOrder([]);onChange('');}}>重排 / Xếp lại</button></div>;
}
export function LessonQuiz({unitId}:{unitId:number}){
 const questions=buildLessonQuestions(unitId);
 const [answers,setAnswers]=useState<string[]>(['','','']),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [result,setResult]=useState<{record:{score:number};feedback:{correct:boolean;explanation:string}[]}|null>(null);
 function answer(index:number,value:string){setAnswers(answers.map((a,i)=>i===index?value:a));setResult(null);}
 async function submit(){
  setBusy(true);setError('');
  try{setResult(await requestJson('/api/learning',{unitId,kind:'lesson',answers}));}
  catch(e){setError(e instanceof Error?e.message:'儲存失敗，請重試。');}finally{setBusy(false);}
 }
 return <section><h3>小練習 / Luyện tập</h3><p className="zx-muted">完成三題，全部答對即可完成本課。 / Đúng cả 3 câu để hoàn thành bài.</p>
  {questions.map((question,i)=><fieldset className="zx-question" key={i} disabled={busy}><legend>{i+1}. {question.prompt}</legend>{question.kind==='order'?<OrderAnswer question={question} onChange={value=>answer(i,value)} disabled={busy}/>:<div className="zx-answers">{question.options.map(choice=><label key={choice}><input type="radio" name={`answer-${unitId}-${i}`} checked={answers[i]===choice} onChange={()=>answer(i,choice)}/>{choice}</label>)}</div>}
   {result&&<p className={result.feedback[i].correct?'zx-correct':'zx-incorrect'}>{result.feedback[i].correct?'✓ 正確 / Đúng':'↻ 再想想 / Xem lại'}<span>{result.feedback[i].explanation}</span></p>}
  </fieldset>)}
  <button className="zx-button" disabled={busy||answers.some(a=>!a)} onClick={submit}>{busy?'儲存中…':'確認答案並記錄 / Kiểm tra'}</button>
  <p role="status" className="zx-status">{error|| (result?`${result.record.score}% · ${result.record.score===100?'本課已完成 / Đã hoàn thành bài':'請看解釋再試一次 / Xem giải thích rồi thử lại'}`:'')}</p>
 </section>;
}
