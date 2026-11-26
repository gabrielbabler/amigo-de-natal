"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Download,
  ExternalLink,
  Flame,
  Gift,
  Loader2,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { GiftUnwrapBox } from "./GiftUnwrapBox";
import { ValidationModal } from "./ValidationModal";
import { readLocalGroups, upsertLocalGroup } from "@/lib/localHistory";
import { formatBrPhoneInput, normalizeBrPhone } from "@/lib/phone";
import {
  formatBrlFromCents,
  MODE_CONFIG,
  type ChaosRevealPayload,
  type GroupMode,
} from "@/lib/types";

interface RoomState {
  group: {
    id: string;
    slug: string;
    name: string;
    mode: GroupMode;
    budgetCents: number;
    revealDate: string;
    chaosUnlocked: boolean;
    drawCompleted: boolean;
  };
  participants: Array<{
    id: string;
    name: string;
    tags: string[];
    isOrganizer: boolean;
    hasRevealed: boolean;
  }>;
  currentParticipant: {
    id: string;
    name: string;
    tags: string[];
    isOrganizer: boolean;
    isParticipating: boolean;
    vipUnlocked: boolean;
    revealedAt: string | null;
    hasPushSubscription: boolean;
  } | null;
}

interface RevealData {
  receiver: {
    id: string;
    name: string;
    tags: string[];
  };
  freeShopLinks: Array<{
    label: string;
    amazonUrl: string;
    meliUrl: string;
  }>;
  chaosUnlocked: boolean;
  chaos: ChaosRevealPayload | null;
}

