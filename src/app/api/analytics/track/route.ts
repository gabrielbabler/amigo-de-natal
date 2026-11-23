import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

const trackSchema = z.object({
  eventType: z.enum(["PAGE_VIEW", "AFFILIATE_CLICK", "STORY_CARD_SHARE"]),
  path: z.string().max(200).optional(),
  provider: z.enum(["amazon", "mercadolivre"]).optional(),
  groupId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await db.insert(analyticsEvents).values({
      eventType: parsed.data.eventType,
      path: parsed.data.path ?? null,
      provider: parsed.data.provider ?? null,
      groupId: parsed.data.groupId ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
