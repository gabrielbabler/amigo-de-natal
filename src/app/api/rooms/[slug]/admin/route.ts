import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  aiGenerations,
  assignments,
  exclusions,
  groups,
  participants,
} from "@/db/schema";
import { maskBrPhone } from "@/lib/phone";
import { getAdminTokenFromCookie } from "@/lib/tokens";

async function authorizeAdmin(req: Request, slug: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });
  if (!group) {
    return { error: "Sala não encontrada.", status: 404 as const };
  }

  const cookieToken = await getAdminTokenFromCookie(slug);
  const headerToken = req.headers.get("x-admin-token") ?? undefined;
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token") ?? undefined;
  const token = cookieToken ?? headerToken ?? queryToken;

  if (!token || token !== group.adminToken) {
    return {
      error: "Acesso de organizador não autorizado.",
      status: 401 as const,
    };
  }

  return { group };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const auth = await authorizeAdmin(req, slug);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { group } = auth;

  const [groupParticipants, groupExclusions] = await Promise.all([
    db.query.participants.findMany({
      where: eq(participants.groupId, group.id),
      orderBy: [asc(participants.createdAt)],
    }),
    db.query.exclusions.findMany({
      where: eq(exclusions.groupId, group.id),
    }),
  ]);

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
      adminToken: group.adminToken,
    },
    participants: groupParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      maskedPhone: maskBrPhone(p.phoneLast4),
      tags: p.tags,
      isOrganizer: p.isOrganizer,
      isParticipating: p.isParticipating,
      hasPin: Boolean(p.pinHash),
      vipUnlocked: p.vipUnlocked,
      revealedAt: p.revealedAt,
    })),
    exclusions: groupExclusions.map((e) => ({
      id: e.id,
      giverId: e.giverId,
      excludedReceiverId: e.excludedReceiverId,
    })),
  });
}

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("remove_participant"),
    participantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("reset_pin"),
    participantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("toggle_organizer_participating"),
    isParticipating: z.boolean(),
  }),
  z.object({
    action: z.literal("add_exclusion"),
    giverId: z.string().uuid(),
    excludedReceiverId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("remove_exclusion"),
    exclusionId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("reset_draw"),
  }),
]);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const auth = await authorizeAdmin(req, slug);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { group } = auth;
  const body = await req.json();
  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ação administrativa inválida." },
      { status: 400 }
    );
  }

  const cmd = parsed.data;

  if (cmd.action === "remove_participant") {
    if (group.drawCompletedAt) {
      return NextResponse.json(
        { error: "Não é possível remover participantes após o sorteio." },
        { status: 400 }
      );
    }
    const target = await db.query.participants.findFirst({
      where: and(
        eq(participants.id, cmd.participantId),
        eq(participants.groupId, group.id)
      ),
    });
    if (!target) {
      return NextResponse.json(
        { error: "Participante não encontrado." },
        { status: 404 }
      );
    }
    if (target.isOrganizer) {
      return NextResponse.json(
        {
          error:
            "Use 'Sair do sorteio' para não participar sem perder o acesso de organizador.",
        },
        { status: 400 }
      );
    }
    await db.delete(participants).where(eq(participants.id, target.id));
    return NextResponse.json({ ok: true });
  }

  if (cmd.action === "reset_pin") {
    await db
      .update(participants)
      .set({ pinHash: null, pinAttempts: 0, pinLockedUntil: null })
      .where(
        and(
          eq(participants.id, cmd.participantId),
          eq(participants.groupId, group.id)
        )
      );
    return NextResponse.json({ ok: true });
  }

  if (cmd.action === "toggle_organizer_participating") {
    if (group.drawCompletedAt) {
      return NextResponse.json(
        { error: "Não é possível alterar participação após o sorteio." },
        { status: 400 }
      );
    }
    await db
      .update(participants)
      .set({ isParticipating: cmd.isParticipating })
      .where(
        and(
          eq(participants.groupId, group.id),
          eq(participants.isOrganizer, true)
        )
      );
    return NextResponse.json({ ok: true });
  }

  if (cmd.action === "add_exclusion") {
    if (group.drawCompletedAt) {
      return NextResponse.json(
        { error: "Não é possível alterar restrições após o sorteio." },
        { status: 400 }
      );
    }
    if (cmd.giverId === cmd.excludedReceiverId) {
      return NextResponse.json(
        { error: "Participantes já não podem tirar a si mesmos." },
        { status: 400 }
      );
    }
    await db
      .insert(exclusions)
      .values({
        groupId: group.id,
        giverId: cmd.giverId,
        excludedReceiverId: cmd.excludedReceiverId,
      })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true });
  }

  if (cmd.action === "remove_exclusion") {
    if (group.drawCompletedAt) {
      return NextResponse.json(
        { error: "Não é possível alterar restrições após o sorteio." },
        { status: 400 }
      );
    }
    await db
      .delete(exclusions)
      .where(
        and(
          eq(exclusions.id, cmd.exclusionId),
          eq(exclusions.groupId, group.id)
        )
      );
    return NextResponse.json({ ok: true });
  }

  if (cmd.action === "reset_draw") {
    await db.transaction(async (tx) => {
      await tx.delete(assignments).where(eq(assignments.groupId, group.id));
      await tx.delete(aiGenerations).where(eq(aiGenerations.groupId, group.id));
      await tx
        .update(participants)
        .set({ revealedAt: null })
        .where(eq(participants.groupId, group.id));
      await tx
        .update(groups)
        .set({ drawCompletedAt: null })
        .where(eq(groups.id, group.id));
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const auth = await authorizeAdmin(req, slug);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await db.delete(groups).where(eq(groups.id, auth.group.id));
  return NextResponse.json({ ok: true });
}
