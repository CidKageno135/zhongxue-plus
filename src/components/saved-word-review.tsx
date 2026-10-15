'use client';
import {useState} from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import type {DictionaryResult} from '@/lib/dictionary';
import {reviewChoices} from '@/lib/practice';
import {AudioButton,PageTitle,requestJson} from './learning-common';
function ReviewCard({word,entries,quiz,onNext}:{word:DictionaryResult;entries:DictionaryResult[];quiz:boolean;onNext:(correct:boolean)=>void}){
 const [flipped,setFlipped]=useState(false),[answer,setAnswer]=useState<string>();
 const correct=word.definitions[0],choices=reviewChoices(correct,entries.map(w=>w.definitions[0]));
 const offset=entries.findIndex(w=>w.id===word.id)%Math.max(1,choices.length),options=[...choices.slice(offset),...choices.slice(0,offset)];
 return <div className="zx-panel zx-review-card"><h2>{word.traditional}</h2><p>{word.pinyin}</p><AudioButton text={word.traditional}/>
  {quiz?<><h3>Chọn nghĩa đúng / 選擇正確意思</h3><div className="zx-answers">{options.map(option=><button className={answer===option?(answer===correct?'zx-correct':'zx-incorrect'):''} disabled={answer!==undefined} key={option} onClick={()=>setAnswer(option)}>{option}</button>)}</div>{answer!==undefined&&<><p role="status">{answer===correct?'✓ Đúng / 正確':`↻ Đáp án / 答案：${correct}`}</p><button className="zx-button" onClick={()=>onNext(answer===correct)}>Từ tiếp theo / 下一個 →</button></>}</>:<><button className="zx-button secondary" onClick={()=>setFlipped(!flipped)}>{flipped?'Ẩn nghĩa / 隱藏':'Xem nghĩa / 翻面'}</button>{flipped&&<><ul>{word.definitions.map((meaning,i)=><li key={i}>{meaning}</li>)}</ul><div className="zx-actions"><button className="zx-button secondary" onClick={()=>onNext(false)}>Chưa nhớ / 再複習</button><button className="zx-button" onClick={()=>onNext(true)}>Đã nhớ / 記得</button></div></>}</>}
  <Link className="zx-word-lookup" href={`/dictionary?q=${encodeURIComponent(word.traditional)}`}>Tra chi tiết / 查詞 →</Link>
 </div>;
}
function ReviewSession({entries}:{entries:DictionaryResult[]}){
 const [index,setIndex]=useState(0),[quiz,setQuiz]=useState(false),[remembered,setRemembered]=useState(0);
 const canQuiz=new Set(entries.map(e=>e.definitions[0])).size>=2;
 function reset(isQuiz=quiz){setQuiz(isQuiz);setIndex(0);setRemembered(0);}
 return <><div className="zx-tabs"><button className={!quiz?'active':''} onClick={()=>reset(false)}>Thẻ từ / 字卡</button><button className={quiz?'active':''} disabled={!canQuiz} onClick={()=>reset(true)}>Kiểm tra nhanh / 小測驗</button></div>{!canQuiz&&<p className="zx-muted">Lưu thêm từ có nghĩa khác để mở bài kiểm tra nhanh.</p>}
  {index<entries.length?<><p className="zx-status">{index+1} / {entries.length} · Bộ ôn hiện tại / 本次複習</p><ReviewCard key={`${index}-${quiz}`} word={entries[index]} entries={entries} quiz={quiz} onNext={correct=>{setRemembered(n=>n+(correct?1:0));setIndex(n=>n+1);}}/></>:<div className="zx-panel"><h2>Hoàn thành lượt ôn / 複習完成</h2><p>{remembered} / {entries.length} · {quiz?'câu trả lời đúng / 答對':'từ tự đánh giá đã nhớ / 自評記得'}</p><button className="zx-button" onClick={()=>reset()}>Ôn lại / 再練一次</button></div>}
 </>;
}
export function SavedWordReview(){
 const {data,error,isLoading,mutate}=useSWR<{results:DictionaryResult[]}>('/api/dictionary?shelf=saved',requestJson);
 return <><PageTitle eyebrow="生詞複習 · Ôn từ đã lưu" title="把查過的詞，變成會用的詞" vi="Ôn bằng thẻ từ và kiểm tra nhanh từ danh sách đã lưu."/>
 {error?<p role="alert">Không tải được từ. <button className="zx-link-button" onClick={()=>mutate()}>Thử lại</button></p>:isLoading?<p role="status">Đang tải…</p>:!data?.results.length?<div className="zx-panel"><h2>Chưa có từ để ôn / 尚未儲存生詞</h2><p>Tra một từ trong từ điển rồi nhấn Lưu từ.</p><Link className="zx-button" href="/dictionary">Mở từ điển / 開啟詞典 →</Link></div>:<ReviewSession key={data.results.map(w=>w.id).join('-')} entries={data.results}/>}
 <p className="zx-footnote">Bộ ôn dùng tối đa 100 từ lưu gần nhất. Kết quả ở đây thuộc lượt ôn hiện tại; không phải bài thi hay chứng nhận. / 使用最近 100 個生詞；本次結果不代表正式能力認證。</p>
 </>;
}