export function RoomClient({ slug }: { slug: string }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localToken, setLocalToken] = useState<string | undefined>(undefined);

  // Onboarding / Recovery form state
  const [authTab, setAuthTab] = useState<"join" | "recover">("join");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [similarWarning, setSimilarWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Reveal state
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  const [unwrapped, setUnwrapped] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    const entry = readLocalGroups().find((g) => g.slug === slug);
    if (entry?.participantToken) {
      setLocalToken(entry.participantToken);
    }
  }, [slug]);

  const fetchRoom = useCallback(async () => {
    try {
      const entry = readLocalGroups().find((g) => g.slug === slug);
      const token = localToken ?? entry?.participantToken;
      const headers: Record<string, string> = {};
      if (token) headers["x-participant-token"] = token;

      const res = await fetch(`/api/rooms/${slug}`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Sala não encontrada.");
      setRoom(json);
      if (json.currentParticipant) {
        setPushEnabled(json.currentParticipant.hasPushSubscription);
        upsertLocalGroup({
          slug: json.group.slug,
          name: json.group.name,
          mode: json.group.mode,
          role: json.currentParticipant.isOrganizer ? "admin" : "participant",
          participantName: json.currentParticipant.name,
          participantToken: token,
        });
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Erro ao carregar sala."
      );
    } finally {
      setLoading(false);
    }
  }, [slug, localToken]);

  useEffect(() => {
    void fetchRoom();
  }, [fetchRoom]);

  const fetchReveal = useCallback(async () => {
    if (!room?.group.drawCompleted || !room.currentParticipant?.isParticipating) {
      return;
    }
    setLoadingReveal(true);
    try {
      const headers: Record<string, string> = {};
      if (localToken) headers["x-participant-token"] = localToken;
      const res = await fetch(`/api/rooms/${slug}/reveal`, { headers });
      if (res.ok) {
        const json = (await res.json()) as RevealData;
        setReveal(json);
      }
    } finally {
      setLoadingReveal(false);
    }
  }, [room?.group.drawCompleted, room?.currentParticipant?.isParticipating, slug, localToken]);

  useEffect(() => {
    void fetchReveal();
  }, [fetchReveal]);

  const submitAuth = async (confirmSimilarName = false) => {
    const missing: string[] = [];
    if (authTab === "join" && name.trim().length < 2) {
      missing.push("Seu nome ou apelido (mínimo 2 letras).");
    }
    if (!normalizeBrPhone(phone)) {
      missing.push("Seu WhatsApp com DDD válido (ex: 11 99999-9999).");
    }
    if (!/^\d{4}$/.test(pin)) {
      missing.push("Seu PIN com exatamente 4 dígitos numéricos.");
    }
    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: authTab,
          name: authTab === "join" ? name : undefined,
          phone,
          pin,
          tags: authTab === "join" ? selectedTags : [],
          confirmSimilarName,
        }),
      });
      const json = await res.json();

      if (res.status === 409 && json.code === "PHONE_EXISTS") {
        setAuthTab("recover");
        setPin("");
        setFormError(json.error);
        return;
      }

      if (res.status === 409 && json.code === "SIMILAR_NAME_WARNING") {
        setSimilarWarning(json.error);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error ?? "Erro ao entrar no grupo.");
      }

      setSimilarWarning(null);
      setLocalToken(json.participant.participantToken);
      if (room) {
        upsertLocalGroup({
          slug: room.group.slug,
          name: room.group.name,
          mode: room.group.mode,
          role: "participant",
          participantName: json.participant.name,
          participantToken: json.participant.participantToken,
        });
      }
      await fetchRoom();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnablePush = async () => {
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublic || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublic,
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (localToken) headers["x-participant-token"] = localToken;
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ slug, subscription: sub.toJSON() }),
      });
      setPushEnabled(true);
    } catch {
      // User denied permission or unsupported browser
    }
  };

  const trackEvent = (
    eventType: "AFFILIATE_CLICK" | "STORY_CARD_SHARE",
    provider?: "amazon" | "mercadolivre"
  ) => {
    const payload = JSON.stringify({
      eventType,
      provider,
      groupId: room?.group.id,
      path: `/sala/${slug}`,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/track",
        new Blob([payload], { type: "application/json" })
      );
    } else {
      void fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  };

  const handleShareStory = async () => {
    trackEvent("STORY_CARD_SHARE");
    const cardUrl = `/api/rooms/${slug}/story-card`;
    try {
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], `amigo-de-natal-${slug}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Já tirei o meu no Amigo de Natal!",
        });
        return;
      }
    } catch {
      // Fallback to direct download
    }
    const a = document.createElement("a");
    a.href = cardUrl;
    a.download = `amigo-de-natal-${slug}.png`;
    a.click();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#15803D] dark:text-emerald-400" />
        <p className="mt-3 text-base font-medium text-slate-600 dark:text-slate-300">
          Carregando sala...
        </p>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div className="space-y-4 rounded-3xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/50">
        <p className="text-lg font-extrabold text-red-800 dark:text-red-200">
          {loadError ?? "Sala não encontrada."}
        </p>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-2xl bg-[#15803D] px-6 font-bold text-white"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  const mode = MODE_CONFIG[room.group.mode] ?? MODE_CONFIG.SECRETO;
  const dateFormatted = room.group.revealDate.split("-").reverse().join("/");

  return (
    <div className="space-y-6">
      {/* Group Banner */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{mode.emoji}</span>
            <div>
              <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-[#15803D] dark:bg-emerald-950 dark:text-emerald-300">
                {mode.title}
              </span>
              <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                {room.group.name}
              </h1>
            </div>
          </div>
          {room.currentParticipant?.isOrganizer && (
            <Link
              href={`/sala/${slug}/admin`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-[#15803D] dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Valor sugerido
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {formatBrlFromCents(room.group.budgetCents)}
            </span>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Revelação
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {dateFormatted}
            </span>
          </div>
        </div>
      </section>

      {/* Case 1: Not yet identified in this browser */}
      {!room.currentParticipant && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthTab("join");
                setFormError(null);
              }}
              className={`min-h-11 rounded-xl text-sm font-extrabold transition ${
                authTab === "join"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Entrar no grupo
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab("recover");
                setFormError(null);
              }}
              className={`min-h-11 rounded-xl text-sm font-extrabold transition ${
                authTab === "recover"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Já entrei antes
            </button>
          </div>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submitAuth(false);
            }}
            className="space-y-4"
          >
            {authTab === "join" && (
              <div>
                <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                  Seu nome ou apelido
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Primo Lucas"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                  WhatsApp (com DDD)
                </label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatBrPhoneInput(e.target.value))}
                  placeholder="(11) 98765-4321"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                  {authTab === "join"
                    ? "Crie um PIN (4 dígitos)"
                    : "Seu PIN (4 dígitos)"}
                </label>
                <input
                  required
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base tracking-widest text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {authTab === "join" && (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
                  {mode.tagPromptTitle} (até 3)
                </label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set([...mode.suggestedTags, ...selectedTags])
                  ).map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`min-h-10 rounded-full px-3.5 text-sm font-semibold transition ${
                          active
                            ? "bg-[#15803D] text-white dark:bg-emerald-500 dark:text-slate-950"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const clean = customTag.trim();
                        if (clean && selectedTags.length < 3) {
                          setSelectedTags((p) =>
                            p.includes(clean) ? p : [...p, clean]
                          );
                          setCustomTag("");
                        }
                      }
                    }}
                    placeholder={mode.tagPlaceholder}
                    className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = customTag.trim();
                      if (clean && selectedTags.length < 3) {
                        setSelectedTags((p) =>
                          p.includes(clean) ? p : [...p, clean]
                        );
                        setCustomTag("");
                      }
                    }}
                    className="min-h-12 rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-800 dark:bg-slate-700 dark:text-white"
                  >
                    + Tag
                  </button>
                </div>
              </div>
            )}

            {similarWarning && (
              <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <p className="font-semibold">{similarWarning}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimilarWarning(null);
                      setAuthTab("recover");
                    }}
                    className="min-h-11 rounded-xl bg-amber-600 px-4 font-bold text-white"
                  >
                    Recuperar meu acesso
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitAuth(true)}
                    className="min-h-11 rounded-xl border border-amber-600 px-4 font-bold"
                  >
                    Sou outra pessoa mesmo
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#15803D] px-6 text-lg font-extrabold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-950"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : authTab === "join" ? (
                "Confirmar Participação"
              ) : (
                "Acessar meu Sorteio"
              )}
            </button>
          </form>
        </section>
      )}

      {/* Case 2: Organizer chose not to participate */}
      {room.currentParticipant && !room.currentParticipant.isParticipating && (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            Você está apenas organizando este grupo.
          </p>
          <Link
            href={`/sala/${slug}/admin`}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#15803D] px-6 font-bold text-white dark:bg-emerald-500 dark:text-slate-950"
          >
            <ShieldCheck className="h-5 w-5" />
            <span>Ir para o Painel do Organizador</span>
          </Link>
        </section>
      )}

      {/* Case 3: Joined & Waiting for Draw */}
      {room.currentParticipant?.isParticipating && !room.group.drawCompleted && (
        <section className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-[#15803D] dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Tudo certo, {room.currentParticipant.name}!
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Aguardando o organizador realizar o sorteio.
              </p>
            </div>
          </div>

          {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !pushEnabled && (
            <button
              type="button"
              onClick={handleEnablePush}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-bold text-[#15803D] dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
            >
              <Bell className="h-4 w-4" />
              <span>Avise-me neste celular quando sortear</span>
            </button>
          )}
        </section>
      )}

      {/* Case 4: Draw Completed -> Private Reveal */}
      {room.currentParticipant?.isParticipating && room.group.drawCompleted && (
        <section className="space-y-5">
          {loadingReveal && (
            <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <Loader2 className="h-10 w-10 animate-spin text-[#15803D] dark:text-emerald-400" />
              <p className="mt-3 font-bold">Preparando sua revelação...</p>
            </div>
          )}

          {reveal && !unwrapped && (
            <GiftUnwrapBox onUnwrap={() => setUnwrapped(true)} />
          )}

          {reveal && unwrapped && (
            <>
              <div className="animate-gentle-rise space-y-4 rounded-3xl border-2 border-[#00652c] bg-white p-6 text-center shadow-lg dark:border-emerald-500 dark:bg-slate-900">
                <p className="text-sm font-extrabold uppercase tracking-wider text-[#15803D] dark:text-emerald-400">
                  🤫 Segredo absoluto — Você tirou:
                </p>
                <div className="rounded-2xl bg-emerald-50 py-5 px-4 dark:bg-emerald-950/60">
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {reveal.receiver.name}
                  </p>
                </div>

                {reveal.receiver.tags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Dicas e gostos dessa pessoa:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {reveal.receiver.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleShareStory}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-base font-extrabold text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <Share2 className="h-5 w-5 text-[#DC2626] dark:text-red-400" />
                  <span>Baixar Card 9:16 para Stories / Status</span>
                  <Download className="h-4 w-4" />
                </button>
              </div>

              {/* Modo Caos IA Content */}
              {reveal.chaosUnlocked && reveal.chaos && (
                <div className="space-y-4 rounded-3xl border border-red-200 bg-red-50/70 p-5 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="flex items-center gap-2 text-[#DC2626] dark:text-red-400">
                    <Flame className="h-5 w-5" />
                    <h2 className="text-lg font-black">Modo Caos IA</h2>
                  </div>

                  <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                    {reveal.chaos.roast}
                  </p>

                  <div className="space-y-2 rounded-2xl bg-white/80 p-4 dark:bg-slate-900/70">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Pistas misteriosas para a hora da festa:
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                      {reveal.chaos.clues.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                      🎭 Sua prenda secreta:
                    </p>
                    <p className="mt-1 text-sm font-bold text-amber-950 dark:text-amber-100">
                      {reveal.chaos.forfeit}
                    </p>
                  </div>
                </div>
              )}

              {/* Free Affiliate Gift Search Links (Available to everyone) */}
              {reveal.freeShopLinks?.length > 0 && (
                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                      <Gift className="h-5 w-5 text-[#15803D] dark:text-emerald-400" />
                      <span>Encontre o presente agora</span>
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-300">
                      Grátis
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Buscas rápidas baseadas nos gostos de{" "}
                    <strong>{reveal.receiver.name}</strong> (orçamento{" "}
                    {formatBrlFromCents(room.group.budgetCents)}):
                  </p>
                  <div className="space-y-2.5">
                    {reveal.freeShopLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60"
                      >
                        <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                          {link.label}
                        </p>
                        <a
                          href={link.amazonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent("AFFILIATE_CLICK", "amazon")}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-slate-700"
                        >
                          <span>Ver opções na Amazon</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Participant List */}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <Users className="h-5 w-5 text-[#15803D] dark:text-emerald-400" />
            <span>Participantes ({room.participants.length})</span>
          </h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {room.participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {p.name}{" "}
                  {p.isOrganizer && (
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Organizador
                    </span>
                  )}
                </p>
                {p.tags.length > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.tags.join(" • ")}
                  </p>
                )}
              </div>
              {room.group.drawCompleted && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    p.hasRevealed
                      ? "bg-emerald-100 text-[#15803D] dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {p.hasRevealed ? "Já abriu" : "Aguardando"}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <ValidationModal
        open={validationErrors.length > 0}
        onClose={() => setValidationErrors([])}
        items={validationErrors}
      />
    </div>
  );
}
