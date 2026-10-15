import {getUnit} from './curriculum';
import {compareSpeech,normalizeSpeech,type ActivityInput} from './learning';
export interface LessonQuestion {kind:'meaning'|'cloze'|'order';prompt:string;options:string[];answer:string;explanation:string}
const clozes=[['是','有','在'],['會','是','有'],['有','是','在'],['多少','哪裡','什麼'],['九點','昨天','今天'],['在','有','是'],['要','在','是'],['喜歡','有','在'],['哪裡','多少','誰'],['每天','哪裡','多少'],['因為','但是','或者'],['比','在','從'],['離','比','有'],['覺得','在','是'],['過','正在','會'],['想','在','是'],['正在','已經','明天'],['了','正在','會'],['可以','正在','已經'],['先','昨天','正在']];
const chunks=[['你好，','我是','越南','學生。'],['我','會說','一點','中文。'],['我','有','一個','妹妹。'],['這杯茶','多少','錢？'],['明天','我','九點','上課。'],['我','在圖書館','看書。'],['我','要','一碗','牛肉麵。'],['我','喜歡','喝','無糖茶。'],['請問，','捷運站','在','哪裡？'],['我','每天','練習','中文。'],['因為下雨，','所以','我','不出門。'],['這件衣服','比','那件','便宜。'],['宿舍','離','學校','很近。'],['我','覺得不舒服，','想去','看醫生。'],['我','去過','臺南。'],['我','想邀請你','一起','吃飯。'],['我','正在','準備','報告。'],['我','買了','兩本','書。'],['可以','請你','再說一次','嗎？'],['我','先複習生詞，','再','練習口說。']];
function rotate<T>(items:T[],offset:number):T[]{const n=offset%items.length;return [...items.slice(n),...items.slice(0,n)];}
export function buildLessonQuestions(id:number):LessonQuestion[]{
 const unit=getUnit(id);if(!unit)throw new Error('Invalid lesson');
 const word=unit.words[id%unit.words.length],cloze=clozes[id-1];
 return [{kind:'meaning',prompt:`「${word.hanzi}」的意思是？ / Chọn nghĩa tiếng Việt`,options:rotate(unit.words.map(w=>w.vi),id),answer:word.vi,explanation:`${word.hanzi} (${word.pinyin})：${word.vi}`},
 {kind:'cloze',prompt:`依本課句型填空 / Điền theo mẫu câu của bài：${unit.sentence.replace(cloze[0],'＿＿')}`,options:rotate(cloze,id+1),answer:cloze[0],explanation:`${unit.sentence}\n${unit.grammarVi}`},
 {kind:'order',prompt:'排列句子 / Sắp xếp các phần thành câu mẫu',options:chunks[id-1],answer:unit.sentence,explanation:`${unit.sentence}\n${unit.sentenceVi}`}];
}
export function gradePractice(body:unknown):{ok:true;value:ActivityInput;feedback:{correct:boolean;explanation:string}[]}|{ok:false;error:string}{
 if(!body||typeof body!=='object')return {ok:false,error:'請提供練習內容。'};
 const b=body as Record<string,unknown>,unit=typeof b.unitId==='number'?getUnit(b.unitId):undefined;
 if(!unit)return {ok:false,error:'請選擇有效課程。'};
 if(b.kind==='lesson')return gradeLesson(unit.id,b.answers);
 if(!['speech','text'].includes(String(b.kind))||typeof b.text!=='string'||!b.text.trim()||b.text.length>600)return {ok:false,error:'請提供 1–600 字的練習內容；分數由系統計算。'};
 return {ok:true,value:{unitId:unit.id,kind:b.kind as 'speech'|'text',score:compareSpeech(unit.sentence,b.text).match},feedback:[]};
}
function gradeLesson(unitId:number,answers:unknown):ReturnType<typeof gradePractice>{
 const questions=buildLessonQuestions(unitId);
 if(!Array.isArray(answers)||answers.length!==questions.length||!answers.every((a,i)=>typeof a==='string'&&a.length>0&&a.length<=240&&(questions[i].kind==='order'||questions[i].options.includes(a))))return {ok:false,error:'請完成三道題目後再確認。'};
 const feedback=questions.map((q,i)=>({correct:q.kind==='order'?normalizeSpeech(answers[i])===normalizeSpeech(q.answer):answers[i]===q.answer,explanation:q.explanation}));
 return {ok:true,value:{unitId,kind:'lesson',score:Math.round(feedback.filter(f=>f.correct).length/questions.length*100)},feedback};
}
export function reviewChoices(correct:string,meanings:string[]):string[]{
 const others=[...new Set(meanings)].filter(m=>m!==correct).slice(0,2);
 return others.length?[correct,...others]:[];
}
