"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, ShieldCheck } from "lucide-react";
import { ValidationModal } from "@/components/ValidationModal";
import { formatBrPhoneInput, normalizeBrPhone } from "@/lib/phone";
import { MODE_CONFIG, type GroupMode } from "@/lib/types";

interface FoundGroup {
  groupId: string;
  slug: string;
  name: string;
  mode: GroupMode;
  revealDate: string;
  drawCompleted: boolean;
  isOrganizer: boolean;
  isParticipating: boolean;
  participantName: string;
}

export default function MeusGruposPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [groups, setGroups] = useState<FoundGroup[] | null>(null);

  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contato@gbabler.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
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

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/my-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Nenhum grupo encontrado.");
      }
      setGroups(json.groups);
    } catch (err) {
      setGroups(null);
      setError(err instanceof Error ? err.message : "Erro ao buscar grupos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Recuperar meus grupos
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Trocou de celular ou abriu fora do WhatsApp? Digite seu WhatsApp e o
          PIN de 4 dígitos para acessar seus sorteios e painéis de organizador.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
            WhatsApp cadastrado (com DDD)
          </label>
          <input
            required
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatBrPhoneInput(e.target.value))}
            placeholder="(11) 98765-4321"
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
            Seu PIN de 4 dígitos
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
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base tracking-widest text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#15803D] px-5 text-base font-extrabold text-white transition hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-950"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Buscando...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Buscar meus grupos</span>
            </>
          )}
        </button>
      </form>

      {groups && groups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Grupos encontrados ({groups.length})
          </h2>
          {groups.map((g) => {
            const mode = MODE_CONFIG[g.mode] ?? MODE_CONFIG.SECRETO;
            return (
              <div
                key={g.groupId}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{mode.emoji}</span>
                    <div>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {g.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {mode.title} •{" "}
                        {g.drawCompleted
                          ? "Sorteio realizado!"
                          : "Aguardando sorteio"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {g.isOrganizer && (
                    <Link
                      href={`/sala/${g.slug}/admin`}
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-[#15803D] px-4 text-sm font-extrabold text-[#15803D] dark:border-emerald-400 dark:text-emerald-400"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Painel do Organizador</span>
                    </Link>
                  )}
                  {g.isParticipating && (
                    <Link
                      href={`/sala/${g.slug}`}
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#15803D] px-4 text-sm font-extrabold text-white dark:bg-emerald-500 dark:text-slate-950"
                    >
                      <span>Abrir minha sala</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <p className="font-bold text-slate-800 dark:text-slate-100">
          Esqueceu seu PIN?
        </p>
        <p className="mt-1">
          • <strong>Participante:</strong> peça ao organizador do grupo para
          clicar em &quot;Resetar PIN&quot; no painel dele.
        </p>
        <p className="mt-1">
          • <strong>Organizador:</strong> se você salvou o link de Admin no seu
          WhatsApp, abra por lá. Se perdeu o link e o PIN, fale com o suporte em{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-bold underline underline-offset-2"
          >
            {supportEmail}
          </a>{" "}
          ou crie um novo grupo em 15 segundos.
        </p>
      </div>

      <ValidationModal
        open={validationErrors.length > 0}
        onClose={() => setValidationErrors([])}
        items={validationErrors}
      />
    </div>
  );
}
