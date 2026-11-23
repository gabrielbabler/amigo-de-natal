import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, status: "healthy" });
  } catch (err) {
    console.error("Healthcheck failed:", err);
    return NextResponse.json(
      { ok: false, status: "unhealthy" },
      { status: 500 }
    );
  }
}
