import {ConversationPractice} from "@/components/conversation-practice";
import {getUnit} from "@/lib/curriculum";
export default async function Page({searchParams}:{searchParams:Promise<{unit?:string}>}) {
 const query=await searchParams,id=Number(query.unit);
 return <ConversationPractice initialUnit={getUnit(id)?id:1}/>;
}
