"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Loader2,
  Lock,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { formatBrlFromCents } from "@/lib/types";

interface MetricsPayload {
  rooms: {
    total: number;
    drawsCompleted: number;
    chaosRooms: number;
    byMode: Array<{ mode: string; count: number }>;
  };
  participants: {
    total: number;
    active: number;
    revealsOpened: number;
    pushOptedIn: number;
  };
  payments: {
    paidCount: number;
    revenueCents: number;
    pendingCount: number;
    expiredCount: number;
  };
  analytics: {
    pageViews: number;
    affiliateClicks: number;
    storyShares: number;
    affiliateByProvider: Array<{ provider: string | null; count: number }>;
  };
  ai: {
    total: number;
    gemini: number;
    fallback: number;
  };
  dailyTrend: Array<{
    label: string;
    rooms: number;
    joins: number;
    views: number;
    clicks: number;
  }>;
}

export default function PainelSecretoPage() {
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/founder/metrics");
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar métricas.");
      const json = (await res.json()) as MetricsPayload;
      setMetrics(json);
      setNeedsAuth(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get("key");
    if (urlKey) {
      window.history.replaceState({}, "", "/painel-secreto");
      fetch("/api/founder/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: urlKey }),
      }).then(() => void loadMetrics());
    } else {
      void loadMetrics();
    }
  }, [loadMetrics]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch("/api/founder/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyInput }),
    });
    if (!res.ok) {
      setAuthError("Chave secreta incorreta.");
      return;
    }
    setKeyInput("");
    await loadMetrics();
  };

  if (loading && !metrics && !needsAuth) {
    return (
      <div className="flex flex-col items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#15803D] dark:text-emerald-400" />
        <p className="mt-3 font-medium">Carregando métricas...</p>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="mx-auto max-w-sm space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Lock className="h-6 w-6 text-[#DC2626] dark:text-red-400" />
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            Acesso Restrito
          </h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Digite sua FOUNDER_ADMIN_KEY"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {authError && (
            <p className="text-sm font-semibold text-red-600">{authError}</p>
          )}
          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-[#15803D] font-extrabold text-white dark:bg-emerald-500 dark:text-slate-950"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (!metrics) return null;

  const avgPerRoom =
    metrics.rooms.total > 0
      ? (metrics.participants.active / metrics.rooms.total).toFixed(1)
      : "0";
  const drawRate =
    metrics.rooms.total > 0
      ? Math.round((metrics.rooms.drawsCompleted / metrics.rooms.total) * 100)
      : 0;
  const amazonClicks =
    metrics.analytics.affiliateByProvider.find((a) => a.provider === "amazon")
      ?.count ?? 0;
  const meliClicks =
    metrics.analytics.affiliateByProvider.find(
      (a) => a.provider === "mercadolivre"
    )?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#DC2626] dark:text-red-400">
            Painel do Fundador
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Métricas & Observabilidade
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadMetrics()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <BarChart3 className="h-4 w-4 text-[#15803D]" />
            <span>Acessos no site</span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {metrics.analytics.pageViews}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Users className="h-4 w-4 text-[#15803D]" />
            <span>Salas criadas</span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {metrics.rooms.total}
          </p>
          <p className="text-xs text-slate-500">
            {metrics.rooms.drawsCompleted} sorteadas ({drawRate}%)
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Users className="h-4 w-4 text-[#DC2626]" />
            <span>Participantes</span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {metrics.participants.total}
          </p>
          <p className="text-xs text-slate-500">
            Média {avgPerRoom}/sala • {metrics.participants.revealsOpened} abriram
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15803D] dark:text-emerald-400">
            <Wallet className="h-4 w-4" />
            <span>Modo Caos (PIX)</span>
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {metrics.payments.paidCount}
          </p>
          <p className="text-xs font-semibold text-[#15803D] dark:text-emerald-300">
            {formatBrlFromCents(metrics.payments.revenueCents)} •{" "}
            {metrics.payments.pendingCount} pendentes
          </p>
        </div>
      </div>

      {/* Affiliates & Virality & AI */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
            <ExternalLink className="h-4 w-4 text-amber-500" />
            <span>Cliques em Afiliados</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {metrics.analytics.affiliateClicks}
          </p>
          <p className="text-xs text-slate-500">
            Amazon: <strong>{amazonClicks}</strong> • Mercado Livre:{" "}
            <strong>{meliClicks}</strong>
          </p>
        </div>

        <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
            <Share2 className="h-4 w-4 text-[#DC2626]" />
            <span>Viralidade & Push & IA</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Cards 9:16 baixados: <strong>{metrics.analytics.storyShares}</strong>
          </p>
          <p className="text-xs text-slate-500">
            Push ativos: {metrics.participants.pushOptedIn} • IA Gemini:{" "}
            {metrics.ai.gemini} (fallback: {metrics.ai.fallback})
          </p>
        </div>
      </div>

      {/* Mode Breakdown */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
          <Sparkles className="h-4 w-4 text-[#15803D]" />
          <span>Salas por Modalidade</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {["SECRETO", "ONCA", "CHOCOLATE"].map((m) => {
            const count =
              metrics.rooms.byMode.find((x) => x.mode === m)?.count ?? 0;
            return (
              <div
                key={m}
                className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"
              >
                <span className="block text-xs font-bold text-slate-500">
                  {m}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7-day trend */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-extrabold text-slate-800 dark:text-slate-100">
          Últimos 7 dias
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800">
                <th className="py-2">Dia</th>
                <th className="py-2">Acessos</th>
                <th className="py-2">Salas</th>
                <th className="py-2">Entradas</th>
                <th className="py-2">Afiliados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.dailyTrend.map((row) => (
                <tr key={row.label}>
                  <td className="py-2 font-bold">{row.label}</td>
                  <td className="py-2">{row.views}</td>
                  <td className="py-2">{row.rooms}</td>
                  <td className="py-2">{row.joins}</td>
                  <td className="py-2">{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
