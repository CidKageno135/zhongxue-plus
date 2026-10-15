"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from "react";
import {BookOpen,Mic,MessagesSquare,ChartNoAxesCombined,House,Menu,X,Search,RotateCcw,Sun,Moon} from "lucide-react";
import {requestJson} from "./learning-common";
const NAV=[{href:"/dashboard",label:"學習首頁",vi:"Trang chủ",icon:House},{href:"/vocabulary",label:"詞彙與語法",vi:"Từ vựng và ngữ pháp",icon:BookOpen},{href:"/dictionary",label:"詞典",vi:"Từ điển Trung–Việt",icon:Search},{href:"/flashcards",label:"生詞複習",vi:"Ôn từ đã lưu",icon:RotateCcw},{href:"/speaking",label:"口說練習",vi:"Luyện nói",icon:Mic},{href:"/conversation",label:"AI 對話",vi:"Hội thoại",icon:MessagesSquare},{href:"/progress",label:"學習紀錄",vi:"Tiến độ",icon:ChartNoAxesCombined}];
const subscribeMobile=(callback:()=>void)=>{const q=window.matchMedia("(max-width:800px)");q.addEventListener("change",callback);return()=>q.removeEventListener("change",callback);};
export function Logo({light=false}:{light?:boolean}){
 return <div className={`zx-logo ${light?"light":""}`}><span>中</span><div><strong>ZhongXue<span>+</span></strong><small>智慧華語學習 · A1–A2</small></div></div>;
}
function useMenuFocus(open:boolean,sidebar:React.RefObject<HTMLElement|null>,button:React.RefObject<HTMLButtonElement|null>){
 useEffect(()=>{
  if(!open)return;const panel=sidebar.current,trigger=button.current;if(!panel)return;
  const elements=()=>Array.from(panel.querySelectorAll<HTMLElement>("a[href],button:not(:disabled),select")).filter(el=>el.offsetParent!==null);
  elements()[0]?.focus();
  const handle=(e:KeyboardEvent)=>{
   if(e.key==="Tab"){const items=elements(),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  };
  panel.addEventListener("keydown",handle);return()=>{panel.removeEventListener("keydown",handle);trigger?.focus();};
 },[open,sidebar,button]);
}
export function Shell({user,children}:{user:{id:number;name:string;email:string};children:ReactNode}){
 const pathname=usePathname(),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [theme,setTheme]=useState<"light"|"dark">("light");
 const sidebar=useRef<HTMLElement>(null),menuButton=useRef<HTMLButtonElement>(null);
 const mobile=useSyncExternalStore(subscribeMobile,()=>window.matchMedia("(max-width:800px)").matches,()=>false),isDemo=user.email==="demo@hanzi.app";
 useMenuFocus(open&&mobile,sidebar,menuButton);
 useEffect(()=>{
  const currentAttr = typeof document !== "undefined" ? (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null) : null;
  if (currentAttr === "dark" || currentAttr === "light") {
   setTheme(currentAttr);
  } else {
   const saved=typeof window!=="undefined"?(localStorage.getItem("zx_theme") as "light"|"dark"|null):null;
   const preferred=saved||(typeof window!=="undefined"&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
   setTheme(preferred);
   document.documentElement.setAttribute("data-theme",preferred);
  }
 },[]);
 function toggleTheme(){
  const currentAttr = (typeof document !== "undefined" && (document.documentElement.getAttribute("data-theme") as "light" | "dark")) || theme;
  const next = currentAttr === "dark" ? "light" : "dark";
  setTheme(next);
  try { localStorage.setItem("zx_theme",next); } catch {}
  document.documentElement.setAttribute("data-theme",next);
 }
 async function logout(){setBusy(true);setError("");try{await requestJson("/api/auth/logout",{});window.location.assign("/dashboard");}catch(e){setError(e instanceof Error?e.message:"無法登出。");setBusy(false);}}
 return <div className="zx-app"><a href="#zx-main" className="zx-skip-link">Chuyển đến nội dung chính / 跳至主要內容</a><header className="zx-mobile-header"><Logo/><div style={{display:"flex",gap:"8px",alignItems:"center"}}><button type="button" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối" style={{background:"none",border:"1px solid var(--zx-line)",color:"var(--zx-ink)",padding:"6px 10px",borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center"}}>{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button><button ref={menuButton} onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="zx-sidebar" aria-label={open?"關閉選單":"開啟選單"}>{open?<X/>:<Menu/>}</button></div></header>
 {open&&mobile&&<button className="zx-overlay" aria-label="關閉背景選單" onClick={()=>setOpen(false)}/>}
 <aside id="zx-sidebar" ref={sidebar} inert={mobile&&!open} onKeyDown={e=>{if(e.key==="Escape")setOpen(false);}} className={`zx-sidebar ${open?"open":""}`}><Link href="/dashboard" onClick={()=>setOpen(false)}><Logo light/></Link><p className="zx-sidebar-caption">把中文用在生活裡</p><button type="button" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối" style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",padding:"7px 12px",borderRadius:"10px",cursor:"pointer",display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",marginBottom:"20px"}}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>}<span>{theme==="dark"?"Giao diện sáng":"Giao diện tối"}</span></button><nav>{NAV.map(item=><Link key={item.href} href={item.href} className={pathname===item.href?"active":""} aria-current={pathname===item.href?"page":undefined} onClick={()=>setOpen(false)}><item.icon size={20}/><div><strong>{item.label}</strong><small>{item.vi}</small></div></Link>)}</nav><div className="zx-user"><span>{user.name.slice(0,1)}</span><div><strong>{user.name}</strong><small>{isDemo?"示範帳號 · Tài khoản mẫu":"個人帳號"}</small><Link href="/login" onClick={()=>setOpen(false)}>登入／切換帳號</Link>{!isDemo&&<button className="zx-logout" disabled={busy} onClick={logout}>{busy?"處理中…":"登出 / Đăng xuất"}</button>}{error&&<p role="alert">{error}</p>}</div></div></aside>
 <main id="zx-main" className="zx-main" inert={mobile&&open}>{isDemo&&<div className="zx-demo-notice"><strong>示範帳號 / Tài khoản mẫu</strong><p>進度、儲存的詞與對話由訪客共用。 / Dữ liệu của tài khoản mẫu dùng chung.</p><Link href="/register">建立個人帳號 / Tạo tài khoản riêng →</Link></div>}{children}<footer className="zx-footer">ZhongXue+ · 初階華語練習</footer></main></div>;
}
