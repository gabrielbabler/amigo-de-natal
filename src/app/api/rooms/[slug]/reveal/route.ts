import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, groups, participants } from "@/db/schema";
import {
  buildAmazonSearchUrl,
  buildMercadoLivreSearchUrl,
} from "@/lib/affiliates";
import { getOrCreateChaosReveal } from "@/lib/ai";
import { getParticipantTokenFromCookie } from "@/lib/tokens";
import { MODE_CONFIG, type GroupMode } from "@/lib/types";

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

  if (!group.drawCompletedAt) {
    return NextResponse.json(
      { error: "O sorteio ainda não foi realizado." },
      { status: 400 }
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

  if (!giver || !giver.isParticipating) {
    return NextResponse.json(
      { error: "Você não está participando deste sorteio." },
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
      { error: "Sorteio não encontrado para este participante." },
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

  if (!giver.revealedAt) {
    await db
      .update(participants)
      .set({ revealedAt: new Date() })
      .where(eq(participants.id, giver.id));
  }

  let chaos = null;
  if (group.chaosUnlocked) {
    chaos = await getOrCreateChaosReveal({
      groupId: group.id,
      giverId: giver.id,
      receiverId: receiver.id,
      receiverName: receiver.name,
      mode: group.mode as GroupMode,
      tags: receiver.tags,
    });
  }

  const mode = group.mode as GroupMode;
  const searchTerms =
    receiver.tags.length > 0
      ? receiver.tags.map((tag) =>
          mode === "CHOCOLATE" ? `chocolate ${tag}` : `presente ${tag}`
        )
      : [
          mode === "CHOCOLATE"
            ? "caixa chocolate presente natal"
            : `presente ${MODE_CONFIG[mode].title.toLowerCase()}`,
        ];

  return NextResponse.json({
    receiver: {
      id: receiver.id,
      name: receiver.name,
      tags: receiver.tags,
    },
    freeShopLinks: searchTerms.map((term, idx) => ({
      label: receiver.tags[idx] ?? MODE_CONFIG[mode].title,
      amazonUrl: buildAmazonSearchUrl(term, group.budgetCents),
      meliUrl: buildMercadoLivreSearchUrl(term, group.budgetCents),
    })),
    chaosUnlocked: group.chaosUnlocked,
    chaos,
    vipUnlocked: giver.vipUnlocked,
  });
}
