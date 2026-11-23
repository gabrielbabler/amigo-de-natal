"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: string[];
}

export function ValidationModal({
  open,
  onClose,
  title = "Faltam alguns dados obrigatórios",
  items,
}: ValidationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-800/70 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aviso"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Confira os campos abaixo antes de continuar:
        </p>

        <ul className="mt-3 space-y-2 rounded-2xl bg-amber-50/80 p-4 text-sm font-semibold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#15803D] px-5 text-base font-extrabold text-white shadow-sm transition hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950"
        >
          Entendi, preencher agora
        </button>
      </div>
    </div>,
    document.body
  );
}
