import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, participants, payments } from "@/db/schema";
import { getPaymentGateway } from "@/lib/payments";

async function fulfillPayment(paymentId: string) {
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, paymentId),
  });
  if (!payment) return null;

  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "PAID", paidAt: new Date() })
      .where(eq(payments.id, payment.id));

    if (payment.productType === "CHAOS_MODE") {
      await tx
        .update(groups)
        .set({ chaosUnlocked: true })
        .where(eq(groups.id, payment.groupId));
    } else if (payment.participantId) {
      await tx
        .update(participants)
        .set({ vipUnlocked: true })
        .where(eq(participants.id, payment.participantId));
    }
  });

  return "PAID" as const;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const payment = await db.query.payments.findFirst({
    where: eq(payments.id, id),
  });

  if (!payment) {
    return NextResponse.json(
      { error: "Pagamento não encontrado." },
      { status: 404 }
    );
  }

  if (payment.status === "PAID") {
    return NextResponse.json({ status: "PAID" });
  }

  if (payment.expiresAt.getTime() < Date.now()) {
    await db
      .update(payments)
      .set({ status: "EXPIRED" })
      .where(eq(payments.id, payment.id));
    return NextResponse.json({ status: "EXPIRED" });
  }

  // Fallback active check with provider if webhook hasn't arrived yet
  if (payment.provider === "abacatepay") {
    try {
      const gateway = getPaymentGateway();
      const check = await gateway.checkPixStatus(payment.externalId);
      if (check.status === "PAID") {
        await fulfillPayment(payment.id);
        return NextResponse.json({ status: "PAID" });
      }
      if (check.status === "EXPIRED" || check.status === "FAILED") {
        await db
          .update(payments)
          .set({ status: check.status })
          .where(eq(payments.id, payment.id));
        return NextResponse.json({ status: check.status });
      }
    } catch {
      // Ignore transient poll errors
    }
  }

  return NextResponse.json({ status: payment.status });
}

// Local development helper when PAYMENT_PROVIDER=mock
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if ((process.env.PAYMENT_PROVIDER ?? "mock") !== "mock") {
    return NextResponse.json(
      { error: "Operação disponível apenas em modo mock." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const result = await fulfillPayment(id);
  if (!result) {
    return NextResponse.json(
      { error: "Pagamento não encontrado." },
      { status: 404 }
    );
  }
  return NextResponse.json({ status: "PAID" });
}
