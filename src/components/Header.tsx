"use client";

import Link from "next/link";
import { Moon, Sun, Users } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#FAFAFA]/95 backdrop-blur dark:border-slate-800 dark:bg-[#0F172A]/95">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex min-h-12 items-center gap-2 text-lg font-extrabold tracking-tight text-[#15803D] dark:text-emerald-400"
        >
          <span aria-hidden="true" className="animate-tree-sway text-2xl">
            🎄
          </span>
          <span>
            Amigo de{" "}
            <span className="text-[#DC2626] dark:text-red-400">Natal</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/meus-grupos"
            className="inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Users className="h-4 w-4 shrink-0 text-[#15803D] dark:text-emerald-400" />
            <span>Meus Grupos</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"
            }
            className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5 text-amber-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
