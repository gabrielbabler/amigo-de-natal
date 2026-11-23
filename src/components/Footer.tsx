import Link from "next/link";

export function Footer() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contato@gbabler.com";

  return (
    <footer className="mt-12 border-t border-slate-200 bg-white/70 px-4 py-8 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            🎄 Amigo de Natal
          </span>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/meus-grupos"
              className="underline underline-offset-4 hover:text-[#15803D] dark:hover:text-emerald-400"
            >
              Recuperar meus grupos
            </Link>
            <Link
              href="/privacidade"
              className="underline underline-offset-4 hover:text-[#15803D] dark:hover:text-emerald-400"
            >
              Privacidade e LGPD
            </Link>
          </div>
        </div>

        <p className="text-xs leading-relaxed">
          Sem anúncios invasivos e sem spam. Todos os dados dos grupos são
          excluídos automaticamente após o Ano Novo (15 de janeiro). Dúvidas ou
          suporte:{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium underline underline-offset-2"
          >
            {supportEmail}
          </a>
          .
        </p>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-500">
          Como Associado da Amazon e parceiro de afiliados, o Amigo de Natal
          recebe comissão por compras qualificadas feitas através dos links de
          sugestões de presentes — sem nenhum custo adicional para você.
        </p>
      </div>
    </footer>
  );
}
