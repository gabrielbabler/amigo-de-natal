import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { groups, participants } from "@/db/schema";
import { normalizeBrPhone, normalizeName } from "@/lib/phone";
import { hashPin, isValidPin } from "@/lib/pin";
import {
  adminCookieName,
  cookieOptions,
  generateRoomSlug,
  generateSecretToken,
  participantCookieName,
} from "@/lib/tokens";
import { getDefaultPostNewYearExpiry } from "@/lib/types";

const createRoomSchema = z.object({
  groupName: z.string().trim().min(2, "Digite o nome do grupo.").max(60),
  mode: z.enum(["SECRETO", "ONCA", "CHOCOLATE"]),
  budgetReais: z.number().min(10, "Valor mínimo R$ 10.").max(5000),
  revealDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  organizerName: z.string().trim().min(2, "Digite seu nome.").max(50),
  organizerPhone: z.string().trim().min(8, "Digite seu WhatsApp com DDD."),
  organizerPin: z.string().trim(),
  organizerTags: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPhone = normalizeBrPhone(data.organizerPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Número de WhatsApp inválido. Use DDD + número (ex: 11 99999-9999)." },
        { status: 400 }
      );
    }

    if (!isValidPin(data.organizerPin)) {
      return NextResponse.json(
        { error: "O PIN de recuperação deve ter exatamente 4 dígitos numéricos." },
        { status: 400 }
      );
    }

    const slug = generateRoomSlug(data.groupName);
    const adminToken = generateSecretToken();
    const participantToken = generateSecretToken();
    const budgetCents = Math.round(data.budgetReais * 100);
    const pinHash = hashPin(data.organizerPin);

    const created = await db.transaction(async (tx) => {
      const [group] = await tx
        .insert(groups)
        .values({
          slug,
          name: data.groupName,
          mode: data.mode,
          budgetCents,
          revealDate: data.revealDate,
          adminToken,
          expiresAt: getDefaultPostNewYearExpiry(),
        })
        .returning();

      const [organizer] = await tx
        .insert(participants)
        .values({
          groupId: group.id,
          name: data.organizerName,
          normalizedName: normalizeName(data.organizerName),
          normalizedPhone,
          pinHash,
          participantToken,
          tags: data.organizerTags,
          isOrganizer: true,
          isParticipating: true,
        })
        .returning();

      return { group, organizer };
    });

    const response = NextResponse.json(
      {
        group: {
          id: created.group.id,
          slug: created.group.slug,
          name: created.group.name,
          mode: created.group.mode,
          budgetCents: created.group.budgetCents,
          revealDate: created.group.revealDate,
        },
        adminToken,
        participantToken,
        participantId: created.organizer.id,
      },
      { status: 201 }
    );

    const opts = cookieOptions();
    response.cookies.set(adminCookieName(slug), adminToken, opts);
    response.cookies.set(participantCookieName(slug), participantToken, opts);

    return response;
  } catch (err) {
    console.error("Create room error:", err);
    return NextResponse.json(
      { error: "Não foi possível criar a sala. Tente novamente." },
      { status: 500 }
    );
  }
}
