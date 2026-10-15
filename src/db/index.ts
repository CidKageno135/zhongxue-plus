import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleLite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
const state=globalThis as typeof globalThis & {zxClient?:PGlite;zxPool?:Pool;zxDb?:PgliteDatabase<typeof schema>;zxReady?:Promise<void>};
const activitySql=`CREATE TABLE IF NOT EXISTS learning_activities (
 id serial PRIMARY KEY,user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 unit_id integer NOT NULL,kind text NOT NULL,score integer NOT NULL,created_at timestamp with time zone NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS activities_user_time_idx ON learning_activities(user_id,created_at);
 CREATE TABLE IF NOT EXISTS dictionary_bookmarks (id serial PRIMARY KEY,user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,entry_id text NOT NULL,created_at timestamp with time zone NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS dictionary_bookmarks_user_entry_idx ON dictionary_bookmarks(user_id,entry_id);
 CREATE TABLE IF NOT EXISTS dictionary_history (id serial PRIMARY KEY,user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,entry_id text NOT NULL,updated_at timestamp with time zone NOT NULL DEFAULT now());
 CREATE UNIQUE INDEX IF NOT EXISTS dictionary_history_user_entry_idx ON dictionary_history(user_id,entry_id);
 CREATE TABLE IF NOT EXISTS conversation_threads (id serial PRIMARY KEY,user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,unit_id integer NOT NULL,mode text NOT NULL,messages jsonb NOT NULL DEFAULT '[]',version integer NOT NULL DEFAULT 0,updated_at timestamp with time zone NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS conversation_threads_user_unit_idx ON conversation_threads(user_id,unit_id,updated_at);
 CREATE TABLE IF NOT EXISTS request_counters (key text PRIMARY KEY,count integer NOT NULL,expires_at timestamp with time zone NOT NULL);`;
async function initializeLocal(client:PGlite) {
 await client.waitReady;
 const result=await client.query<{exists:boolean}>("SELECT to_regclass('public.users') IS NOT NULL AS exists");
 if (!result.rows[0]?.exists) {
  const migration=fs.readFileSync(path.join(process.cwd(),"drizzle","0000_supreme_cassandra_nova.sql"),"utf8");
  await client.exec(migration.replaceAll("--> statement-breakpoint",""));
 }
 await client.exec(activitySql);
}
async function initialize() {
 if (process.env.DATABASE_URL) {
  state.zxPool=new Pool({connectionString:process.env.DATABASE_URL});
  state.zxDb=drizzlePg(state.zxPool,{schema}) as unknown as PgliteDatabase<typeof schema>;
    await state.zxPool.query(activitySql);
 } else {
  const dir=process.env.ZHONGXUE_DATA_DIR?path.resolve(process.env.ZHONGXUE_DATA_DIR):path.join(process.cwd(),".data","zhongxue_db");
  fs.mkdirSync(dir,{recursive:true});
  state.zxClient=new PGlite(dir);
  state.zxDb=drizzleLite(state.zxClient,{schema});
    await initializeLocal(state.zxClient);
 }
}
// Build workers import routes without opening the same persistent database.
// Initialization starts only in the server runtime before a query is executed.
export const db=new Proxy({} as PgliteDatabase<typeof schema>, {
  get(_target,property) {
    if (!state.zxDb) throw new Error("Database not initialized; await ensureDbReady first.");
    const value=Reflect.get(state.zxDb,property);
    return typeof value==="function"?value.bind(state.zxDb):value;
  },
});
export const pool=state.zxPool ?? null;
export async function ensureDbReady() {
  state.zxReady ??= initialize();
  await state.zxReady;
}
