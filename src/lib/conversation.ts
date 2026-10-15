import { getUnit } from "./curriculum";
export interface Message { role:"user" | "assistant"; content:string }
export interface ConversationInput {unitId:number; messages:Message[]}
export interface ProviderConfig {key?:string; model?:string; baseUrl?:string; timeoutMs?:number}
export function validateConversation(body:unknown): {ok:true;value:ConversationInput} | {ok:false;error:string} {
  if (!body || typeof body!=="object") return {ok:false,error:"請提供對話內容。"};
  const b=body as Record<string,unknown>;
  if (typeof b.unitId!=="number" || !getUnit(b.unitId) || !Array.isArray(b.messages) || !b.messages.length || b.messages.length>16) return {ok:false,error:"請選擇有效課程；每次最多保留 16 則訊息。"};
  const valid=b.messages.every((m:unknown)=> {
    if (!m || typeof m!=="object") return false;
    const x=m as Record<string,unknown>;
    return ["user","assistant"].includes(String(x.role)) && typeof x.content==="string" && x.content.trim().length>0 && x.content.length<=600;
  });
  if (!valid || b.messages[b.messages.length-1].role!=="user") return {ok:false,error:"請輸入 1–600 字的訊息。"};
  return {ok:true,value:{unitId:b.unitId,messages:b.messages.map((m:Message)=>({role:m.role,content:m.content.trim()}))}};
}
function providerError(status:number) {
  if (status===401 || status===403) return "AI API 金鑰無效或權限不足，請更新設定。";
  if (status===402) return "AI 帳戶額度不足，請檢查服務帳戶。";
  if (status===404) return "AI 模型目前無法使用，請檢查模型設定。";
  if (status===429) return "AI 模型達到使用上限，請稍後再試。";
  return "AI 服務暫時無法使用，請稍後重試或切換情境示範。";
}
export async function replyToConversation(input:ConversationInput, config:ProviderConfig, fetcher:typeof fetch=fetch) {
  const unit=getUnit(input.unitId)!;
  if (!config.key || !config.model) {
    return {mode:"guided" as const,content:`我們用中文練習「${unit.title}」。\n參考句：${unit.sentence}\n${unit.sentenceVi}\n\n請試著回答：${unit.question}\n提示：${unit.grammar}`};
  }
  const prompt=`你是 ZhongXue+ 的華語練習夥伴。使用繁體中文、臺灣常用詞和 ${unit.level} 難度。主題：${unit.title}；句型：${unit.grammar}。使用純文字，不用 Markdown 或星號。依序給四小段：中文：一句簡短回應；Pinyin：這一句的帶聲調拼音；Tiếng Việt：這一句的越南文翻譯；練習：一項簡短訂正或鼓勵，最後只問一個相關的簡單中文問題。不要把正確句子當錯誤訂正，不要自行假設學生的學校或所在地。總長不超過450字，中文部分不超過100字。不要聲稱正式評分或TOCFL認證；健康主題只練習語言，不提供診斷。`;
  const baseUrl=(config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/,"");
  const hostname=new URL(baseUrl).hostname;
  const isOpenRouter=hostname==="openrouter.ai";
  const isAgentRouter=hostname.includes("agentrouter");
  const timeoutMs=Number.isFinite(config.timeoutMs) ? Math.min(120000,Math.max(1000,config.timeoutMs!)) : (isOpenRouter || isAgentRouter) ? 90000 : 25000;
  const tokenOptions=isOpenRouter ? {max_tokens:1200,reasoning:{enabled:false,exclude:true}} : isAgentRouter ? {max_tokens:1500} : {max_completion_tokens:450};
  const headers:Record<string,string>={"Content-Type":"application/json",Authorization:`Bearer ${config.key}`};
  if (isAgentRouter) {
    headers["Originator"]="codex_cli_rs";
    headers["User-Agent"]="codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12";
    headers["Version"]="0.101.0";
  }
  let response:Response;
  try {response=await fetcher(`${baseUrl}/chat/completions`, {
    method:"POST",headers,
    signal:AbortSignal.timeout(timeoutMs),body:JSON.stringify({model:config.model,messages:[{role:"system",content:prompt},...input.messages],...tokenOptions}),
  });} catch(e) {
    const isTimeout=e instanceof Error && ["TimeoutError","AbortError"].includes(e.name);
    throw new Error(isTimeout ? "AI 回應時間較長，請稍後重試或切換情境示範。" : "AI 連線失敗，請檢查網路後重試。");
  }
  if (!response.ok) throw new Error(providerError(response.status));
  let data;
  try {data=await response.json();} catch {throw new Error("AI 未傳回有效內容，請重試。");}
  const content=data?.choices?.[0]?.message?.content;
  if (typeof content!=="string" || !content.trim()) throw new Error("AI 未傳回有效內容，請重試。");
  return {mode:"ai" as const,content:content.trim()};
}
