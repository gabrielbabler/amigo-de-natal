import { CheckCircle2, Flame, Gift, MessageCircle, Shield } from "lucide-react";
import { HeroModeCards } from "@/components/HeroModeCards";
import { MyLocalGroups } from "@/components/MyLocalGroups";

export default function HomePage() {
  return (
    <div className="space-y-8 animate-gentle-rise">
      <HeroModeCards />

      <MyLocalGroups />

      <section className="space-y-4 rounded-3xl bg-[#f2f3ff] p-6 dark:border dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-extrabold text-[#131b2e] dark:text-white">
          Criar e participar é 100% grátis
        </h2>
        <ul className="space-y-3 text-base text-[#3f493f] dark:text-slate-300">
          <li className="flex items-start gap-3">
            <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-[#00652c] dark:text-emerald-400" />
            <span>
              <strong className="text-[#131b2e] dark:text-white">
                Zero cadastro:
              </strong>{" "}
              ninguém precisa criar conta ou lembrar senha difícil. Basta nome,
              WhatsApp e um PIN de 4 dígitos.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Shield className="mt-1 h-5 w-5 shrink-0 text-[#00652c] dark:text-emerald-400" />
            <span>
              <strong className="text-[#131b2e] dark:text-white">
                Sem participantes duplicados:
              </strong>{" "}
              bloqueio automático por número de WhatsApp para ninguém entrar duas
              vezes sem querer.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Gift className="mt-1 h-5 w-5 shrink-0 text-[#bb0112] dark:text-red-400" />
            <span>
              <strong className="text-[#131b2e] dark:text-white">
                Links prontos na faixa de preço:
              </strong>{" "}
              ao revelar seu amigo secreto, você já recebe links diretos na
              Amazon e Mercado Livre filtrados dentro do orçamento do grupo.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#00652c] dark:text-emerald-400" />
            <span>
              <strong className="text-[#131b2e] dark:text-white">
                100% acessível:
              </strong>{" "}
              letras grandes, alto contraste e zero banners de anúncio para
              todas as idades.
            </span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-extrabold text-[#131b2e] dark:text-white">
            Quer turbinar a brincadeira? (Opcional via PIX)
          </h2>
          <p className="text-sm text-[#3f493f] dark:text-slate-400">
            O sorteio completo e os links de presentes são grátis. O único extra
            pago é para o organizador ativar se quiser:
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-[#ffdad6] bg-white p-5 shadow-[0_2px_12px_rgba(19,27,46,0.05)] dark:border-red-900/50 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[#bb0112] dark:text-red-400">
              <Flame className="h-4 w-4" />
              Para o grupo todo • Pagamento único
            </span>
            <span className="rounded-full bg-[#ffdad6] px-3 py-0.5 text-sm font-extrabold text-[#93000b] dark:bg-red-950/60 dark:text-red-300">
              R$ 14,90
            </span>
          </div>
          <div>
            <h3 className="text-xl font-black text-[#131b2e] dark:text-white">
              Modo Caos
            </h3>
            <p className="text-sm text-[#3f493f] dark:text-slate-400">
              O organizador ativa uma vez no painel e libera para todos os
              participantes:
            </p>
          </div>
          <ul className="space-y-2 text-base text-[#3f493f] dark:text-slate-300">
            <li>• Regras anti-casal (quem não pode tirar quem) antes do sorteio</li>
            <li>• Zoeira personalizada em cada revelação</li>
            <li>• 3 pistas misteriosas para ler na hora da festa</li>
            <li>• Prenda secreta divertida para cumprir na entrega</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
