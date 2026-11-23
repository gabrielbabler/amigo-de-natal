import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assignments, exclusions, groups, participants } from "@/db/schema";
import { computeDrawAssignments } from "@/lib/draw";
import { sendDrawPushNotifications } from "@/lib/push";
import { getAdminTokenFromCookie } from "@/lib/tokens";

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
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

    const cookieToken = await getAdminTokenFromCookie(slug);
    const headerToken = req.headers.get("x-admin-token") ?? undefined;
    const token = cookieToken ?? headerToken;

    if (!token || token !== group.adminToken) {
      return NextResponse.json(
        { error: "Acesso de organizador não autorizado." },
        { status: 401 }
      );
    }

    if (group.drawCompletedAt) {
      return NextResponse.json(
        { error: "O sorteio já foi realizado." },
        { status: 400 }
      );
    }

    const activeParticipants = await db.query.participants.findMany({
      where: and(
        eq(participants.groupId, group.id),
        eq(participants.isParticipating, true)
      ),
    });

    if (activeParticipants.length < 3) {
      return NextResponse.json(
        {
          error:
            "É necessário ter pelo menos 3 participantes ativos para realizar o sorteio.",
        },
        { status: 400 }
      );
    }

    const groupExclusions = group.chaosUnlocked
      ? await db.query.exclusions.findMany({
          where: eq(exclusions.groupId, group.id),
        })
      : [];

    const activeIds = activeParticipants.map((p) => p.id);
    const activeSet = new Set(activeIds);

    const validExclusions = groupExclusions.filter(
      (e) => activeSet.has(e.giverId) && activeSet.has(e.excludedReceiverId)
    );

    const pairs = computeDrawAssignments(activeIds, validExclusions);

    await db.transaction(async (tx) => {
      await tx.insert(assignments).values(
        pairs.map((pair) => ({
          groupId: group.id,
          giverId: pair.giverId,
          receiverId: pair.receiverId,
        }))
      );
      await tx
        .update(groups)
        .set({ drawCompletedAt: new Date() })
        .where(eq(groups.id, group.id));
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://amigodenatal.com.br";
    void sendDrawPushNotifications(
      activeParticipants.map((p) => p.pushSubscription),
      group.name,
      `${appUrl}/sala/${group.slug}`
    );

    return NextResponse.json({
      ok: true,
      totalAssigned: pairs.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao realizar o sorteio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
