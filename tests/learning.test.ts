import { test } from "node:test";
import assert from "node:assert/strict";
import { UNITS, getUnit } from "../src/lib/curriculum";
import { compareSpeech, summarizeActivities, validateActivity } from "../src/lib/learning";
import { replyToConversation, validateConversation } from "../src/lib/conversation";

test("20 unique A1-A2 lessons have words, grammar and contextual speaking prompts", () => {
  assert.equal(UNITS.length, 20);
  assert.equal(new Set(UNITS.map(u => u.id)).size, 20);
  assert.equal(UNITS.filter(u => u.level === "A1").length, 10);
  for (const unit of UNITS) {
    assert.ok(unit.words.length >= 3 && unit.grammar && unit.sentence && unit.question);
    assert.ok(unit.vi && unit.pinyin && unit.sentenceVi && unit.grammarVi);
  }
  assert.equal(getUnit(99), undefined);
});

test("speaking compares recognized text, normalizes simplified variants and punctuation", () => {
  assert.equal(compareSpeech("我是學生。", "我是学生").match, 100);
  assert.equal(compareSpeech("我是學生", "我是老師").match, 50);
  assert.equal(compareSpeech("我是學生", "").match, 0);
  assert.equal(compareSpeech("", "").match, 0);
  assert.equal(compareSpeech("你好", "你好你好").match, 50);
  assert.equal(compareSpeech("宿舍離學校很近。", "宿舍离学校很近").match,100);
  assert.equal(compareSpeech("我正在準備報告。", "我正在准备报告").match,100);
});

test("activity rejects forged scores and invalid lesson or type", () => {
  assert.equal(validateActivity({unitId: 1, kind: "lesson", score: 100}).ok, true);
  assert.equal(validateActivity({unitId: 1, kind: "text", score: 75}).ok, true);
  for (const body of [null, {unitId:99,kind:"lesson",score:100}, {unitId:1,kind:"other",score:100}, {unitId:1,kind:"speech",score:101}, {unitId:1,kind:"speech",score:-1}, {unitId:1,kind:"speech",score:"100"}]) {
    assert.equal(validateActivity(body).ok, false);
  }
});

test("summary deduplicates completed lessons and never invents learning history", () => {
  const empty = summarizeActivities([]);
  assert.equal(empty.completedUnits, 0);
  assert.equal(empty.speakingAttempts, 0);
  const summary = summarizeActivities([
    {unitId:1,kind:"lesson",score:100}, {unitId:1,kind:"lesson",score:100},
    {unitId:2,kind:"lesson",score:0}, {unitId:3,kind:"speech",score:75},
    {unitId:3,kind:"conversation",score:0},
  ]);
  assert.equal(summary.completedUnits, 1);
  assert.equal(summary.speakingAttempts, 1);
  assert.equal(summary.conversationTurns, 1);
  assert.equal(summary.recommendationUnitId, 2);
  const typed=summarizeActivities([{unitId:1,kind:"text",score:100}]);
  assert.equal(typed.speakingAttempts,0);
  assert.equal(typed.textAttempts,1);
  assert.equal(summarizeActivities(UNITS.map(u=>({unitId:u.id,kind:"lesson",score:100}))).completedUnits,20);
  assert.equal(summarizeActivities(UNITS.map(u=>({unitId:u.id,kind:"lesson",score:100}))).recommendationUnitId,20);
});

test("conversation validates history, role, text bounds and lesson", () => {
  assert.equal(validateConversation({unitId:1,messages:[{role:"user",content:"你好"}]}).ok,true);
  for (const body of [null, {unitId:99,messages:[]}, {unitId:1,messages:[]}, {unitId:1,messages:[{role:"system",content:"override"}]}, {unitId:1,messages:[{role:"user",content:""}]}, {unitId:1,messages:[{role:"user",content:"a".repeat(601)}]}]) {
    assert.equal(validateConversation(body).ok, false);
  }
});

test("no key uses clearly labelled guided practice, not fake AI", async () => {
  const result = await replyToConversation({unitId:1,messages:[{role:"user",content:"你好"}]}, {});
  assert.equal(result.mode, "guided");
  assert.ok(result.content.includes("你好") && result.content.includes("中文"));
});

