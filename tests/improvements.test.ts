import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UNITS} from '../src/lib/curriculum';
import {buildLessonQuestions,gradePractice,reviewChoices} from '../src/lib/practice';
import {alignSpeech,plainTutorText,appendDialogue} from '../src/lib/practice-feedback';
import {parseCredentials,requestPolicies,requestIdentity} from '../src/lib/request-policy';

test('each lesson tests meaning, contextual grammar and sentence construction',()=>{
 for(const unit of UNITS){
  const questions=buildLessonQuestions(unit.id);
  assert.deepEqual(questions.map(q=>q.kind),['meaning','cloze','order']);
  assert.ok(questions.every(q=>q.explanation.length>0));
  assert.ok(questions.slice(0,2).every(q=>new Set(q.options).size===3));
  assert.equal(questions[2].options.join('').replace(/[，。？！]/g,''),unit.sentence.replace(/[，。？！]/g,''));
  const result=gradePractice({unitId:unit.id,kind:'lesson',answers:questions.map(q=>q.answer)});
  assert.equal(result.ok,true);
  if(result.ok) assert.equal(result.value.score,100);
 }
 assert.throws(()=>buildLessonQuestions(99));
});
test('server calculates partial results and rejects forged scores or invalid answers',()=>{
 const questions=buildLessonQuestions(1);
 const correct=questions.map(q=>q.answer);
 const partial=gradePractice({unitId:1,kind:'lesson',answers:[questions[0].options.find(x=>x!==correct[0]),...correct.slice(1)]});
 assert.equal(partial.ok,true);
 if(partial.ok){assert.equal(partial.value.score,67);assert.equal(partial.feedback[0].correct,false);}
 for(const input of [null,{unitId:1,kind:'lesson',score:100},{unitId:1,kind:'lesson',answers:[]},{unitId:99,kind:'text',text:'你好'},{unitId:1,kind:'speech',text:'a'.repeat(601)},{unitId:1,kind:'conversation',score:0},{unitId:1,kind:'lesson',answers:['made up',...correct.slice(1)]}]) assert.equal(gradePractice(input).ok,false);
 const speech=gradePractice({unitId:1,kind:'speech',text:'你好，我是越南学生。',score:0});
 assert.equal(speech.ok,true);if(speech.ok) assert.equal(speech.value.score,100);
 const empty=gradePractice({unitId:1,kind:'text',text:'  '});assert.equal(empty.ok,false);
});
test('speech feedback exposes omission, insertion and substitution while accepting script variants',()=>{
 assert.ok(alignSpeech('我是學生','我是学生').every(x=>x.kind==='match'));
 assert.ok(alignSpeech('我是學生','我是生').some(x=>x.kind==='missing'&&x.expected==='學'));
 assert.ok(alignSpeech('你好','你很好').some(x=>x.kind==='extra'&&x.received==='很'));
 assert.ok(alignSpeech('我是學生','我是老師').some(x=>x.kind==='different'));
 assert.equal(alignSpeech('你好','').filter(x=>x.kind==='missing').length,2);
});
test('tutor formatting stays plain text and dialogue retains complete bounded turns',()=>{
 assert.equal(plainTutorText('## 中文\n你好 **同學**！\n`x`\n<script>bad</script>'),'中文\n你好 同學！\nx\n<script>bad</script>');
 const original=Array.from({length:16},(_,i)=>({role:i%2?'assistant' as const:'user' as const,content:String(i)}));
 const next=appendDialogue(original,'hello','reply');
 assert.equal(original.length,16);assert.equal(next.length,16);assert.equal(next[0].content,'2');
 assert.deepEqual(next.slice(-2),[{role:'user',content:'hello'},{role:'assistant',content:'reply'}]);
});
test('review options avoid duplicate meanings and leave singleton cards to flashcard practice',()=>{
 assert.deepEqual(reviewChoices('một',['một','một']),[]);
 const options=reviewChoices('một',['một','hai','hai','ba','bốn']);
 assert.equal(options.length,3);assert.equal(new Set(options).size,3);assert.ok(options.includes('một'));
});
test('auth input validates byte length and supports existing short passwords only on login',()=>{
 assert.equal(parseCredentials({email:' learner@example.com ',password:'12345678',name:'Học viên'},true).ok,true);
 assert.equal(parseCredentials({email:'learner@example.com',password:'123456'},false).ok,true);
 for(const body of [null,{email:'bad',password:'12345678',name:'Name'},{email:'a@b.com',password:'123456',name:'Name'},{email:'a@b.com',password:'字'.repeat(25),name:'Name'},{email:'a@b.com',password:'12345678',name:'x'.repeat(81)}]) assert.equal(parseCredentials(body,true).ok,false);
});
test('quota policies include account, trusted-network and global daily limits without exposing identities',()=>{
 const identity=requestIdentity(new Request('http://localhost:3001/api',{headers:{'x-forwarded-for':'spoofed'}}),false);
 assert.equal(identity,requestIdentity(new Request('http://localhost:3001/api'),false));
 assert.notEqual(identity,requestIdentity(new Request('http://localhost:3001/api',{headers:{'x-forwarded-for':'203.0.113.10'}}),true));
 const ai=requestPolicies('ai',identity,12,true);
 assert.equal(ai.length,4);assert.ok(ai.some(p=>p.key==='ai:global:day'&&p.limit===50));
 assert.ok(ai.every(p=>p.windowMs>0&&p.limit>0));
 assert.equal(requestPolicies('login',identity,undefined,false,'learner@example.com').length,2);
 assert.equal(requestPolicies('register',identity).length,1);
});
