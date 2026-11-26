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
              Amazon filtrados dentro do orçamento do grupo.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Flame className="mt-1 h-5 w-5 shrink-0 text-[#bb0112] dark:text-red-400" />
            <span>
              <strong className="text-[#131b2e] dark:text-white">
                Modo Caos & Regras Anti-Casal:
              </strong>{" "}
              bloqueie quem não pode tirar quem e divirta-se com zoeiras, pistas
              misteriosas e prendas secretas na hora da revelação — tudo de graça.
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
    </div>
  );
}