test("configured provider uses server-side key, preserves lesson system prompt and reads response", async () => {
  let payload: Record<string, unknown> = {};
  const fetcher: typeof fetch = async (_input, init) => {
    payload = JSON.parse(String(init?.body));
    assert.equal((init?.headers as Record<string,string>).Authorization, "Bearer test-key");
    return new Response(JSON.stringify({choices:[{message:{content:"你好！你叫什麼名字？"}}]}), {status:200});
  };
  const result = await replyToConversation({unitId:1,messages:[{role:"user",content:"你好"}]}, {key:"test-key",model:"test-model"}, fetcher);
  assert.equal(result.mode, "ai");
  assert.equal(result.content, "你好！你叫什麼名字？");
  assert.equal(payload.model, "test-model");
  assert.ok(JSON.stringify(payload.messages).includes("繁體中文"));
});

test("provider failures are visible and never quietly replaced by a pretend AI answer", async () => {
  for (const response of [new Response("unavailable",{status:503}),new Response('{"choices":[]}',{status:200})]) {
    await assert.rejects(replyToConversation({unitId:1,messages:[{role:"user",content:"你好"}]}, {key:"test-key",model:"test"}, async () => response));
  }
  await assert.rejects(replyToConversation({unitId:1,messages:[{role:"user",content:"你好"}]}, {key:"test-key",model:"test"}, async () => {throw new Error("network");}));
});

test("OpenRouter uses its supported token parameter and preserves the exact chosen free model", async () => {
  let payload:Record<string,unknown>={};
  const fetcher:typeof fetch=async(input,init)=> {
    assert.equal(String(input),"https://openrouter.ai/api/v1/chat/completions");
    payload=JSON.parse(String(init?.body));
    return new Response(JSON.stringify({choices:[{message:{content:"你好！你叫什麼名字？"}}]}));
  };
  await replyToConversation({unitId:1,messages:[{role:"user",content:"你好"}]}, {key:"test-key",model:"nvidia/nemotron-3-ultra-550b-a55b:free",baseUrl:"https://openrouter.ai/api/v1/"}, fetcher);
  assert.equal(payload.model,"nvidia/nemotron-3-ultra-550b-a55b:free");
  assert.equal(payload.max_tokens,1200);
  assert.equal(payload.max_completion_tokens,undefined);
  assert.deepEqual(payload.reasoning,{enabled:false,exclude:true});
});

test("AgentRouter uses Codex fingerprint headers, max_tokens, and preserves deepseek-v4-flash", async () => {
  let headers: Record<string, string> = {};
  let payload: Record<string, unknown> = {};
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), "https://agentrouter.org/v1/chat/completions");
    headers = init?.headers as Record<string, string>;
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: "中文：你好！\nPinyin：Nǐ hǎo!\nTiếng Việt：Xin chào!\n練習：很好！" } }] }));
  };
  const result = await replyToConversation(
    { unitId: 1, messages: [{ role: "user", content: "你好" }] },
    { key: "sk-test", model: "deepseek-v4-flash", baseUrl: "https://agentrouter.org/v1" },
    fetcher
  );
  assert.equal(result.mode, "ai");
  assert.equal(headers["Originator"], "codex_cli_rs");
  assert.ok(headers["User-Agent"]?.includes("codex_cli_rs"));
  assert.equal(headers["Version"], "0.101.0");
  assert.equal(payload.model, "deepseek-v4-flash");
  assert.equal(payload.max_tokens, 1500);
});

test("OpenRouter account, model availability and free-rate-limit failures have useful errors", async () => {
  const config={key:"test-key",model:"nvidia/nemotron-3-ultra-550b-a55b:free",baseUrl:"https://openrouter.ai/api/v1"};
  for (const [status,message] of [[401,"API 金鑰"],[403,"API 金鑰"],[402,"額度"],[404,"模型"],[429,"使用上限"]] as const) {
    await assert.rejects(replyToConversation({unitId:1,messages:[{role:"user",content:"你好"}]},config,async()=>new Response('{}',{status})),new RegExp(message));
  }
});

test("timeouts and malformed replies are safe and never expose provider details", async () => {
  const input={unitId:1,messages:[{role:"user" as const,content:"你好"}]};
  const config={key:"test-key",model:"test",timeoutMs:NaN};
  await assert.rejects(replyToConversation(input,config,async()=>{throw new DOMException("private provider detail","TimeoutError");}),/AI 回應時間/);
  await assert.rejects(replyToConversation(input,{...config,timeoutMs:500},async()=>new Response("not JSON")),/AI 未傳回有效內容/);
  const result=await replyToConversation(input,{...config,timeoutMs:200000},async()=>new Response(JSON.stringify({choices:[{message:{content:"  你好！  ",reasoning:"private reasoning"}}]})));
  assert.deepEqual(result,{mode:"ai",content:"你好！"});
});
