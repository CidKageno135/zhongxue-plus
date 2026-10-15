import {SpeakingPractice} from "@/components/speaking-practice";
import {getUnit} from "@/lib/curriculum";
export default async function Page({searchParams}:{searchParams:Promise<{unit?:string}>}) {
 const query=await searchParams,id=Number(query.unit);
 return <SpeakingPractice initialUnit={getUnit(id)?id:1}/>;
}
