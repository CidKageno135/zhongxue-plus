import {desc,eq,sql} from 'drizzle-orm';
import {db} from '@/db';
import {learningActivities} from '@/db/schema';
import {getUnit,UNITS} from './curriculum';
export async function learningOverview(userId:number,page:number){
 const result=await db.execute(sql`SELECT COALESCE(array_agg(DISTINCT unit_id) FILTER(WHERE kind='lesson' AND score=100),'{}'::integer[]) AS completed_ids,
 count(*) FILTER(WHERE kind='speech')::int AS speech,count(*) FILTER(WHERE kind='text')::int AS text,
 count(*) FILTER(WHERE kind='conversation')::int AS conversation,
 COALESCE(round(avg(score) FILTER(WHERE kind='speech')),0)::int AS speech_match
 FROM learning_activities WHERE user_id=${userId}`);
 const row=result.rows[0] as {completed_ids:number[];speech:number;text:number;conversation:number;speech_match:number};
 const completedIds=row.completed_ids.filter(id=>getUnit(id)).toSorted((a,b)=>a-b);
 const records=await db.select().from(learningActivities).where(eq(learningActivities.userId,userId)).orderBy(desc(learningActivities.createdAt),desc(learningActivities.id)).limit(31).offset(page*30);
 return {summary:{completedIds,completedUnits:completedIds.length,speakingAttempts:row.speech,textAttempts:row.text,conversationTurns:row.conversation,speakingMatch:row.speech_match,recommendationUnitId:UNITS.find(u=>!completedIds.includes(u.id))?.id??20},records:records.slice(0,30),hasMore:records.length>30,page};
}
