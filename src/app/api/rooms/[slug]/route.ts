import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, participants } from "@/db/schema";
import { getParticipantTokenFromCookie } from "@/lib/tokens";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return NextResponse.json(
      { error: "Sala não encontrada." },
      { status: 404 }
    );
  }

  const activeParticipants = await db.query.participants.findMany({
    where: and(
      eq(participants.groupId, group.id),
      eq(participants.isParticipating, true)
    ),
    orderBy: [asc(participants.createdAt)],
    columns: {
      id: true,
      name: true,
      tags: true,
      isOrganizer: true,
      revealedAt: true,
    },
  });

  const headerToken = req.headers.get("x-participant-token") ?? undefined;
  const cookieToken = await getParticipantTokenFromCookie(slug);
  const token = cookieToken ?? headerToken;

  let currentParticipant = null;
  if (token) {
    const found = await db.query.participants.findFirst({
      where: and(
        eq(participants.groupId, group.id),
        eq(participants.participantToken, token)
      ),
      columns: {
        id: true,
        name: true,
        tags: true,
        isOrganizer: true,
        isParticipating: true,
        vipUnlocked: true,
        revealedAt: true,
        pushSubscription: true,
      },
    });
    if (found) {
      currentParticipant = {
        id: found.id,
        name: found.name,
        tags: found.tags,
        isOrganizer: found.isOrganizer,
        isParticipating: found.isParticipating,
        vipUnlocked: found.vipUnlocked,
        revealedAt: found.revealedAt,
        hasPushSubscription: Boolean(found.pushSubscription),
      };
    }
  }

  return NextResponse.json({
    group: {
      id: group.id,
      slug: group.slug,
      name: group.name,
      mode: group.mode,
      budgetCents: group.budgetCents,
      revealDate: group.revealDate,
      chaosUnlocked: group.chaosUnlocked,
      drawCompleted: Boolean(group.drawCompletedAt),
      drawCompletedAt: group.drawCompletedAt,
    },
    participants: activeParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      tags: p.tags,
      isOrganizer: p.isOrganizer,
      hasRevealed: Boolean(p.revealedAt),
    })),
    currentParticipant,
  });
}
