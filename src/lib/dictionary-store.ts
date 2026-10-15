import {readFile} from "node:fs/promises";
import path from "node:path";
import {gunzip} from "node:zlib";
import {promisify} from "node:util";
import {parseDictionary,publicEntry,buildCourseNotes,type DictionaryEntry} from "./dictionary";
const decompress=promisify(gunzip);
const cache=globalThis as typeof globalThis & {zxDictionary?:Promise<{entries:DictionaryEntry[];byId:Map<string,DictionaryEntry>}>};
export async function getDictionary() {
  cache.zxDictionary ??= (async()=> {
    const raw=await decompress(await readFile(path.join(process.cwd(),"data","dictionary","CVDICT.u8.gz")));
    const entries=parseDictionary(raw.toString("utf8"));
    if (entries.length<100000) throw new Error("Incomplete dictionary data");
    return {entries,byId:new Map(entries.map(entry=>[entry.id,entry]))};
  })();
  try {return await cache.zxDictionary;} catch(e) {cache.zxDictionary=undefined;throw e;}
}
export async function getDictionaryDetail(id:string) {
  const {entries,byId}=await getDictionary(),entry=byId.get(id);
  if (!entry) return null;
  const related=entries.filter(e=>e.id!==id && e.traditional.length>entry.traditional.length && e.traditional.startsWith(entry.traditional)).slice(0,8).map(publicEntry);
  return {...publicEntry(entry),course:buildCourseNotes(entry.traditional,entry.simplified),related};
}
