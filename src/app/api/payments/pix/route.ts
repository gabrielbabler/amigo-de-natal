import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { groups, participants, payments } from "@/db/schema";
import { getPaymentGateway } from "@/lib/payments";
import {
  getAdminTokenFromCookie,
  getParticipantTokenFromCookie,
} from "@/lib/tokens";
import { CHAOS_PRICE_CENTS, VIP_PRICE_CENTS } from "@/lib/types";

const pixRequestSchema = z.object({
  slug: z.string().min(1),
  productType: z.enum(["CHAOS_MODE", "VIP_CONSULTANT"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = pixRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Solicitação de pagamento inválida." },
        { status: 400 }
      );
    }

    const { slug, productType } = parsed.data;
    const group = await db.query.groups.findFirst({
      where: eq(groups.slug, slug),
    });

    if (!group) {
      return NextResponse.json(
        { error: "Sala não encontrada." },
        { status: 404 }
      );
    }

    let participantId: string | null = null;
    let amountCents = CHAOS_PRICE_CENTS;
    let description = `Amigo de Natal - Modo Caos IA (${group.name})`;

    if (productType === "CHAOS_MODE") {
      const adminCookie = await getAdminTokenFromCookie(slug);
      const adminHeader = req.headers.get("x-admin-token") ?? undefined;
      const adminToken = adminCookie ?? adminHeader;
      if (!adminToken || adminToken !== group.adminToken) {
        return NextResponse.json(
          { error: "Apenas o organizador pode desbloquear o Modo Caos IA." },
          { status: 401 }
        );
      }
      if (group.chaosUnlocked) {
        return NextResponse.json({ alreadyUnlocked: true });
      }
    } else {
      const partCookie = await getParticipantTokenFromCookie(slug);
      const partHeader = req.headers.get("x-participant-token") ?? undefined;
      const partToken = partCookie ?? partHeader;
      if (!partToken) {
        return NextResponse.json(
          { error: "Participante não identificado." },
          { status: 401 }
        );
      }
      const participant = await db.query.participants.findFirst({
        where: and(
          eq(participants.groupId, group.id),
          eq(participants.participantToken, partToken)
        ),
      });
      if (!participant) {
        return NextResponse.json(
          { error: "Participante não encontrado." },
          { status: 404 }
        );
      }
      if (participant.vipUnlocked) {
        return NextResponse.json({ alreadyUnlocked: true });
      }
      participantId = participant.id;
      amountCents = VIP_PRICE_CENTS;
      description = `Amigo de Natal - Consultor VIP (${group.name})`;
    }

    // Reuse unexpired PENDING PIX charge if one already exists
    const existingPending = await db.query.payments.findFirst({
      where: and(
        eq(payments.groupId, group.id),
        participantId
          ? eq(payments.participantId, participantId)
          : isNull(payments.participantId),
        eq(payments.productType, productType),
        eq(payments.status, "PENDING"),
        gt(payments.expiresAt, new Date())
      ),
    });

    if (existingPending) {
      return NextResponse.json({
        paymentId: existingPending.id,
        provider: existingPending.provider,
        amountCents: existingPending.amountCents,
        pixCode: existingPending.pixCode,
        pixQrBase64: existingPending.pixQrBase64,
        expiresAt: existingPending.expiresAt,
      });
    }

    const gateway = getPaymentGateway();
    const charge = await gateway.createPixCharge({
      amountCents,
      description,
      externalRef: `${group.id}:${participantId ?? "admin"}:${productType}`,
    });

    const [saved] = await db
      .insert(payments)
      .values({
        groupId: group.id,
        participantId,
        productType,
        provider: charge.provider,
        externalId: charge.externalId,
        amountCents,
        status: "PENDING",
        pixCode: charge.pixCode,
        pixQrBase64: charge.pixQrBase64,
        expiresAt: charge.expiresAt,
      })
      .returning();

    return NextResponse.json({
      paymentId: saved.id,
      provider: saved.provider,
      amountCents: saved.amountCents,
      pixCode: saved.pixCode,
      pixQrBase64: saved.pixQrBase64,
      expiresAt: saved.expiresAt,
    });
  } catch (err) {
    console.error("PIX creation error:", err);
    return NextResponse.json(
      { error: "Não foi possível gerar o código PIX. Tente novamente." },
      { status: 500 }
    );
  }
}
