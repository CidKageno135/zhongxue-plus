const assert=require('node:assert/strict');
const base='http://127.0.0.1:3001';
async function call(path,body,cookie) {
  const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
async function main() {
  const student=(await call('/api/dictionary?q='+encodeURIComponent('học sinh')+'&mode=vi')).data;
  assert.equal(student.count,122595);assert.equal(student.results[0].traditional,'學生');
  for (const q of ['學生','学生','xue2 sheng1','xuéshēng','xuesheng']) {
    const response=await call('/api/dictionary?q='+encodeURIComponent(q));
    assert.equal(response.data.results[0].traditional,'學生',q);
  }
  const id=student.results[0].id;
  const fixture=Date.now();
  const a=await call('/api/auth/register',{name:'Dictionary QA A',email:`dict-a-${fixture}@example.test`,password:'Local-QA-2026'});
  const b=await call('/api/auth/register',{name:'Dictionary QA B',email:`dict-b-${fixture}@example.test`,password:'Local-QA-2026'});
  assert.equal(a.status,201);assert.equal(b.status,201);
  for(let i=0;i<2;i++) assert.equal((await call('/api/dictionary',{action:'save',id},a.cookie)).status,200);
  assert.equal((await call('/api/dictionary?shelf=saved',undefined,a.cookie)).data.results.length,1);
  assert.equal((await call('/api/dictionary?shelf=saved',undefined,b.cookie)).data.results.length,0);
  for(let i=0;i<2;i++) await call('/api/dictionary',{action:'view',id},a.cookie);
  assert.equal((await call('/api/dictionary?shelf=history',undefined,a.cookie)).data.results.length,1);
  assert.equal((await call('/api/dictionary?shelf=history',undefined,b.cookie)).data.results.length,0);
  const detail=await call('/api/dictionary?id='+id,undefined,a.cookie);
  assert.equal(detail.data.saved,true);assert.ok(detail.data.course.examples.length>0);
  await call('/api/dictionary',{action:'unsave',id},b.cookie);
  assert.equal((await call('/api/dictionary?id='+id,undefined,a.cookie)).data.saved,true);
  await call('/api/dictionary',{action:'unsave',id},a.cookie);
  assert.equal((await call('/api/dictionary?id='+id,undefined,a.cookie)).data.saved,false);
  for(const path of ['/api/dictionary?q='+'a'.repeat(81),'/api/dictionary?mode=bad','/api/dictionary?id=bad','/api/dictionary?shelf=bad']) assert.equal((await call(path)).status,400);
  assert.equal((await call('/api/dictionary',{action:'save',id:'bad'},a.cookie)).status,400);
  console.log('PASS: real dictionary data/search, details/examples, bookmark/history deduplication, user isolation and invalid requests.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
