import {NextResponse} from 'next/server';
import {sql} from 'drizzle-orm';
import {db,ensureDbReady} from '@/db';
import {requestIdentity,requestPolicies,type RequestPolicy} from './request-policy';
export class ApiError extends Error {constructor(message:string,public status=400,public retryAfter?:number){super(message);}}
export function assertSameOrigin(req:Request){
 const origin=req.headers.get('origin');if(!origin)return;
 if(origin!==(process.env.APP_ORIGIN||new URL(req.url).origin))throw new ApiError('來源不符，請重新開啟本站。 / Hãy mở lại trang web.',403);
}
export async function enforcePolicies(policies:RequestPolicy[],now=Date.now()){
 await ensureDbReady();
 await db.transaction(async tx=>{
  for(const policy of policies){
   const reset=new Date((Math.floor(now/policy.windowMs)+1)*policy.windowMs),at=new Date(now);
   const result=await tx.execute(sql`INSERT INTO request_counters (key,count,expires_at) VALUES (${policy.key},1,${reset.toISOString()})
    ON CONFLICT (key) DO UPDATE SET count=CASE WHEN request_counters.expires_at<=${at.toISOString()}::timestamptz THEN 1 ELSE request_counters.count+1 END,
    expires_at=CASE WHEN request_counters.expires_at<=${at.toISOString()}::timestamptz THEN ${reset.toISOString()}::timestamptz ELSE request_counters.expires_at END
    WHERE request_counters.expires_at<=${at.toISOString()}::timestamptz OR request_counters.count<${policy.limit} RETURNING count`);
   if(!result.rows.length)throw new ApiError('已達使用上限，請稍後再試。 / Đã đạt giới hạn sử dụng, hãy thử lại sau.',429,Math.max(1,Math.ceil((reset.getTime()-now)/1000)));
  }
 });
}
export async function enforceRequests(req:Request,kind:'ai'|'login'|'register'|'practice',user?:{id:number;email:string},email=''){
 const identity=requestIdentity(req,process.env.TRUST_PROXY==='true');
 if(kind==='practice')return enforcePolicies([{key:`practice:${identity}:${user?.id}`,limit:60,windowMs:60000}]);
 const configured=Number(process.env.AI_DAILY_LIMIT),limit=Number.isInteger(configured)&&configured>0&&configured<=10000?configured:50;
 return enforcePolicies(requestPolicies(kind,identity,user?.id,user?.email==='demo@hanzi.app',email,limit));
}
export function apiFailure(error:unknown,label:string){
 if(error instanceof ApiError)return NextResponse.json({error:error.message},{status:error.status,headers:error.retryAfter?{'Retry-After':String(error.retryAfter)}:undefined});
 if(error instanceof Error&&error.message.startsWith('AI'))return NextResponse.json({error:error.message},{status:502});
 console.error(label,{name:error instanceof Error?error.name:'UnknownError'});
 return NextResponse.json({error:'操作暫時無法完成，請重試。 / Chưa thực hiện được, hãy thử lại.'},{status:500});
}
