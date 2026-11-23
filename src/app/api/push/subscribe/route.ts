import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groups, participants } from "@/db/schema";
import { getParticipantTokenFromCookie } from "@/lib/tokens";

const pushSchema = z.object({
  slug: z.string().min(1),
  subscription: z.record(z.string(), z.unknown()),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Inscrição push inválida." },
      { status: 400 }
    );
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, parsed.data.slug),
  });
  if (!group) {
    return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  }

  const token =
    (await getParticipantTokenFromCookie(parsed.data.slug)) ??
    req.headers.get("x-participant-token") ??
    undefined;

  if (!token) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  await db
    .update(participants)
    .set({ pushSubscription: parsed.data.subscription })
    .where(
      and(
        eq(participants.groupId, group.id),
        eq(participants.participantToken, token)
      )
    );

  return NextResponse.json({ ok: true });
}
