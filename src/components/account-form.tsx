"use client";
import {useState} from "react";
import Link from "next/link";
import {Logo} from "./shell";
import {requestJson} from "./learning-common";
export function AccountForm({register=false}:{register?:boolean}) {
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent) {
  e.preventDefault();setBusy(true);setError("");
  try {await requestJson(`/api/auth/${register?"register":"login"}`,{email,password,name});window.location.href="/dashboard";}
  catch(e) {setError(e instanceof Error?e.message:"無法登入。");setBusy(false);}
 }
 return <main className="zx-account"><Logo/><h1>{register?"建立學習帳號":"歡迎回來"}</h1><p className="zx-muted">{register?"Tạo tài khoản để lưu tiến độ riêng.":"Đăng nhập để tiếp tục học."}</p><form onSubmit={submit}>{register && <label className="zx-field">姓名 / Tên<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}<label className="zx-field">電子郵件 / Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label className="zx-field">密碼 / Mật khẩu<input required type="password" minLength={register?8:1} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?"new-password":"current-password"}/>{register&&<small>Ít nhất 8 ký tự; tối đa 72 byte UTF-8.</small>}</label><button className="zx-button" disabled={busy}>{busy?"處理中…":register?"註冊":"登入"}</button><p role="alert" className="zx-status">{error}</p></form><p><Link href={register?"/login":"/register"}>{register?"已有帳號？登入":"還沒有帳號？註冊"}</Link></p><Link href="/dashboard">回到學習首頁 →</Link></main>;
}
