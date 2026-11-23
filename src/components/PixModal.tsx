"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, QrCode, X } from "lucide-react";
import { formatBrlFromCents } from "@/lib/types";

interface PixModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  subtitle: string;
  slug: string;
  productType: "CHAOS_MODE" | "VIP_CONSULTANT";
  adminToken?: string;
  participantToken?: string;
}

interface PixData {
  paymentId: string;
  provider: string;
  amountCents: number;
  pixCode: string;
  pixQrBase64: string | null;
}

export function PixModal({
  open,
  onClose,
  onSuccess,
  title,
  subtitle,
  slug,
  productType,
  adminToken,
  participantToken,
}: PixModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setCopied(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (adminToken) headers["x-admin-token"] = adminToken;
    if (participantToken) headers["x-participant-token"] = participantToken;

    fetch("/api/payments/pix", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug, productType }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao gerar PIX.");
        if (cancelled) return;
        if (json.alreadyUnlocked) {
          setPaid(true);
          onSuccess();
          return;
        }
        setPixData(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao gerar PIX.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, slug, productType, adminToken, participantToken, onSuccess]);

  useEffect(() => {
    if (!open || !pixData || paid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${pixData.paymentId}/status`);
        const json = await res.json();
        if (json.status === "PAID") {
          setPaid(true);
          clearInterval(interval);
          setTimeout(() => {
            onSuccess();
          }, 900);
        } else if (json.status === "EXPIRED") {
          setError("Este código PIX expirou. Feche e abra novamente.");
          clearInterval(interval);
        }
      } catch {
        // Ignore transient network errors during polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [open, pixData, paid, onSuccess]);

  const handleCopy = async () => {
    if (!pixData?.pixCode) return;
    try {
      await navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for Instagram/TikTok/WhatsApp in-app browsers
      if (codeInputRef.current) {
        codeInputRef.current.select();
        codeInputRef.current.setSelectionRange(0, 99999);
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  const handleMockConfirm = async () => {
    if (!pixData) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${pixData.paymentId}/status`, {
        method: "POST",
      });
      if (res.ok) {
        setPaid(true);
        setTimeout(() => {
          onSuccess();
        }, 700);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de PIX"
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && !pixData && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-600 dark:text-slate-300">
              <Loader2 className="h-10 w-10 animate-spin text-[#15803D] dark:text-emerald-400" />
              <p className="mt-3 font-medium">Gerando seu PIX instantâneo...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          )}

          {paid && (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-[#15803D] dark:text-emerald-400" />
              <p className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">
                PIX confirmado!
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Desbloqueando agora mesmo...
              </p>
            </div>
          )}

          {pixData && !paid && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-center text-lg font-extrabold text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-300">
                Valor: {formatBrlFromCents(pixData.amountCents)} (PIX único)
              </div>

              {pixData.pixQrBase64 ? (
                <img
                  src={pixData.pixQrBase64}
                  alt="QR Code PIX"
                  className="h-52 w-52 rounded-2xl border border-slate-200 bg-white p-2"
                />
              ) : (
                <div className="flex h-52 w-52 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                  <QrCode className="h-16 w-16 text-slate-400" />
                </div>
              )}

              <div className="w-full">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  PIX Copia e Cola
                </label>
                <textarea
                  ref={codeInputRef}
                  readOnly
                  rows={2}
                  value={pixData.pixCode}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#15803D] px-5 py-3 text-base font-bold text-white shadow-md transition hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Código PIX copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span>Copiar Código PIX</span>
                  </>
                )}
              </button>

              <p className="flex items-center gap-2 text-center text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando confirmação automática do banco...
              </p>

              {pixData.provider === "mock" && (
                <button
                  type="button"
                  onClick={handleMockConfirm}
                  disabled={loading}
                  className="min-h-12 w-full rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
                >
                  ⚡ Simular Pagamento PIX (Modo Teste)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
