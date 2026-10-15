import {createHash} from "node:crypto";
import {UNITS} from "./curriculum";
export interface DictionaryEntry {
  id:string;traditional:string;simplified:string;pinyin:string;definitions:string[];
  pinyinKey:string;viKeys:string[];
}
export type SearchMode="all"|"hanzi"|"pinyin"|"vi";
const courseWords=new Set(UNITS.flatMap(unit=>unit.words.map(word=>word.hanzi)));
export function normalizePinyin(text:string) {
  return text.toLowerCase().replace(/u:|[üǖǘǚǜ]/g,"v").normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-zv]/g,"");
}
export function normalizeVietnamese(text:string) {
  return text.toLowerCase().replace(/đ/g,"d").normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
export function toneMarks(pinyin:string) {
  return pinyin.replace(/[A-Za-züÜ:]+[1-5]/g,syllable=> {
    const tone=Number(syllable.slice(-1)),base=syllable.slice(0,-1).replace(/u:|v/g,"ü").replace(/U:|V/g,"Ü");
    if (tone===5) return base;
    const vowels=Array.from(base).map((v,i)=>({v,i})).filter(x=>/[aeiouü]/i.test(x.v));
    const target=vowels.find(x=>/[aA]/.test(x.v)) ?? vowels.find(x=>/[eE]/.test(x.v)) ?? (base.toLowerCase().includes("ou")?vowels.find(x=>/[oO]/.test(x.v)):vowels.at(-1));
    if (!target) return base;
    const marks:Record<string,string>={a:"āáǎà",e:"ēéěè",i:"īíǐì",o:"ōóǒò",u:"ūúǔù",ü:"ǖǘǚǜ"};
    let marked=marks[target.v.toLowerCase()][tone-1];
    if (target.v!==target.v.toLowerCase()) marked=marked.toUpperCase();
    return base.slice(0,target.i)+marked+base.slice(target.i+1);
  });
}
export function parseDictionary(text:string):DictionaryEntry[] {
  const entries=new Map<string,DictionaryEntry>();
  for (const line of text.split(/\r?\n/)) {
    const match=line.match(/^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/);
    if (!match) continue;
    const [,traditional,simplified,pinyin,raw]=match;
    const id="cv-"+createHash("sha256").update(`${traditional}\0${simplified}\0${pinyin}`).digest("hex").slice(0,24);
    const definitions=[...new Set([...(entries.get(id)?.definitions ?? []),...raw.split("/").map(x=>x.trim()).filter(Boolean)])];
    entries.set(id,{id,traditional,simplified,pinyin,definitions,pinyinKey:normalizePinyin(pinyin),viKeys:definitions.map(normalizeVietnamese)});
  }
  return [...entries.values()];
}
export function publicEntry(entry:DictionaryEntry) {
  return {id:entry.id,traditional:entry.traditional,simplified:entry.simplified,pinyin:toneMarks(entry.pinyin),definitions:entry.definitions};
}
export type DictionaryResult=ReturnType<typeof publicEntry>;
function matchScore(entry:DictionaryEntry,query:string,mode:SearchMode,pinyin:string,vi:string) {
  const candidates:number[]=[];
  if (mode==="all" || mode==="hanzi") {
    if ([entry.traditional,entry.simplified].includes(query)) candidates.push(0);
    else if (entry.traditional.startsWith(query) || entry.simplified.startsWith(query)) candidates.push(10);
    else if (entry.traditional.includes(query) || entry.simplified.includes(query)) candidates.push(20);
  }
  if (pinyin && (mode==="all" || mode==="pinyin")) {
    if (entry.pinyinKey===pinyin) candidates.push(1);
    else if (entry.pinyinKey.startsWith(pinyin)) candidates.push(25);
  }
  if (vi && (mode==="all" || mode==="vi")) {
    if (entry.viKeys.includes(vi)) candidates.push(2);
    else if (entry.viKeys.some(d=>d.startsWith(vi+" "))) candidates.push(5);
    else if (entry.viKeys.some(d=>` ${d} `.includes(` ${vi} `))) candidates.push(30);
  }
  const score=candidates.length?Math.min(...candidates):Infinity;
  // Prefer complete words taught in the introductory course over character-only
  // equivalents when their Vietnamese definitions match equally well.
  return score===2 && courseWords.has(entry.traditional)?1:score;
}
export function searchDictionary(entries:DictionaryEntry[],query:string,mode:SearchMode="all",offset=0,limit=20) {
  const text=query.trim();
  if (!text || text.length>80 || !/[\p{L}\p{N}]/u.test(text)) return {total:0,results:[] as DictionaryResult[]};
  const py=normalizePinyin(text),vi=normalizeVietnamese(text);
  const resolvedMode=mode==="all" && /[đĐăĂâÂêÊôÔơƠưƯ\u1EA0-\u1EF9]/.test(text)?"vi":mode;
  const matches=entries.map(entry=>({entry,score:matchScore(entry,text,resolvedMode,py,vi)})).filter(x=>Number.isFinite(x.score));
  const sorted=matches.sort((a,b)=>a.score-b.score || a.entry.traditional.length-b.entry.traditional.length || a.entry.traditional.localeCompare(b.entry.traditional,"zh-Hant"));
  return {total:matches.length,results:sorted.slice(Math.max(0,offset),Math.max(0,offset)+Math.min(20,Math.max(1,limit))).map(x=>publicEntry(x.entry))};
}
export function buildCourseNotes(traditional:string,simplified:string) {
  const units=UNITS.filter(u=>u.words.some(w=>w.hanzi===traditional || w.hanzi===simplified) || u.sentence.includes(traditional) || u.sentence.includes(simplified));
  const examples=units.filter(u=>u.sentence.includes(traditional) || u.sentence.includes(simplified)).map(u=>({chinese:u.sentence,pinyin:u.pinyin,vi:u.sentenceVi,unitId:u.id}));
  const meanings=[...new Set(units.flatMap(u=>u.words.filter(w=>w.hanzi===traditional || w.hanzi===simplified).map(w=>w.vi)))];
  return {meanings,units:units.map(u=>({id:u.id,title:u.title,level:u.level})),examples};
}
