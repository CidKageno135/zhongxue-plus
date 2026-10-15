import {createHash} from 'node:crypto';
export interface RequestPolicy {key:string;limit:number;windowMs:number}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function requestIdentity(req:Request,trustProxy=false){return hash(trustProxy?(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0,80)||'local'):'local');}
export function requestPolicies(kind:'ai'|'login'|'register',identity:string,userId?:number,isDemo=false,email='',globalLimit=50):RequestPolicy[]{
 if(kind==='register')return [{key:`register:${identity}`,limit:5,windowMs:3600000}];
 if(kind==='login')return [{key:`login:ip:${identity}`,limit:20,windowMs:600000},{key:`login:email:${hash(email)}`,limit:5,windowMs:600000}];
 return [{key:`ai:ip:${identity}`,limit:8,windowMs:60000},{key:`ai:user:${userId}`,limit:8,windowMs:60000},{key:`ai:user:${userId}:day`,limit:isDemo?20:100,windowMs:86400000},{key:'ai:global:day',limit:globalLimit,windowMs:86400000}];
}
export function parseCredentials(body:unknown,register=false):{ok:true;email:string;password:string;name:string}|{ok:false;error:string}{
 if(!body||typeof body!=='object')return {ok:false,error:'請提供帳號資料。'};
 const b=body as Record<string,unknown>,email=typeof b.email==='string'?b.email.trim().toLowerCase():'',password=typeof b.password==='string'?b.password:'',name=typeof b.name==='string'?b.name.trim():'';
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return {ok:false,error:'請輸入有效的電子郵件。'};
 if(!password||Buffer.byteLength(password,'utf8')>72||(register&&password.length<8))return {ok:false,error:'新密碼至少 8 字元，所有密碼最多 72 UTF-8 位元組。'};
 if(register&&(name.length<2||name.length>80))return {ok:false,error:'姓名需要 2–80 個字元。'};
 return {ok:true,email,password,name};
}
