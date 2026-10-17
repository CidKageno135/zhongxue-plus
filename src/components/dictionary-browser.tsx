"use client";
import {useEffect,useRef,useState} from "react";
import useSWR from "swr";
import Link from "next/link";
import {Search,Bookmark,History,BookOpen,ArrowRight} from "lucide-react";
import type {DictionaryResult,SearchMode,buildCourseNotes} from "@/lib/dictionary";
import {AudioButton,PageTitle,requestJson} from "./learning-common";
import {HanziStrokeWriter} from "./hanzi-stroke-writer";
import metadata from "../../data/dictionary/metadata.json";
interface SearchData {results:DictionaryResult[];total:number;count:number;offset:number}
interface Shelf {results:DictionaryResult[]}
interface Detail extends DictionaryResult {course:ReturnType<typeof buildCourseNotes>;related:DictionaryResult[];saved:boolean}
type Scope="results"|"saved"|"history";
const languages:[[SearchMode,string],[SearchMode,string],[SearchMode,string],[SearchMode,string]]=[["all","Tự động"],["hanzi","Chữ Hán"],["pinyin","Pinyin"],["vi","Tiếng Việt"]];
export function DictionaryBrowser({initialQuery=''}:{initialQuery?:string}) {
 const [query,setQuery]=useState(initialQuery),[mode,setMode]=useState<SearchMode>("all"),[scope,setScope]=useState<Scope>("results");
 const [results,setResults]=useState<SearchData|null>(null),[searched,setSearched]=useState(""),[searchMode,setSearchMode]=useState<SearchMode>("all");
 const [selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [traditional,setTraditional]=useState(true),[saving,setSaving]=useState(false),[showWriter,setShowWriter]=useState(false);
 const detailRef=useRef<HTMLElement|null>(null);
 const {data:saved,error:savedError,mutate:refreshSaved}=useSWR<Shelf>("/api/dictionary?shelf=saved",requestJson);
 const {data:history,error:historyError,mutate:refreshHistory}=useSWR<Shelf>("/api/dictionary?shelf=history",requestJson);
 const {data:detail,error:detailError,isLoading:detailLoading,mutate:refreshDetail}=useSWR<Detail>(selected?`/api/dictionary?id=${selected}`:null,requestJson);
 const entries=scope==="saved"?(saved?.results ?? []):scope==="history"?(history?.results ?? []):(results?.results ?? []);
 const isSaved=Boolean(detail?.saved || saved?.results.some(entry=>entry.id===selected));

 useEffect(() => {
  if (initialQuery.trim()) {
   setQuery(initialQuery.trim());
   void search(initialQuery.trim(), 0, "all");
  }
 }, [initialQuery]);
 async function choose(entry:DictionaryResult) {
  setSelected(entry.id);setNotice("");setShowWriter(false);
  if (window.innerWidth<800) detailRef.current?.scrollIntoView({behavior:"smooth",block:"start"});
  try {await requestJson("/api/dictionary",{action:"view",id:entry.id});await refreshHistory();}
  catch {setNotice("Đã mở từ; lịch sử chưa lưu được, hãy thử lại sau.");}
 }
 async function search(text=query,offset=0,chosenMode=mode) {
  if (!text.trim()) {setError("Nhập chữ Hán, pinyin hoặc nghĩa tiếng Việt để tra từ.");return;}
  setBusy(true);setError("");setNotice("");setScope("results");
  try {
   const data=await requestJson<SearchData>(`/api/dictionary?q=${encodeURIComponent(text.trim())}&mode=${chosenMode}&offset=${offset}`);
   setResults(data);setSearched(text.trim());setSearchMode(chosenMode);setQuery(text);
   if (!offset) {if (data.results[0]) void choose(data.results[0]);else setSelected(null);}
  } catch(e) {setError(e instanceof Error?e.message:"Không tra được từ, hãy thử lại.");}
  finally {setBusy(false);}
 }
 async function toggleSaved() {
  if (!selected) return;setSaving(true);setNotice("");
  try {await requestJson("/api/dictionary",{id:selected,action:isSaved?"unsave":"save"});await Promise.all([refreshSaved(),refreshDetail()]);setNotice(isSaved?"Đã bỏ lưu từ.":"Đã lưu từ vào tài khoản này.");}
  catch(e) {setNotice(e instanceof Error?e.message:"Không lưu được từ.");}
  finally {setSaving(false);}
 }
 const shelfFailed=scope==="saved"?savedError:scope==="history"?historyError:null;
 return <>
  <PageTitle eyebrow="詞典 · TỪ ĐIỂN" title="華越詞典" vi="Tra tiếng Trung, hiểu nghĩa tiếng Việt, rồi dùng trong bài học."/>
  <Link className="zx-word-lookup" href="/flashcards">Ôn từ đã lưu / 生詞複習 →</Link>
  <form className="zx-dict-search" onSubmit={e=>{e.preventDefault();void search();}}>
   <label className="zx-dict-input"><Search size={22}/><input aria-label="Tra từ / 查詞" maxLength={80} value={query} onChange={e=>setQuery(e.target.value)} placeholder="學生 · xuesheng · học sinh"/><button type="submit" className="zx-button" disabled={busy}>{busy?"Đang tra…":"Tra từ"}</button></label>
   <div className="zx-dict-toolbar"><label>Tra bằng<select aria-label="Cách tra từ" value={mode} onChange={e=>setMode(e.target.value as SearchMode)}>{languages.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Hiển thị<select aria-label="Kiểu chữ" value={traditional?"traditional":"simplified"} onChange={e=>setTraditional(e.target.value==="traditional")}><option value="traditional">Phồn thể</option><option value="simplified">Giản thể</option></select></label><small>{(results?.count ?? metadata.entries).toLocaleString("vi-VN")} mục từ · Trung–Việt</small></div>
  </form>
  <div className="zx-dict-tabs"><button disabled={busy} className={scope==="results"?"active":""} onClick={()=>setScope("results")}><Search size={16}/> Kết quả</button><button disabled={busy} className={scope==="saved"?"active":""} onClick={()=>setScope("saved")}><Bookmark size={16}/> Đã lưu ({saved?.results.length ?? 0})</button><button disabled={busy} className={scope==="history"?"active":""} onClick={()=>setScope("history")}><History size={16}/> Gần đây</button></div>
  {error && <p role="alert" className="zx-status">{error}</p>}
  {shelfFailed && <p role="alert">Không tải được danh sách. <button className="zx-link-button" onClick={()=>scope==="saved"?refreshSaved():refreshHistory()}>Thử lại</button></p>}
  <div className="zx-dict-layout">
   <section className="zx-dict-results" aria-label="Danh sách từ">
    <p className="zx-dict-count">{scope==="results"?(results?`${results.total.toLocaleString("vi-VN")} kết quả cho “${searched}”`:"Tra nhanh một từ"):scope==="saved"?"100 từ đã lưu gần nhất":"12 từ đã xem gần nhất"}</p>
    {!results && scope==="results" && <div className="zx-dict-suggestions"><p>Thử tra bằng:</p>{["學生","xuéshēng","học sinh","經濟","cà phê"].map(text=><button disabled={busy} key={text} onClick={()=>void search(text,0,"all")}>{text}<ArrowRight size={13}/></button>)}</div>}
    {entries.map(entry=><button className={`zx-dict-row ${selected===entry.id?"active":""}`} key={entry.id} onClick={()=>void choose(entry)}><strong>{traditional?entry.traditional:entry.simplified}</strong><span>{entry.pinyin}</span><p>{entry.definitions.slice(0,2).join("; ")}</p>{saved?.results.some(item=>item.id===entry.id) && <Bookmark size={13} aria-label="Đã lưu"/>}</button>)}
    {entries.length===0 && (results || scope!=="results") && <p className="zx-dict-empty">{scope==="results"?"Chưa tìm thấy từ. Thử bỏ dấu pinyin hoặc chọn cách tra cụ thể.":scope==="saved"?"Chọn một từ rồi nhấn Lưu từ để ôn lại.":"Chọn từ trong danh sách để lưu lịch sử tra."}</p>}
    {scope==="results" && results && results.total>20 && <div className="zx-dict-paging"><button disabled={busy || results.offset===0} onClick={()=>void search(searched,Math.max(0,results.offset-20),searchMode)}>← Trước</button><span>{Math.floor(results.offset/20)+1}</span><button disabled={busy || results.offset+20>=results.total || results.offset>=400} onClick={()=>void search(searched,results.offset+20,searchMode)}>Sau →</button></div>}
   </section>
   <section ref={detailRef} className="zx-panel zx-dict-detail" aria-label="Chi tiết từ">
    {!selected?<div className="zx-dict-welcome"><BookOpen size={42}/><h2>Một từ, nhiều cách học</h2><p>Tra cả giản thể và phồn thể. Pinyin chấp nhận dạng có dấu, không dấu hoặc số thanh điệu.</p><small>Ví dụ: xuéshēng, xuesheng, xue2 sheng1.</small><p>Nghe phát âm, xem nghĩa và lưu từ vào tài khoản.</p></div>:detailLoading?<p role="status">Đang mở từ…</p>:detailError?<p role="alert">Không tải được từ. <button className="zx-link-button" onClick={()=>refreshDetail()}>Thử lại</button></p>:detail && <>
     <div className="zx-dict-word"><div><h2>{traditional?detail.traditional:detail.simplified}</h2>{detail.traditional!==detail.simplified && <small>{traditional?"Giản thể":"Phồn thể"}: {traditional?detail.simplified:detail.traditional}</small>}<p>{detail.pinyin}</p></div><button className={`zx-button ${isSaved?"":"secondary"}`} disabled={saving || !saved} onClick={toggleSaved}><Bookmark size={17}/>{saving?"Đang lưu…":isSaved?"Đã lưu":"Lưu từ"}</button></div>
     <div style={{display:"flex",gap:"8px",alignItems:"center",margin:"12px 0",flexWrap:"wrap"}}>
      <AudioButton text={traditional?detail.traditional:detail.simplified}/>
      <button type="button" className={`zx-button ${showWriter?"":"secondary"}`} onClick={()=>setShowWriter(!showWriter)} style={{padding:"6px 14px",fontSize:"13px"}}>
        ✍️ {showWriter?"Đóng luyện viết":"Luyện viết chữ / 筆順"}
      </button>
     </div>
     {showWriter && <div style={{margin:"1rem 0"}}><HanziStrokeWriter text={traditional?detail.traditional:detail.simplified} onClose={()=>setShowWriter(false)}/></div>}
     {notice && <p role="status" className="zx-status">{notice}</p>}
     <h3>Nghĩa tiếng Việt</h3><ol className="zx-dict-meanings">{detail.definitions.map((meaning,i)=><li key={i}>{meaning}</li>)}</ol>
     {detail.course.meanings.length>0 && <div className="zx-dict-course"><strong>Nghĩa dùng trong bài học</strong><p>{detail.course.meanings.join("; ")}</p></div>}
     <h3>Ví dụ từ bài học</h3>{detail.course.examples.length?detail.course.examples.map(example=><div key={example.unitId} className="zx-dict-example"><strong>{example.chinese}</strong><p>{example.pinyin}</p><p>{example.vi}</p><AudioButton text={example.chinese}/></div>):<p className="zx-muted">Kho bài học hiện chưa có ví dụ cho từ này.</p>}
     {detail.course.units.length>0 && <div className="zx-dict-course-links">{detail.course.units.slice(0,5).map(unit=><Link key={unit.id} href={`/vocabulary?unit=${unit.id}`}>{unit.level} · {unit.title} →</Link>)}</div>}
     {detail.related.length>0 && <><h3>Từ liên quan</h3><div className="zx-dict-related">{detail.related.map(entry=><button key={entry.id} onClick={()=>void choose(entry)}>{traditional?entry.traditional:entry.simplified}<small>{entry.pinyin}</small></button>)}</div></>}
    </>}
   </section>
  </div>
  <p className="zx-footnote">Nguồn: <a href="https://github.com/ph0ngp/CVDICT" target="_blank" rel="noreferrer">CVDICT · Phong Phan</a>, dựa trên CC-CEDICT · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Nghĩa dịch có thể còn lỗi; nên đối chiếu ngữ cảnh. Ví dụ bài học do ZhongXue+ biên soạn.</p>
 </>;
}
