import { UNITS } from "./curriculum";
export interface SeedWord {h:string;p:string;t:string;pos:string;hsk:number;s:[string,string,string][]}
export const DEMO_USER={name:"示範學習者",email:"demo@hanzi.app",password:"demo1234"};
// Legacy hskLevel column stores course bands here, not a TOCFL-to-HSK equivalence.
export const SEED_WORDS:SeedWord[]=UNITS.flatMap(unit=>unit.words.map(word=>({
 h:word.hanzi,p:word.pinyin,t:word.vi,pos:"noun",hsk:unit.level==="A1"?1:2,
 s:[[unit.sentence,unit.pinyin,unit.sentenceVi]],
})));
