import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const COOKIE_NAME = "adn_founder_key";

function isValidFounderKey(candidate: string | undefined): boolean {
  const expected = process.env.FOUNDER_ADMIN_KEY;
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function authorizeFounder(req: Request): Promise<boolean> {
  const store = await cookies();
  const cookieKey = store.get(COOKIE_NAME)?.value;
  const headerKey = req.headers.get("x-founder-key") ?? undefined;
  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key") ?? undefined;
  return isValidFounderKey(cookieKey ?? headerKey ?? queryKey);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  if (!isValidFounderKey(body.key)) {
    return NextResponse.json(
      { error: "Chave secreta inválida." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, body.key!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function GET(req: Request) {
  if (!(await authorizeFounder(req))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [
    groupStats,
    modeBreakdown,
    participantStats,
    paymentStats,
    analyticsStats,
    affiliateBreakdown,
    aiStats,
    dailyTrend,
  ] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total_rooms,
        COUNT(*) FILTER (WHERE draw_completed_at IS NOT NULL)::int AS draws_completed,
        COUNT(*) FILTER (WHERE chaos_unlocked = true)::int AS chaos_rooms
      FROM groups
    `),
    db.execute(sql`
      SELECT mode, COUNT(*)::int AS count
      FROM groups
      GROUP BY mode
    `),
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total_participants,
        COUNT(*) FILTER (WHERE is_participating = true)::int AS active_participants,
        COUNT(*) FILTER (WHERE revealed_at IS NOT NULL)::int AS reveals_opened,
        COUNT(*) FILTER (WHERE push_subscription IS NOT NULL)::int AS push_opted_in
      FROM participants
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid_count,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'PAID'), 0)::int AS revenue_cents,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'EXPIRED')::int AS expired_count
      FROM payments
    `),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'PAGE_VIEW')::int AS page_views,
        COUNT(*) FILTER (WHERE event_type = 'AFFILIATE_CLICK')::int AS affiliate_clicks,
        COUNT(*) FILTER (WHERE event_type = 'STORY_CARD_SHARE')::int AS story_shares
      FROM analytics_events
    `),
    db.execute(sql`
      SELECT provider, COUNT(*)::int AS count
      FROM analytics_events
      WHERE event_type = 'AFFILIATE_CLICK'
      GROUP BY provider
    `),
    db.execute(sql`
      SELECT
        COUNT(*)::int AS total_generations,
        COUNT(*) FILTER (WHERE model != 'fallback-local')::int AS gemini_generations,
        COUNT(*) FILTER (WHERE model = 'fallback-local')::int AS fallback_generations
      FROM ai_generations
    `),
    db.execute(sql`
      WITH days AS (
        SELECT generate_series(
          (CURRENT_DATE - INTERVAL '6 days')::date,
          CURRENT_DATE::date,
          INTERVAL '1 day'
        )::date AS day
      )
      SELECT
        to_char(d.day, 'DD/MM') AS label,
        COALESCE((SELECT COUNT(*) FROM groups g WHERE g.created_at::date = d.day), 0)::int AS rooms,
        COALESCE((SELECT COUNT(*) FROM participants p WHERE p.created_at::date = d.day), 0)::int AS joins,
        COALESCE((SELECT COUNT(*) FROM analytics_events a WHERE a.event_type = 'PAGE_VIEW' AND a.created_at::date = d.day), 0)::int AS views,
        COALESCE((SELECT COUNT(*) FROM analytics_events a WHERE a.event_type = 'AFFILIATE_CLICK' AND a.created_at::date = d.day), 0)::int AS clicks
      FROM days d
      ORDER BY d.day DESC
    `),
  ]);

  const g = groupStats[0] as Record<string, number>;
  const p = participantStats[0] as Record<string, number>;
  const pay = paymentStats[0] as Record<string, number>;
  const an = analyticsStats[0] as Record<string, number>;
  const ai = aiStats[0] as Record<string, number>;

  return NextResponse.json({
    rooms: {
      total: g?.total_rooms ?? 0,
      drawsCompleted: g?.draws_completed ?? 0,
      chaosRooms: g?.chaos_rooms ?? 0,
      byMode: modeBreakdown as unknown as Array<{ mode: string; count: number }>,
    },
    participants: {
      total: p?.total_participants ?? 0,
      active: p?.active_participants ?? 0,
      revealsOpened: p?.reveals_opened ?? 0,
      pushOptedIn: p?.push_opted_in ?? 0,
    },
    payments: {
      paidCount: pay?.paid_count ?? 0,
      revenueCents: pay?.revenue_cents ?? 0,
      pendingCount: pay?.pending_count ?? 0,
      expiredCount: pay?.expired_count ?? 0,
    },
    analytics: {
      pageViews: an?.page_views ?? 0,
      affiliateClicks: an?.affiliate_clicks ?? 0,
      storyShares: an?.story_shares ?? 0,
      affiliateByProvider: affiliateBreakdown as unknown as Array<{
        provider: string | null;
        count: number;
      }>,
    },
    ai: {
      total: ai?.total_generations ?? 0,
      gemini: ai?.gemini_generations ?? 0,
      fallback: ai?.fallback_generations ?? 0,
    },
    dailyTrend: dailyTrend as unknown as Array<{
      label: string;
      rooms: number;
      joins: number;
      views: number;
      clicks: number;
    }>,
  });
}
