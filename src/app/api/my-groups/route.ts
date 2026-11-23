import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groups, participants } from "@/db/schema";
import { normalizeBrPhone } from "@/lib/phone";
import {
  isPinLocked,
  isValidPin,
  nextPinFailureState,
  verifyPin,
} from "@/lib/pin";
import {
  adminCookieName,
  cookieOptions,
  participantCookieName,
} from "@/lib/tokens";

const lookupSchema = z.object({
  phone: z.string().trim().min(8, "Digite seu WhatsApp com DDD."),
  pin: z.string().trim(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeBrPhone(parsed.data.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "WhatsApp inválido. Use DDD + número (ex: 11 99999-9999)." },
        { status: 400 }
      );
    }

    if (!isValidPin(parsed.data.pin)) {
      return NextResponse.json(
        { error: "O PIN deve ter exatamente 4 dígitos numéricos." },
        { status: 400 }
      );
    }

    const rows = await db
      .select({
        participant: participants,
        group: groups,
      })
      .from(participants)
      .innerJoin(groups, eq(participants.groupId, groups.id))
      .where(eq(participants.normalizedPhone, normalizedPhone))
      .orderBy(desc(groups.createdAt));

    const matched: Array<{
      groupId: string;
      slug: string;
      name: string;
      mode: string;
      revealDate: string;
      drawCompleted: boolean;
      isOrganizer: boolean;
      isParticipating: boolean;
      participantName: string;
      participantToken: string;
      adminToken: string | null;
    }> = [];

    for (const row of rows) {
      const p = row.participant;
      if (isPinLocked(p.pinLockedUntil)) {
        continue;
      }

      if (verifyPin(parsed.data.pin, p.pinHash)) {
        if (p.pinAttempts > 0) {
          await db
            .update(participants)
            .set({ pinAttempts: 0, pinLockedUntil: null })
            .where(eq(participants.id, p.id));
        }

        matched.push({
          groupId: row.group.id,
          slug: row.group.slug,
          name: row.group.name,
          mode: row.group.mode,
          revealDate: row.group.revealDate,
          drawCompleted: Boolean(row.group.drawCompletedAt),
          isOrganizer: p.isOrganizer,
          isParticipating: p.isParticipating,
          participantName: p.name,
          participantToken: p.participantToken,
          adminToken: p.isOrganizer ? row.group.adminToken : null,
        });
      } else if (p.pinHash) {
        const failState = nextPinFailureState(p.pinAttempts);
        await db
          .update(participants)
          .set(failState)
          .where(eq(participants.id, p.id));
      }
    }

    if (matched.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nenhum grupo encontrado para esse WhatsApp + PIN. Se você usou um PIN diferente em algum grupo, abra o link daquele grupo diretamente.",
        },
        { status: 404 }
      );
    }

    const res = NextResponse.json({
      groups: matched.map((m) => ({
        groupId: m.groupId,
        slug: m.slug,
        name: m.name,
        mode: m.mode,
        revealDate: m.revealDate,
        drawCompleted: m.drawCompleted,
        isOrganizer: m.isOrganizer,
        isParticipating: m.isParticipating,
        participantName: m.participantName,
      })),
    });

    const opts = cookieOptions();
    for (const m of matched) {
      res.cookies.set(participantCookieName(m.slug), m.participantToken, opts);
      if (m.isOrganizer && m.adminToken) {
        res.cookies.set(adminCookieName(m.slug), m.adminToken, opts);
      }
    }

    return res;
  } catch (err) {
    console.error("My groups lookup error:", err);
    return NextResponse.json(
      { error: "Erro ao buscar seus grupos." },
      { status: 500 }
    );
  }
}
