export type GroupMode = "SECRETO" | "ONCA" | "CHOCOLATE";

export interface ModeMetadata {
  id: GroupMode;
  title: string;
  subtitle: string;
  badge: string;
  emoji: string;
  defaultBudgetReais: number;
  tagPromptTitle: string;
  tagPlaceholder: string;
  suggestedTags: string[];
}

export const MODE_CONFIG: Record<GroupMode, ModeMetadata> = {
  SECRETO: {
    id: "SECRETO",
    title: "Amigo Secreto",
    subtitle: "O clássico de Natal com lista de desejos e dicas sem erro.",
    badge: "Clássico",
    emoji: "🎁",
    defaultBudgetReais: 80,
    tagPromptTitle: "3 interesses ou gostos pessoais",
    tagPlaceholder: "Ex: Café especial, livros de suspense, correr",
    suggestedTags: [
      "Café especial",
      "Livros",
      "Churrasco",
      "Vinhos",
      "Jogos de tabuleiro",
      "Plantas",
      "Academia",
      "Skincare",
      "Séries",
      "Música",
    ],
  },
  ONCA: {
    id: "ONCA",
    title: "Amigo da Onça",
    subtitle: "Zoeira liberada, presentes engraçados e prendas secretas.",
    badge: "Zoeira e prendas",
    emoji: "🐆",
    defaultBudgetReais: 50,
    tagPromptTitle: "3 manias engraçadas ou piadas internas",
    tagPlaceholder: "Ex: Chega sempre atrasado, viciado em energético",
    suggestedTags: [
      "Sempre atrasado",
      "Dorme no sofá",
      "Viciado em café",
      "Fala de dieta e fura",
      "Esquece tudo",
      "Tio do pavê",
      "Só usa preto",
      "Rei do meme",
      "Fã de boleto",
      "Perde o celular",
    ],
  },
  CHOCOLATE: {
    id: "CHOCOLATE",
    title: "Amigo Chocolate",
    subtitle: "Rápido, doce e perfeito para firma, escola ou família.",
    badge: "Rápido e doce",
    emoji: "🍫",
    defaultBudgetReais: 40,
    tagPromptTitle: "3 preferências de chocolate e doces",
    tagPlaceholder: "Ex: Meio amargo 70%, sem passas, ama pistache",
    suggestedTags: [
      "Chocolate ao leite",
      "Meio amargo 70%",
      "Chocolate branco",
      "Com avelã",
      "Pistache",
      "Trufas",
      "Sem lactose",
      "Zero açúcar",
      "Menta",
      "Caramelo salgado",
    ],
  },
};

export interface ChaosRevealPayload {
  roast: string;
  clues: string[];
  forfeit: string;
}

export interface VipGiftIdea {
  title: string;
  description: string;
  estimatedPriceBrl: string;
  searchQuery: string;
}

export interface VipGiftsPayload {
  ideas: VipGiftIdea[];
  giftNote: string;
}

export const CHAOS_PRICE_CENTS = 1490; // R$ 14,90
export const VIP_PRICE_CENTS = 490; // R$ 4,90

export function formatBrlFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function getDefaultPostNewYearExpiry(): Date {
  const now = new Date();
  const year =
    now.getMonth() === 0 && now.getDate() <= 15
      ? now.getFullYear()
      : now.getFullYear() + 1;
  return new Date(Date.UTC(year, 0, 16, 3, 0, 0)); // Jan 16 00:00 BRT
}
