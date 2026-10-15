import {DictionaryBrowser} from "@/components/dictionary-browser";
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}){const params=await searchParams;return <DictionaryBrowser initialQuery={params.q?.slice(0,80)??''}/>;}
