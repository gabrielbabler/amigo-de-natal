"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Shuffle,
  Flame,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  readLocalGroups,
  removeLocalGroup,
  upsertLocalGroup,
} from "@/lib/localHistory";
import { formatBrlFromCents, MODE_CONFIG, type GroupMode } from "@/lib/types";

interface AdminState {
  group: {
    id: string;
    slug: string;
    name: string;
    mode: GroupMode;
    budgetCents: number;
    revealDate: string;
    chaosUnlocked: boolean;
    drawCompleted: boolean;
    adminToken: string;
  };
  participants: Array<{
    id: string;
    name: string;
    maskedPhone: string;
    tags: string[];
    isOrganizer: boolean;
    isParticipating: boolean;
    hasPin: boolean;
    vipUnlocked: boolean;
    revealedAt: string | null;
  }>;
  exclusions: Array<{
    id: string;
    giverId: string;
    excludedReceiverId: string;
  }>;
}

export function AdminClient({
  slug,
  queryToken,
}: {
  slug: string;
  queryToken?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<AdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Exclusions form
  const [giverId, setGiverId] = useState("");
  const [excludedId, setExcludedId] = useState("");

  // Clean ?token= from URL immediately so screenshots don't leak it
  useEffect(() => {
    if (queryToken) {
      upsertLocalGroup({
        slug,
        name: slug,
        mode: "SECRETO",
        role: "admin",
        adminToken: queryToken,
      });
      window.history.replaceState({}, "", `/sala/${slug}/admin`);
    }
  }, [queryToken, slug]);

  const getAdminToken = useCallback(() => {
    if (queryToken) return queryToken;
    return readLocalGroups().find((g) => g.slug === slug)?.adminToken;
  }, [queryToken, slug]);

  const fetchAdmin = useCallback(async () => {
    setError(null);
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers["x-admin-token"] = token;

      const res = await fetch(
        `/api/rooms/${slug}/admin${queryToken ? `?token=${encodeURIComponent(queryToken)}` : ""}`,
        { headers }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Acesso não autorizado.");
      }
      setData(json);
      upsertLocalGroup({
        slug: json.group.slug,
        name: json.group.name,
        mode: json.group.mode,
        role: "admin",
        adminToken: json.group.adminToken,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar painel."
      );
    } finally {
      setLoading(false);
    }
  }, [slug, queryToken, getAdminToken]);

  useEffect(() => {
    void fetchAdmin();
  }, [fetchAdmin]);

  const runAdminAction = async (payload: Record<string, unknown>) => {
    setActionError(null);
    setBusy(true);
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["x-admin-token"] = token;

      const res = await fetch(`/api/rooms/${slug}/admin`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha na operação.");
      await fetchAdmin();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao executar ação."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDraw = async () => {
    setActionError(null);
    setBusy(true);
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers["x-admin-token"] = token;

      const res = await fetch(`/api/rooms/${slug}/draw`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao realizar sorteio.");
      await fetchAdmin();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Erro ao realizar sorteio."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !window.confirm(
        "Tem certeza que deseja apagar este grupo e todos os dados permanentemente?"
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const token = getAdminToken();
      const headers: Record<string, string> = {};
      if (token) headers["x-admin-token"] = token;
      const res = await fetch(`/api/rooms/${slug}/admin`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        removeLocalGroup(slug);
        router.push("/");
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-[#15803D] dark:text-emerald-400" />
        <p className="mt-3 font-medium">Carregando painel do organizador...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 rounded-3xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/50">
        <p className="text-lg font-extrabold text-red-800 dark:text-red-200">
          {error ?? "Acesso não autorizado."}
        </p>
        <p className="text-sm text-red-700 dark:text-red-300">
          Se você trocou de navegador, recupere seu acesso usando WhatsApp + PIN.
        </p>
        <Link
          href="/meus-grupos"
          className="inline-flex min-h-12 items-center rounded-2xl bg-[#15803D] px-6 font-bold text-white"
        >
          Recuperar em Meus Grupos
        </Link>
      </div>
    );
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://amigodenatal.com.br";
  const inviteUrl = `${origin}/sala/${data.group.slug}`;
  const adminRecoveryUrl = `${origin}/sala/${data.group.slug}/admin?token=${data.group.adminToken}`;
  const mode = MODE_CONFIG[data.group.mode] ?? MODE_CONFIG.SECRETO;

  const activeParticipants = data.participants.filter((p) => p.isParticipating);
  const organizer = data.participants.find((p) => p.isOrganizer);
  const revealedCount = activeParticipants.filter((p) => p.revealedAt).length;

  const whatsappInviteLink = `https://wa.me/?text=${encodeURIComponent(
    `${mode.emoji} Bora participar do *${data.group.name}* (${mode.title})!\nValor sugerido: ${formatBrlFromCents(data.group.budgetCents)}\nEntre em 10 segundos sem cadastro: ${inviteUrl}`
  )}`;

  const whatsappAdminBackupLink = `https://wa.me/?text=${encodeURIComponent(
    `🔐 Meu link secreto de Organizador (${data.group.name}): ${adminRecoveryUrl}`
  )}`;

  const whatsappDrawBroadcastLink = `https://wa.me/?text=${encodeURIComponent(
    `🎄 O sorteio do *${data.group.name}* acabou de acontecer!\nDescubra quem você tirou aqui: ${inviteUrl}`
  )}`;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-[#15803D] dark:bg-emerald-950 dark:text-emerald-300">
              Painel do Organizador • {mode.title}
            </span>
            <h1 className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
              {mode.emoji} {data.group.name}
            </h1>
          </div>
          {organizer?.isParticipating && (
            <Link
              href={`/sala/${slug}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100"
            >
              Ver minha sala
            </Link>
          )}
        </div>

        {/* Invite Actions */}
        <div className="space-y-2.5">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Convide a galera para entrar:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(inviteUrl);
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 2500);
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-extrabold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {copiedInvite ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
                  <span>Link copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Link de Convite</span>
                </>
              )}
            </button>

            <a
              href={whatsappInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#15803D] px-4 text-sm font-extrabold text-white dark:bg-emerald-500 dark:text-slate-950"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Enviar no WhatsApp</span>
            </a>
          </div>

          <a
            href={whatsappAdminBackupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Salvar meu link secreto de Admin no meu WhatsApp</span>
          </a>
        </div>

        {/* Organizer participation toggle */}
        {organizer && !data.group.drawCompleted && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {organizer.isParticipating
                ? "Você está participando do sorteio."
                : "Você está apenas organizando (fora do sorteio)."}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runAdminAction({
                  action: "toggle_organizer_participating",
                  isParticipating: !organizer.isParticipating,
                })
              }
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {organizer.isParticipating ? (
                <>
                  <UserMinus className="h-3.5 w-3.5 text-[#DC2626]" />
                  <span>Sair do sorteio</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5 text-[#15803D]" />
                  <span>Participar também</span>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
          {actionError}
        </div>
      )}

      {/* Draw Trigger / Post-Draw Broadcast */}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!data.group.drawCompleted ? (
          <>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Realizar Sorteio ({activeParticipants.length} participantes)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              São necessários pelo menos 3 participantes ativos. Após sortear, a
              sala fecha para novos cadastros.
            </p>
            <button
              type="button"
              disabled={busy || activeParticipants.length < 3}
              onClick={handleDraw}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-lg font-extrabold text-white shadow-lg transition hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Shuffle className="h-5 w-5" />
                  <span>Sortear Agora!</span>
                </>
              )}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#15803D] dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="text-lg font-black">
                Sorteio realizado! ({revealedCount} de{" "}
                {activeParticipants.length} já abriram)
              </h2>
            </div>
            <a
              href={whatsappDrawBroadcastLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#15803D] px-6 text-base font-extrabold text-white shadow-md dark:bg-emerald-500 dark:text-slate-950"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Avisar no Grupo do WhatsApp</span>
            </a>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Atenção: refazer o sorteio apaga todos os pares já sorteados. Continuar?"
                  )
                ) {
                  void runAdminAction({ action: "reset_draw" });
                }
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refazer sorteio</span>
            </button>
          </div>
        )}
      </section>

      {/* Modo Caos & Exclusions (100% Free) */}
      <section className="space-y-4 rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/60 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#DC2626] dark:text-red-400">
            <Flame className="h-5 w-5" />
            <h2 className="text-lg font-black">Regras Anti-Casal & Modo Caos</h2>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-[#15803D] dark:bg-emerald-950 dark:text-emerald-300">
            Grátis
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Restrições anti-casal (quem não pode tirar quem):
          </p>

          {!data.group.drawCompleted && activeParticipants.length >= 2 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={giverId}
                onChange={(e) => setGiverId(e.target.value)}
                className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Quem...</option>
                {activeParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={excludedId}
                onChange={(e) => setExcludedId(e.target.value)}
                className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Não pode tirar...</option>
                {activeParticipants
                  .filter((p) => p.id !== giverId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={busy || !giverId || !excludedId}
                onClick={() =>
                  void runAdminAction({
                    action: "add_exclusion",
                    giverId,
                    excludedReceiverId: excludedId,
                  })
                }
                className="inline-flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#15803D] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Bloquear</span>
              </button>
            </div>
          )}

          {data.exclusions.length > 0 && (
            <div className="space-y-2">
              {data.exclusions.map((ex) => {
                const gName =
                  data.participants.find((p) => p.id === ex.giverId)?.name ??
                  "?";
                const rName =
                  data.participants.find(
                    (p) => p.id === ex.excludedReceiverId
                  )?.name ?? "?";
                return (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"
                  >
                    <span>
                      <strong>{gName}</strong> não tira{" "}
                      <strong>{rName}</strong>
                    </span>
                    {!data.group.drawCompleted && (
                      <button
                        type="button"
                        onClick={() =>
                          void runAdminAction({
                            action: "remove_exclusion",
                            exclusionId: ex.id,
                          })
                        }
                        className="min-h-10 px-2 text-xs font-bold text-[#DC2626]"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Participant Management */}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Gerenciar Participantes ({data.participants.length})
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.participants.map((p) => (
            <div key={p.id} className="space-y-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {p.name}{" "}
                    {!p.isParticipating && (
                      <span className="text-xs text-slate-400">
                        (Só organizando)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {p.maskedPhone} •{" "}
                    {p.hasPin ? "PIN ativo" : "PIN resetado (pode criar novo)"}
                  </p>
                </div>

                {data.group.drawCompleted && p.isParticipating && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      p.revealedAt
                        ? "bg-emerald-100 text-[#15803D] dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {p.revealedAt ? "Já abriu" : "Não abriu"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {data.group.drawCompleted &&
                  p.isParticipating &&
                  !p.revealedAt && (
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Oi ${p.name}! 🎄 O sorteio do ${data.group.name} já saiu! Veja quem você tirou: ${inviteUrl}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Lembrar no WhatsApp</span>
                    </a>
                  )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAdminAction({
                      action: "reset_pin",
                      participantId: p.id,
                    })
                  }
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Resetar PIN</span>
                </button>

                {!data.group.drawCompleted && !p.isOrganizer && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void runAdminAction({
                        action: "remove_participant",
                        participantId: p.id,
                      })
                    }
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-red-200 px-3 text-xs font-bold text-[#DC2626] dark:border-red-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone: Delete Group */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          disabled={busy}
          onClick={handleDeleteGroup}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-300 text-sm font-extrabold text-[#DC2626] hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
        >
          <Trash2 className="h-4 w-4" />
          <span>Apagar grupo e dados agora</span>
        </button>
      </section>
    </div>
  );
}
