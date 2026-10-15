import {LessonBrowser} from "@/components/lesson-browser";
import {getUnit} from "@/lib/curriculum";
export default async function Page({searchParams}:{searchParams:Promise<{unit?:string}>}) {
 const query=await searchParams,id=Number(query.unit);
 return <LessonBrowser initialUnit={getUnit(id)?id:1}/>;
}
