import {test} from "node:test";
import assert from "node:assert/strict";
import {parseDictionary,searchDictionary,normalizePinyin,toneMarks,buildCourseNotes} from "../src/lib/dictionary";
const sample=`# source comment
學生 学生 [xue2 sheng5] /học sinh/sinh viên/
學校 学校 [xue2 xiao4] /trường học/
老師 老师 [lao3 shi1] /giáo viên/thầy cô/
綠 绿 [lu:4] /xanh lá cây/
你好 你好 [ni3 hao3] /xin chào/
invalid line
`;
test("parser preserves simplified/traditional headwords, separate meanings and stable identifiers",()=>{
  const entries=parseDictionary(sample);
  assert.equal(entries.length,5);
  assert.equal(entries[0].traditional,"學生");assert.equal(entries[0].simplified,"学生");
  assert.deepEqual(entries[0].definitions,["học sinh","sinh viên"]);
  assert.equal(parseDictionary('# another header\n'+sample)[0].id,entries[0].id);
  assert.match(entries[0].id,/^cv-[a-f0-9]{24}$/);
});
test("pinyin accepts numbers, tone marks, spaces and ü conventions",()=>{
  assert.equal(normalizePinyin("xué shēng"),normalizePinyin("xue2 sheng1"));
  assert.equal(normalizePinyin("lǜ"),normalizePinyin("lu:4"));
  assert.equal(normalizePinyin("lv4"),normalizePinyin("lü"));
  assert.equal(toneMarks("ni3 hao3"),"nǐ hǎo");
  assert.equal(toneMarks("lu:4 gui4 qiu1 shui3"),"lǜ guì qiū shuǐ");
  assert.equal(toneMarks("ma5"),"ma");
  assert.equal(toneMarks("A1"),"Ā");
});
test("search ranks exact Chinese forms and supports Vietnamese with or without diacritics",()=>{
  const entries=parseDictionary(sample);
  for (const q of ["學生","学生","xue2 sheng5","xué sheng","xuesheng","học sinh","hoc sinh"]) {
    assert.equal(searchDictionary(entries,q).results[0].traditional,"學生",q);
  }
  assert.equal(searchDictionary(entries,"lǜ","pinyin").results[0].traditional,"綠");
  assert.equal(searchDictionary(entries,"trường","vi").results[0].traditional,"學校");
  assert.equal(searchDictionary(entries,"học sinh","hanzi").total,0);
});
test("empty, unsupported and oversized queries do not dump dictionary, and paging is bounded",()=>{
  const entries=parseDictionary(sample);
  assert.equal(searchDictionary(entries,"").total,0);
  assert.equal(searchDictionary(entries,"!!!").total,0);
  assert.equal(searchDictionary(entries,"不存在的詞").total,0);
  assert.equal(searchDictionary(entries,"a".repeat(81)).total,0);
  const first=searchDictionary(entries,"學","hanzi",0,1);
  const next=searchDictionary(entries,"學","hanzi",1,1);
  assert.equal(first.total,2);assert.equal(first.results.length,1);
  assert.notEqual(first.results[0].id,next.results[0].id);
  assert.equal(searchDictionary(entries,"學","hanzi",99,1).results.length,0);
});
test("examples include searched word and course meanings are separate from source definitions",()=>{
  const notes=buildCourseNotes("學生","学生");
  assert.ok(notes.units.some(u=>u.id===1));
  assert.ok(notes.examples.length>0);
  assert.ok(notes.examples.every(e=>e.chinese.includes("學生") || e.chinese.includes("学生")));
  assert.equal(buildCourseNotes("不存在的詞","不存在的词").examples.length,0);
});
test("Vietnamese exact meanings outrank incidental mentions and cannot cross definition boundaries",()=>{
  const entries=parseDictionary(sample+'\n生 生 [sheng1] /được sinh/học/sinh viên/\n班 班 [ban1] /lớp/\n朋友 朋友 [peng2 you5] /bạn/');
  assert.equal(searchDictionary(entries,"học sinh","vi").results[0].traditional,"學生");
  assert.equal(searchDictionary(entries,"bạn").results[0].traditional,"朋友");
  const exactAlias=parseDictionary(sample+'\n生 生 [sheng1] /học sinh/');
  assert.equal(searchDictionary(exactAlias,"học sinh","vi").results[0].traditional,"學生");
});
