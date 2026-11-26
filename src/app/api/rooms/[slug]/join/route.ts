import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groups, participants } from "@/db/schema";
import {
  areNamesSimilar,
  getPhoneLast4,
  hashPhone,
  normalizeBrPhone,
  normalizeName,
} from "@/lib/phone";
import {
  hashPin,
  isPinLocked,
  isValidPin,
  nextPinFailureState,
  verifyPin,
} from "@/lib/pin";
import {
  cookieOptions,
  generateSecretToken,
  participantCookieName,
} from "@/lib/tokens";

const joinSchema = z.object({
  mode: z.enum(["join", "recover"]).default("join"),
  name: z.string().trim().max(50).optional(),
  phone: z.string().trim().min(8, "Digite seu WhatsApp com DDD."),
  pin: z.string().trim(),
  tags: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
  confirmSimilarName: z.boolean().optional(),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const group = await db.query.groups.findFirst({
      where: eq(groups.slug, slug),
    });
    if (!group) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    const normalizedPhone = normalizeBrPhone(data.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "WhatsApp inválido. Use DDD + número (ex: 11 99999-9999)." },
        { status: 400 }
      );
    }

    if (!isValidPin(data.pin)) {
      return NextResponse.json(
        { error: "O PIN deve ter exatamente 4 dígitos numéricos." },
        { status: 400 }
      );
    }

    const phoneHmac = hashPhone(normalizedPhone);

    // Layer 2: Check UNIQUE(group_id, phone_hmac)
    const existingByPhone = await db.query.participants.findFirst({
      where: and(
        eq(participants.groupId, group.id),
        eq(participants.phoneHmac, phoneHmac)
      ),
    });

    if (existingByPhone) {
      if (isPinLocked(existingByPhone.pinLockedUntil)) {
        return NextResponse.json(
          {
            code: "PIN_LOCKED",
            error:
              "Muitas tentativas incorretas. Aguarde 15 minutos ou peça ao organizador para resetar seu PIN.",
          },
          { status: 429 }
        );
      }

      // If organizer reset the PIN (pinHash === null), allow setting a new PIN on recovery
      if (!existingByPhone.pinHash) {
        const newPinHash = hashPin(data.pin);
        await db
          .update(participants)
          .set({
            pinHash: newPinHash,
            pinAttempts: 0,
            pinLockedUntil: null,
          })
          .where(eq(participants.id, existingByPhone.id));

        const res = NextResponse.json({
          recovered: true,
          participant: {
            id: existingByPhone.id,
            name: existingByPhone.name,
            tags: existingByPhone.tags,
            participantToken: existingByPhone.participantToken,
          },
        });
        res.cookies.set(
          participantCookieName(slug),
          existingByPhone.participantToken,
          cookieOptions()
        );
        return res;
      }

      if (data.mode === "join") {
        // Tell the UI this phone already exists and prompt for PIN recovery
        return NextResponse.json(
          {
            code: "PHONE_EXISTS",
            existingName: existingByPhone.name,
            error:
              "Já existe um cadastro com este número neste grupo. Digite seu PIN de 4 dígitos para acessar.",
          },
          { status: 409 }
        );
      }

      // Recovery mode: verify PIN
      const valid = verifyPin(data.pin, existingByPhone.pinHash);
      if (!valid) {
        const failState = nextPinFailureState(existingByPhone.pinAttempts);
        await db
          .update(participants)
          .set(failState)
          .where(eq(participants.id, existingByPhone.id));

        return NextResponse.json(
          {
            code: "INVALID_PIN",
            error:
              "PIN incorreto. Tente novamente ou peça ao organizador para resetar seu PIN.",
          },
          { status: 401 }
        );
      }

      if (existingByPhone.pinAttempts > 0) {
        await db
          .update(participants)
          .set({ pinAttempts: 0, pinLockedUntil: null })
          .where(eq(participants.id, existingByPhone.id));
      }

      const res = NextResponse.json({
        recovered: true,
        participant: {
          id: existingByPhone.id,
          name: existingByPhone.name,
          tags: existingByPhone.tags,
          participantToken: existingByPhone.participantToken,
        },
      });
      res.cookies.set(
        participantCookieName(slug),
        existingByPhone.participantToken,
        cookieOptions()
      );
      return res;
    }

    if (data.mode === "recover") {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          error: "Nenhum cadastro encontrado com esse WhatsApp neste grupo.",
        },
        { status: 404 }
      );
    }

    if (group.drawCompletedAt) {
      return NextResponse.json(
        {
          error:
            "O sorteio deste grupo já foi realizado e a sala está fechada para novos participantes.",
        },
        { status: 403 }
      );
    }

    const cleanName = (data.name ?? "").trim();
    if (cleanName.length < 2) {
      return NextResponse.json(
        { error: "Digite seu nome ou apelido (mínimo 2 letras)." },
        { status: 400 }
      );
    }

    // Fuzzy name check to warn about accidental duplicates
    if (!data.confirmSimilarName) {
      const currentMembers = await db.query.participants.findMany({
        where: eq(participants.groupId, group.id),
        columns: { name: true },
      });
      const similar = currentMembers.find((m) =>
        areNamesSimilar(m.name, cleanName)
      );
      if (similar) {
        return NextResponse.json(
          {
            code: "SIMILAR_NAME_WARNING",
            similarName: similar.name,
            error: `Já existe "${similar.name}" neste grupo. Se for você em outro aparelho, use a opção de recuperação com WhatsApp e PIN.`,
          },
          { status: 409 }
        );
      }
    }

    const participantToken = generateSecretToken();
    const pinHash = hashPin(data.pin);

    const [created] = await db
      .insert(participants)
      .values({
        groupId: group.id,
        name: cleanName,
        normalizedName: normalizeName(cleanName),
        phoneHmac,
        phoneLast4: getPhoneLast4(normalizedPhone),
        pinHash,
        participantToken,
        tags: data.tags,
        isOrganizer: false,
        isParticipating: true,
      })
      .returning();

    const res = NextResponse.json(
      {
        recovered: false,
        participant: {
          id: created.id,
          name: created.name,
          tags: created.tags,
          participantToken: created.participantToken,
        },
      },
      { status: 201 }
    );
    res.cookies.set(
      participantCookieName(slug),
      created.participantToken,
      cookieOptions()
    );
    return res;
  } catch (err) {
    console.error("Join room error:", err);
    return NextResponse.json(
      { error: "Erro ao entrar no grupo. Tente novamente." },
      { status: 500 }
    );
  }
}
