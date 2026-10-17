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

const baseMigrationSql = `
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "words" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hanzi" text NOT NULL,
	"pinyin" text NOT NULL,
	"translation" text NOT NULL,
	"part_of_speech" text DEFAULT 'noun' NOT NULL,
	"hsk_level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"interval_days" double precision DEFAULT 0 NOT NULL,
	"ease_factor" double precision DEFAULT 2.5 NOT NULL,
	"due_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"chinese" text NOT NULL,
	"pinyin" text DEFAULT '' NOT NULL,
	"english" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"scope" text DEFAULT 'all' NOT NULL,
	"total" integer NOT NULL,
	"correct" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"word_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"interval_days" double precision DEFAULT 0 NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
`;

async function initializeLocal(client:PGlite) {
 await client.waitReady;
 const result=await client.query<{exists:boolean}>("SELECT to_regclass('public.users') IS NOT NULL AS exists");
 if (!result.rows[0]?.exists) {
  let migration = baseMigrationSql;
  try {
   const p = path.join(process.cwd(),"drizzle","0000_supreme_cassandra_nova.sql");
   if (fs.existsSync(p)) {
    migration=fs.readFileSync(p,"utf8").replaceAll("--> statement-breakpoint","");
   }
  } catch {
   migration = baseMigrationSql;
  }
  await client.exec(migration);
 }
 await client.exec(activitySql);
}
async function initialize() {
 if (process.env.DATABASE_URL) {
  state.zxPool=new Pool({connectionString:process.env.DATABASE_URL});
  state.zxDb=drizzlePg(state.zxPool,{schema}) as unknown as PgliteDatabase<typeof schema>;
  await state.zxPool.query(activitySql);
 } else {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV));
  const dir = process.env.ZHONGXUE_DATA_DIR
    ? path.resolve(process.env.ZHONGXUE_DATA_DIR)
    : (isVercel ? path.join("/tmp", "zhongxue_db") : path.join(process.cwd(), ".data", "zhongxue_db"));
  try {
   fs.mkdirSync(dir,{recursive:true});
   state.zxClient=new PGlite(dir);
  } catch {
   state.zxClient=new PGlite();
  }
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
