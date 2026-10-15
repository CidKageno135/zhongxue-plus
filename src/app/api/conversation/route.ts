import {NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth';
import {getUnit} from '@/lib/curriculum';
import {replyToConversation,validateConversation} from '@/lib/conversation';
import {ApiError,apiFailure,assertSameOrigin,enforceRequests} from '@/lib/api-security';
import {findDialogue,loadDialogue,newDialogue,storeReply,type DialogueMode} from '@/lib/conversation-store';
export const dynamic='force-dynamic';
const configuredMode=():DialogueMode=>process.env.AI_API_KEY&&process.env.AI_MODEL?'ai':'guided';
function threadNumber(value:unknown){if(value===undefined||value===null||value==='')return undefined;const n=Number(value);if(!Number.isSafeInteger(n)||n<1)throw new ApiError('無效的對話編號。');return n;}
export async function GET(req:Request){
 try{
  const params=new URL(req.url).searchParams,mode=params.get('guided')==='1'?'guided':configuredMode();
  if(!params.has('unitId'))return NextResponse.json({mode});
  const unitId=Number(params.get('unitId'));if(!getUnit(unitId))throw new ApiError('請選擇有效課程。');
  const user=await getSessionUser();if(!user)throw new ApiError('請先登入。',401);
  return NextResponse.json({mode,...await loadDialogue(user.id,unitId,mode,threadNumber(params.get('threadId')))});
 }catch(e){return apiFailure(e,'conversation history');}
}
export async function POST(req:Request){
 try{
  assertSameOrigin(req);const body=await req.json(),mode=new URL(req.url).searchParams.get('guided')==='1'?'guided':configuredMode();
  if(body?.action==='new'){
   if(typeof body.unitId!=='number'||!getUnit(body.unitId))throw new ApiError('請選擇有效課程。');
   const user=await getSessionUser();if(!user)throw new ApiError('請先登入。',401);
   await enforceRequests(req,'practice',user);return NextResponse.json({thread:await newDialogue(user.id,body.unitId,mode),mode});
  }
  const input=validateConversation(body);if(!input.ok)throw new ApiError(input.error);
  const user=await getSessionUser();if(!user)throw new ApiError('請先登入。',401);
  const id=threadNumber(body.threadId),thread=id?await findDialogue(user.id,input.value.unitId,mode,id):null;
  await enforceRequests(req,mode==='ai'?'ai':'practice',user);
  const text=input.value.messages.at(-1)!.content;
  const result=await replyToConversation({unitId:input.value.unitId,messages:[...(thread?.messages.slice(-14)??[]),{role:'user',content:text}]},mode==='guided'?{}:{key:process.env.AI_API_KEY,model:process.env.AI_MODEL,baseUrl:process.env.AI_BASE_URL,timeoutMs:process.env.AI_TIMEOUT_MS?Number(process.env.AI_TIMEOUT_MS):undefined});
  const saved=await storeReply(user.id,input.value.unitId,mode,thread,text,result.content);
  return NextResponse.json({...result,thread:saved});
 }catch(e){return apiFailure(e,'conversation reply');}
}
