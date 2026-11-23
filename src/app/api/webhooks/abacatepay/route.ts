import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, participants, payments } from "@/db/schema";

export async function POST(req: Request) {
  const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (expectedSecret) {
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");
    const headerSecret =
      req.headers.get("x-webhook-secret") ??
      req.headers.get("x-abacatepay-secret");
    if (querySecret !== expectedSecret && headerSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = (await req.json()) as {
      event?: string;
      data?: {
        id?: string;
        pixQrCode?: { id?: string };
        status?: string;
      };
    };

    const externalId = body.data?.pixQrCode?.id ?? body.data?.id;
    const isPaidEvent =
      body.event === "billing.paid" ||
      body.event === "pixQrCode.paid" ||
      body.data?.status?.toUpperCase() === "PAID";

    if (!externalId || !isPaidEvent) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.externalId, externalId),
    });

    if (!payment) {
      return NextResponse.json({ ok: true, notFound: true });
    }

    if (payment.status !== "PAID") {
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
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("AbacatePay webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
