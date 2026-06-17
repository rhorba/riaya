import { authDb } from "@riaya/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await authDb.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "ok", ts: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable", ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
