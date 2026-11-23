"use client";

import Link from "next/link";
import { Moon, Sun, Users } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-[#faf8ff]/90 shadow-[0_1px_8px_rgba(19,27,46,0.05)] backdrop-blur-md dark:border-b dark:border-slate-800 dark:bg-[#0F172A]/90">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          className="flex min-h-12 items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#00652c] dark:text-emerald-400"
        >
          <span aria-hidden="true" className="animate-tree-sway text-2xl">
            🎄
          </span>
          <div className="flex flex-col leading-none">
            <span>
              Amigo de{" "}
              <span className="text-[#bb0112] dark:text-red-400">Natal</span>
            </span>
            <span className="mt-0.5 hidden text-[10px] font-bold uppercase tracking-wider text-[#93000b] sm:inline-block dark:text-red-300">
              Secreto • Onça • Chocolate
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/meus-grupos"
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#f2f3ff] px-3.5 text-sm font-semibold text-[#131b2e] transition hover:bg-[#eaedff] dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Users className="h-4 w-4 shrink-0 text-[#00652c] dark:text-emerald-400" />
            <span>Meus Grupos</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"
            }
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#f2f3ff] text-[#131b2e] transition hover:bg-[#eaedff] dark:border dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
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
