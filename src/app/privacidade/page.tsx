import Link from "next/link";

export default function PrivacidadePage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contato@gbabler.com";

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">
        Privacidade, LGPD e Exclusão de Dados
      </h1>

      <div className="space-y-4 text-base text-slate-700 dark:text-slate-300">
        <p>
          O <strong>Amigo de Natal</strong> foi feito para funcionar sem cadastro
          de e-mail, sem senha e sem venda de dados.
        </p>

        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          1. O que guardamos
        </h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Nome/apelido e 3 tags de gosto</strong>: exibidos apenas
            para os membros do seu grupo e para quem tirar você.
          </li>
          <li>
            <strong>WhatsApp e PIN de 4 dígitos</strong>: usados exclusivamente
            para evitar cadastros duplicados no grupo e permitir que você acesse
            seu sorteio em outro aparelho. O PIN é armazenado com criptografia
            irreversível (hash <code>scrypt</code>).
          </li>
          <li>
            <strong>Cookies técnicos</strong>: usamos cookies{" "}
            <code>HttpOnly</code> para manter você conectado na sala sem pedir
            login.
          </li>
        </ul>

        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          2. Exclusão automática após o Ano Novo
        </h2>
        <p>
          Todos os grupos, participantes, sorteios e textos gerados por IA são{" "}
          <strong>excluídos permanentemente após o Ano Novo</strong> (a partir de{" "}
          <strong>15 de janeiro</strong>). O organizador também pode apagar o
          grupo e todos os dados imediatamente a qualquer momento no Painel do
          Organizador.
        </p>

        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          3. Contato e suporte
        </h2>
        <p>
          Para solicitar remoção manual ou tirar dúvidas:{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-bold text-[#15803D] underline dark:text-emerald-400"
          >
            {supportEmail}
          </a>
          .
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex min-h-12 items-center rounded-2xl bg-[#15803D] px-5 font-bold text-white dark:bg-emerald-500 dark:text-slate-950"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
