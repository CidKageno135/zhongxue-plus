import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const start = Date.now();
    await db.execute(sql`select 1`);
    const dbLatencyMs = Date.now() - start;
    return Response.json({
      ok: true,
      service: "zhongxue-plus",
      engine: "pglite",
      dbLatencyMs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Database check failed"
    }, { status: 500 });
  }
}
