"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { readLocalGroups, type LocalGroupEntry } from "@/lib/localHistory";
import { MODE_CONFIG } from "@/lib/types";

export function MyLocalGroups() {
  const [groups, setGroups] = useState<LocalGroupEntry[]>([]);

  useEffect(() => {
    setGroups(readLocalGroups());
  }, []);

  if (groups.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Seus Amigos de Natal neste aparelho
        </h2>
        <Link
          href="/meus-grupos"
          className="text-sm font-bold text-[#15803D] underline underline-offset-4 dark:text-emerald-400"
        >
          Outro aparelho?
        </Link>
      </div>

      <div className="space-y-2.5">
        {groups.map((item) => {
          const mode = MODE_CONFIG[item.mode] ?? MODE_CONFIG.SECRETO;
          return (
            <div
              key={item.slug}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mode.emoji}</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mode.title}
                    {item.participantName ? ` • ${item.participantName}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.role === "admin" && (
                  <Link
                    href={`/sala/${item.slug}/admin`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-[#15803D] dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  href={`/sala/${item.slug}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-[#15803D] px-4 text-sm font-bold text-white dark:bg-emerald-500 dark:text-slate-950"
                >
                  <span>Entrar</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
