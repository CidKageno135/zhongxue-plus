import {db,ensureDbReady} from "./index";
import {users,words,sentences} from "./schema";
import {DEMO_USER,SEED_WORDS} from "../lib/seed-data";
import {hashPassword} from "../lib/password";
import {eq} from "drizzle-orm";
export async function seedIfEmpty():Promise<boolean> {
 await ensureDbReady();
 const existing=await db.select({id:users.id}).from(users).where(eq(users.email,DEMO_USER.email)).limit(1);
 if (existing.length) return false;
 await seedDemoUser();
 return true;
}
export async function seedDemoUser() {
 const passwordHash=await hashPassword(DEMO_USER.password);
 await db.transaction(async tx=>{
  const [user]=await tx.insert(users).values({name:DEMO_USER.name,email:DEMO_USER.email,passwordHash}).returning();
  for (const w of SEED_WORDS) {
   const [word]=await tx.insert(words).values({userId:user.id,hanzi:w.h,pinyin:w.p,translation:w.t,partOfSpeech:w.pos,hskLevel:w.hsk}).returning();
   for (const [chinese,pinyin,english] of w.s) await tx.insert(sentences).values({wordId:word.id,userId:user.id,chinese,pinyin,english});
  }
 });
 // Do not fabricate review or quiz history.
}
