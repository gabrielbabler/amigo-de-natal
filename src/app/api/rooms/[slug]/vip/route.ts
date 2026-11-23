import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, groups, participants } from "@/db/schema";
import {
  buildAmazonSearchUrl,
  buildMercadoLivreSearchUrl,
} from "@/lib/affiliates";
import { getOrCreateVipGifts } from "@/lib/ai";
import { getParticipantTokenFromCookie } from "@/lib/tokens";
import type { GroupMode } from "@/lib/types";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group || !group.drawCompletedAt) {
    return NextResponse.json(
      { error: "Sorteio não encontrado." },
      { status: 404 }
    );
  }

  const cookieToken = await getParticipantTokenFromCookie(slug);
  const headerToken = req.headers.get("x-participant-token") ?? undefined;
  const token = cookieToken ?? headerToken;

  if (!token) {
    return NextResponse.json(
      { error: "Participante não identificado." },
      { status: 401 }
    );
  }

  const giver = await db.query.participants.findFirst({
    where: and(
      eq(participants.groupId, group.id),
      eq(participants.participantToken, token)
    ),
  });

  if (!giver) {
    return NextResponse.json(
      { error: "Participante não encontrado." },
      { status: 404 }
    );
  }

  if (!giver.vipUnlocked) {
    return NextResponse.json(
      { error: "Consultor de Presentes VIP não desbloqueado." },
      { status: 403 }
    );
  }

  const assignment = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.groupId, group.id),
      eq(assignments.giverId, giver.id)
    ),
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Sorteio não encontrado." },
      { status: 404 }
    );
  }

  const receiver = await db.query.participants.findFirst({
    where: eq(participants.id, assignment.receiverId),
  });

  if (!receiver) {
    return NextResponse.json(
      { error: "Pessoa sorteada não encontrada." },
      { status: 404 }
    );
  }

  const vip = await getOrCreateVipGifts({
    groupId: group.id,
    giverId: giver.id,
    receiverId: receiver.id,
    receiverName: receiver.name,
    mode: group.mode as GroupMode,
    budgetCents: group.budgetCents,
    tags: receiver.tags,
  });

  return NextResponse.json({
    ideas: vip.ideas.map((idea) => ({
      ...idea,
      amazonUrl: buildAmazonSearchUrl(idea.searchQuery, group.budgetCents),
      meliUrl: buildMercadoLivreSearchUrl(idea.searchQuery, group.budgetCents),
    })),
    giftNote: vip.giftNote,
  });
}
