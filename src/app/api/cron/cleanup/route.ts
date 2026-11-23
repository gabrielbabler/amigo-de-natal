import { NextResponse } from "next/server";
import { lte } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";

async function handleCleanup(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");
    if (auth !== `Bearer ${expected}` && querySecret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const deleted = await db
    .delete(groups)
    .where(lte(groups.expiresAt, new Date()))
    .returning({ id: groups.id });

  return NextResponse.json({
    ok: true,
    deletedGroups: deleted.length,
  });
}

export async function POST(req: Request) {
  return handleCleanup(req);
}

export async function GET(req: Request) {
  return handleCleanup(req);
}
