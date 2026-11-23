"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Gift, Loader2, X } from "lucide-react";
import { ValidationModal } from "./ValidationModal";
import { upsertLocalGroup } from "@/lib/localHistory";
import { formatBrPhoneInput, normalizeBrPhone } from "@/lib/phone";
import { MODE_CONFIG, type GroupMode } from "@/lib/types";

const MODES: GroupMode[] = ["SECRETO", "ONCA", "CHOCOLATE"];

export function HeroModeCards() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<GroupMode | null>(null);
  const [groupName, setGroupName] = useState("");
  const [budgetReais, setBudgetReais] = useState(80);
  const [revealDate, setRevealDate] = useState("2026-12-25");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [organizerPin, setOrganizerPin] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedMode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedMode]);

  const openCreator = (mode: GroupMode) => {
    setSelectedMode(mode);
    setBudgetReais(MODE_CONFIG[mode].defaultBudgetReais);
    setSelectedTags([]);
    setError(null);
    setValidationErrors([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  };

  const addCustomTag = () => {
    const clean = customTag.trim();
    if (!clean || selectedTags.length >= 3) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
    }
    setCustomTag("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMode) return;

    const missing: string[] = [];
    if (groupName.trim().length < 2) {
      missing.push("Nome do grupo (mínimo 2 letras).");
    }
    if (!budgetReais || Number(budgetReais) < 10) {
      missing.push("Valor sugerido do presente (mínimo R$ 10).");
    }
    if (!revealDate) {
      missing.push("Data da revelação.");
    }
    if (organizerName.trim().length < 2) {
      missing.push("Seu nome ou apelido.");
    }
    if (!normalizeBrPhone(organizerPhone)) {
      missing.push("Seu WhatsApp com DDD válido (ex: 11 99999-9999).");
    }
    if (!/^\d{4}$/.test(organizerPin)) {
      missing.push("PIN de recuperação com exatamente 4 dígitos.");
    }

    if (missing.length > 0) {
      setValidationErrors(missing);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          mode: selectedMode,
          budgetReais: Number(budgetReais),
          revealDate,
          organizerName,
          organizerPhone,
          organizerPin,
          organizerTags: selectedTags,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Não foi possível criar a sala.");
      }

      upsertLocalGroup({
        slug: json.group.slug,
        name: json.group.name,
        mode: json.group.mode,
        role: "admin",
        participantName: organizerName.trim(),
        adminToken: json.adminToken,
        participantToken: json.participantToken,
      });

      router.push(`/sala/${json.group.slug}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar sala.");
      setSubmitting(false);
    }
  };

  const modeInfo = selectedMode ? MODE_CONFIG[selectedMode] : null;

  return (
    <section className="space-y-6">
      <div className="space-y-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e2e7ff] px-4 py-1.5 text-sm font-bold text-[#00652c] shadow-xs dark:bg-slate-800 dark:text-emerald-300">
          <Gift className="h-4 w-4 text-[#00652c] dark:text-emerald-400" />
          100% Grátis • Sem anúncios • Sem baixar app
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#131b2e] sm:text-4xl dark:text-white">
          O sorteio de{" "}
          <span className="text-[#bb0112] dark:text-red-400">Natal</span>{" "}
          <span className="text-[#00652c] dark:text-emerald-400">
            sem dor de cabeça.
          </span>
        </h1>
        <p className="mx-auto max-w-md text-base text-[#3f493f] dark:text-slate-300">
          Crie o grupo em 15 segundos, mande o link no WhatsApp e faça o sorteio
          de graça com toda a família.
        </p>
      </div>

      {/* 3 Quick-start Hero Cards */}
      <div className="grid grid-cols-1 gap-4">
        {MODES.map((modeKey, idx) => {
          const mode = MODE_CONFIG[modeKey];
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => openCreator(mode.id)}
              style={{ animationDelay: `${idx * 90}ms` }}
              className="animate-gentle-rise group flex min-h-24 w-full items-center justify-between gap-4 rounded-2xl border border-[#becabc]/40 bg-white p-5 text-left shadow-[0_2px_12px_rgba(19,27,46,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00652c] hover:shadow-lg active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-400"
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f2f3ff] text-3xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 dark:bg-emerald-950/60"
                >
                  {mode.emoji}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-[#131b2e] dark:text-white">
                      {mode.title}
                    </h2>
                    <span className="rounded-full bg-[#d3ffd5] px-2.5 py-0.5 text-xs font-bold text-[#005323] dark:bg-emerald-950 dark:text-emerald-300">
                      {mode.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-base text-[#3f493f] dark:text-slate-300">
                    {mode.subtitle}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-6 w-6 shrink-0 text-[#6f7a6e] transition group-hover:translate-x-1 group-hover:text-[#00652c] dark:group-hover:text-emerald-400" />
            </button>
          );
        })}
      </div>

      {/* Instant Room Creation Modal rendered via Portal at top of viewport */}
      {mounted &&
        selectedMode &&
        modeInfo &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          >
            <div className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{modeInfo.emoji}</span>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      Criar {modeInfo.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Grátis • Você já entra como organizador(a)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMode(null)}
                  aria-label="Fechar formulário"
                  className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div
                ref={modalBodyRef}
                className="flex-1 overflow-y-auto px-5 py-4 sm:px-6"
              >
                <form noValidate onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm font-extrabold uppercase tracking-wide text-[#15803D] dark:text-emerald-400">
                      1. Dados do Grupo
                    </p>

                    <div>
                      <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                        Nome do grupo
                      </label>
                      <input
                        required
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Ex: Família Silva 2026"
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                          Valor (R$)
                        </label>
                        <input
                          required
                          type="number"
                          min={10}
                          max={5000}
                          value={budgetReais}
                          onChange={(e) => setBudgetReais(Number(e.target.value))}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                          Revelação
                        </label>
                        <input
                          required
                          type="date"
                          value={revealDate}
                          onChange={(e) => setRevealDate(e.target.value)}
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm font-extrabold uppercase tracking-wide text-[#DC2626] dark:text-red-400">
                      2. Seus Dados (Organizador)
                    </p>

                    <div>
                      <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                        Seu nome ou apelido
                      </label>
                      <input
                        required
                        type="text"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        placeholder="Ex: Tia Maria / Gabriel"
                        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                          WhatsApp (com DDD)
                        </label>
                        <input
                          required
                          type="tel"
                          inputMode="tel"
                          value={organizerPhone}
                          onChange={(e) =>
                            setOrganizerPhone(formatBrPhoneInput(e.target.value))
                          }
                          placeholder="(11) 98765-4321"
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-base font-bold text-slate-800 dark:text-slate-200">
                          PIN de 4 dígitos
                        </label>
                        <input
                          required
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          pattern="\d{4}"
                          value={organizerPin}
                          onChange={(e) =>
                            setOrganizerPin(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="Ex: 1234"
                          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base tracking-widest text-slate-900 focus:border-[#15803D] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dica: use o mesmo PIN se participar de mais de um grupo para
                      recuperar todos juntos em &quot;Meus Grupos&quot;.
                    </p>

                    <div>
                      <label className="mb-1.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
                        {modeInfo.tagPromptTitle} (até 3 — opcional)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          new Set([
                            ...modeInfo.suggestedTags.slice(0, 6),
                            ...selectedTags,
                          ])
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
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
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
                              addCustomTag();
                            }
                          }}
                          placeholder="Ou digite uma tag..."
                          className="min-h-12 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={addCustomTag}
                          className="min-h-12 rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-800 dark:bg-slate-700 dark:text-white"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#15803D] px-6 text-lg font-extrabold text-white shadow-lg transition hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Criando sala...</span>
                      </>
                    ) : (
                      <span>Criar Sala e Pegar Link</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ValidationModal
        open={validationErrors.length > 0}
        onClose={() => setValidationErrors([])}
        items={validationErrors}
      />
    </section>
  );
}
