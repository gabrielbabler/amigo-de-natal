"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

interface GiftUnwrapBoxProps {
  onUnwrap: () => void;
}

export function GiftUnwrapBox({ onUnwrap }: GiftUnwrapBoxProps) {
  const [opening, setOpening] = useState(false);

  const handleOpen = () => {
    if (opening) return;
    setOpening(true);
    setTimeout(() => {
      onUnwrap();
    }, 520);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#becabc]/40 bg-gradient-to-b from-[#e2e7ff] via-[#ffffff] to-[#f2f3ff] p-6 text-center shadow-lg dark:border-slate-800 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d3ffd5] px-3 py-1 text-xs font-extrabold text-[#005323] dark:bg-emerald-950 dark:text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#00652c] dark:bg-emerald-400" />
          Sorteio Concluído
        </span>
        <h2 className="pt-2 text-2xl font-black text-[#131b2e] dark:text-white">
          O grande momento chegou!
        </h2>
        <p className="text-sm text-[#3f493f] dark:text-slate-300">
          Toque no presente embrulhado para descobrir quem você tirou
        </p>
      </div>

      <button
        type="button"
        onClick={handleOpen}
        aria-label="Abrir presente para revelar seu amigo secreto"
        className={`group relative mx-auto my-6 flex h-56 w-52 cursor-pointer flex-col items-center justify-end select-none focus:outline-none ${
          opening
            ? "scale-110 opacity-0 transition-all duration-500"
            : "animate-gift-pulse transition-transform hover:scale-105"
        }`}
      >
        {/* Hanging Gold Tag */}
        <div className="absolute top-8 -right-2 z-20 rotate-12 rounded-xl border-2 border-dashed border-[#a95b00] bg-white px-2.5 py-1 text-center shadow-md transition-transform group-hover:rotate-6 dark:bg-slate-800">
          <span className="block text-[11px] font-extrabold tracking-tight text-[#854600] dark:text-amber-300">
            PARA: VOCÊ 🎁
          </span>
          <span className="block text-[10px] font-semibold text-[#3f493f] dark:text-slate-300">
            Toque p/ abrir
          </span>
        </div>

        {/* Ribbon Bows */}
        <div className="relative z-20 -mb-4 flex items-center justify-center">
          <div className="-mr-3 h-11 w-13 origin-bottom-right -rotate-[28deg] rounded-[50%_10%_50%_50%] border-4 border-amber-300 bg-gradient-to-br from-[#bb0112] via-[#e02928] to-[#93000b] shadow-md" />
          <div className="relative z-20 flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-100 bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 shadow-md">
            <Gift className="h-4 w-4 text-amber-950" />
          </div>
          <div className="-ml-3 h-11 w-13 origin-bottom-left rotate-[28deg] rounded-[10%_50%_50%_50%] border-4 border-amber-300 bg-gradient-to-bl from-[#bb0112] via-[#e02928] to-[#93000b] shadow-md" />
        </div>

        {/* Gift Lid */}
        <div
          className={`relative z-10 flex h-14 w-44 items-center justify-center rounded-xl border-t border-red-300/40 bg-gradient-to-r from-[#e02928] via-[#bb0112] to-[#8f000b] shadow-xl transition-transform duration-500 ${
            opening ? "-translate-y-8 -rotate-6" : ""
          }`}
        >
          <div className="h-full w-7 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 shadow-inner" />
        </div>

        {/* Gift Base */}
        <div className="relative -mt-1 flex h-32 w-40 items-center justify-center overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#a4000f] via-[#bb0112] to-[#7a000a] shadow-2xl">
          <div className="h-full w-7 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 shadow-inner" />
          <div className="absolute h-6 w-full bg-gradient-to-b from-amber-300 via-amber-200 to-amber-500 opacity-90" />
        </div>
      </button>

      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#00652c] px-6 text-base font-extrabold text-white shadow-md transition hover:bg-[#15803d] dark:bg-emerald-500 dark:text-slate-950"
      >
        <Gift className="h-5 w-5" />
        <span>Desembrulhar meu Amigo</span>
      </button>
    </div>
  );
}
