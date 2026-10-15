const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {buildLessonQuestions}=require('../src/lib/practice.ts');
const base='http://localhost:3002';
const stamp=Date.now(),password=randomBytes(16).toString('hex');
async function request(path,body,cookie,headers={}){
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],retry:response.headers.get('retry-after')};
}
async function main(){
 assert.equal((await request('/api/health')).status,200);
 assert.equal((await fetch(base+'/login',{redirect:'manual'})).status,200,'Login must be accessible even with demo fallback.');
 assert.equal((await fetch(base+'/register',{redirect:'manual'})).status,200,'Registration must be accessible.');
 const a=await request('/api/auth/register',{name:'QA Improvements A',email:`qa-improve-a-${stamp}@example.test`,password});
 const b=await request('/api/auth/register',{name:'QA Improvements B',email:`qa-improve-b-${stamp}@example.test`,password});
 assert.equal(a.status,201);assert.equal(b.status,201);assert.ok(a.cookie&&b.cookie);
 const questions=buildLessonQuestions(1),answers=questions.map(q=>q.answer);
 assert.equal((await request('/api/learning',{unitId:1,kind:'lesson',score:100},a.cookie)).status,400);
 const lesson=await request('/api/learning',{unitId:1,kind:'lesson',answers,score:0},a.cookie);assert.equal(lesson.data.record.score,100);
 const wrong=await request('/api/learning',{unitId:1,kind:'lesson',answers:[questions[0].options.find(c=>c!==answers[0]),questions[1].options.find(c=>c!==answers[1]),'錯'],score:100},a.cookie);assert.equal(wrong.data.record.score,0);
 const speech=await request('/api/learning',{unitId:1,kind:'text',text:'你好，我是越南学生。',score:0},a.cookie);assert.equal(speech.data.record.score,100);
 const first=await request('/api/conversation?guided=1',{unitId:1,messages:[{role:'user',content:'你好'}]},a.cookie);assert.equal(first.status,200);
 const threadId=first.data.thread.id;
 const restored=await request('/api/conversation?unitId=1&guided=1',undefined,a.cookie);assert.equal(restored.data.thread.id,threadId);assert.equal(restored.data.thread.messages.length,2);
 assert.equal((await request(`/api/conversation?unitId=1&guided=1&threadId=${threadId}`,undefined,b.cookie)).status,404);
 assert.equal((await request('/api/conversation?guided=1',{unitId:1,threadId,messages:[{role:'user',content:'不能讀別人的內容'}]},b.cookie)).status,404);
 const replies=await Promise.all([request('/api/conversation?guided=1',{unitId:1,threadId,messages:[{role:'user',content:'我是學生'}]},a.cookie),request('/api/conversation?guided=1',{unitId:1,threadId,messages:[{role:'user',content:'我學中文'}]},a.cookie)]);
 assert.ok(replies.every(r=>[200,409].includes(r.status)));
 const after=await request('/api/conversation?unitId=1&guided=1',undefined,a.cookie);assert.equal(after.data.thread.messages.length,2+replies.filter(r=>r.status===200).length*2);
 const blank=await request('/api/conversation?guided=1',{action:'new',unitId:1},a.cookie);assert.equal(blank.data.thread.messages.length,0);
 assert.equal((await request(`/api/conversation?unitId=1&guided=1&threadId=${threadId}`,undefined,a.cookie)).data.thread.messages.length,after.data.thread.messages.length);
 const search=await request('/api/dictionary?q='+encodeURIComponent('學生'));const word=search.data.results[0];
 assert.equal((await request('/api/dictionary',{id:word.id,action:'save'},a.cookie)).status,200);
 assert.equal((await request('/api/dictionary?shelf=saved',undefined,b.cookie)).data.results.length,0);
 for(let i=0;i<31;i++)assert.equal((await request('/api/learning',{unitId:1,kind:'text',text:'你好'},a.cookie)).status,201);
 const page=await request('/api/learning?page=0',undefined,a.cookie),next=await request('/api/learning?page=1',undefined,a.cookie);
 assert.equal(page.data.records.length,30);assert.ok(page.data.hasMore);assert.ok(next.data.records.length>0);assert.equal(page.data.summary.completedUnits,next.data.summary.completedUnits);
 assert.equal((await request('/api/learning',undefined,b.cookie)).data.records.length,0);
 assert.equal((await request('/api/learning?page=-1',undefined,a.cookie)).status,400);
 assert.equal((await request('/api/learning',{unitId:1,kind:'text',text:'hello'},a.cookie,{Origin:'https://other.example'})).status,403);
 for(let i=0;i<5;i++)assert.equal((await request('/api/auth/login',{email:`qa-improve-b-${stamp}@example.test`,password:'incorrect-password'})).status,401);
 const limited=await request('/api/auth/login',{email:`qa-improve-b-${stamp}@example.test`,password:'incorrect-password'});assert.equal(limited.status,429);assert.ok(Number(limited.retry)>0);
 assert.equal((await request('/api/auth/logout',{},a.cookie)).status,200);
 assert.equal((await request('/api/me',undefined,a.cookie)).data.user.email,'demo@hanzi.app');
 console.log('PASS: server grading, dialogue persistence/isolation/concurrency, saved words, pagination, origin, login throttle, logout.');
 // Generated fixtures stay in their own QA accounts, never the learner's account.
}
main().catch(error=>{console.error(error instanceof assert.AssertionError?`API assertion failed: ${error.message}`:'API test failed; inspect local server diagnostics.');process.exitCode=1;});
