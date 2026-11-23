import { GoogleGenAI, Type } from "@google/genai";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiGenerations } from "@/db/schema";
import {
  formatBrlFromCents,
  MODE_CONFIG,
  type ChaosRevealPayload,
  type GroupMode,
  type VipGiftsPayload,
} from "./types";

const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash-lite";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function generateWithFallback<T>(
  prompt: string,
  responseSchema: Record<string, unknown>
): Promise<{ data: T; model: string }> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("NO_API_KEY");
  }

  const models = [PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean);
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema as never,
          temperature: 0.9,
        },
      });
      const text = response.text;
      if (!text) throw new Error("Resposta vazia da IA");
      return { data: JSON.parse(text) as T, model };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("Falha na geração com IA");
}

function buildFallbackChaos(
  receiverName: string,
  mode: GroupMode,
  tags: string[]
): ChaosRevealPayload {
  const tagText = tags.length > 0 ? tags.join(", ") : "misterioso(a)";
  if (mode === "ONCA") {
    return {
      roast: `Você tirou ${receiverName}! Com fama de "${tagText}", prepare um presente que faça o grupo inteiro rir na hora da revelação.`,
      clues: [
        `Essa pessoa tem tudo a ver com: ${tags[0] ?? "boas histórias"}.`,
        `Na roda do grupo, todo mundo lembra de "${tags[1] ?? "momentos épicos"}" quando pensa nela.`,
        `Dica final: se o presente envolver ${tags[2] ?? "zoeira"}, vai ser impossível errar.`,
      ],
      forfeit:
        "Na hora de entregar o presente, faça um discurso dramático de 15 segundos agradecendo como se estivesse ganhando o Oscar.",
    };
  }
  if (mode === "CHOCOLATE") {
    return {
      roast: `Você tirou ${receiverName}! Mistura explosiva de "${tagText}" — claramente alguém que leva chocolate muito a sério.`,
      clues: [
        `Paladar exigente no quesito: ${tags[0] ?? "chocolate de respeito"}.`,
        `Não tente enganar com bombom murcho, porque curte ${tags[1] ?? "qualidade"}.`,
        `Última pista: ${tags[2] ?? "doce na medida certa"} conquista o coração dessa pessoa.`,
      ],
      forfeit:
        "Só pode entregar o chocolate depois de adivinhar em voz alta qual é o doce favorito da pessoa (se errar, paga uma dancinha de Natal).",
    };
  }
  return {
    roast: `Você tirou ${receiverName}! Alguém que combina "${tagText}" e merece um presente caprichado neste Natal.`,
    clues: [
      `Um dos maiores interesses dessa pessoa é ${tags[0] ?? "coisas criativas"}.`,
      `No tempo livre, adora ${tags[1] ?? "aproveitar bons momentos"}.`,
      `Pista bônus: ${tags[2] ?? "detalhes pensados com carinho"} fazem diferença.`,
    ],
    forfeit:
      "Entregue o presente dando 3 elogios super exagerados antes de revelar o nome!",
  };
}

function buildFallbackVipGifts(
  receiverName: string,
  mode: GroupMode,
  budgetCents: number,
  tags: string[]
): VipGiftsPayload {
  const budgetStr = formatBrlFromCents(budgetCents);
  const tag1 = tags[0] ?? "presente criativo";
  const tag2 = tags[1] ?? "natal";

  if (mode === "CHOCOLATE") {
    return {
      ideas: [
        {
          title: `Caixa Degustação ${tag1}`,
          description: `Seleção caprichada focada em ${tag1}, perfeita para agradar ${receiverName}.`,
          estimatedPriceBrl: budgetStr,
          searchQuery: `caixa chocolate ${tag1}`,
        },
        {
          title: "Bombons Finos Sortidos",
          description: "Clássico elegante que funciona bem dentro do orçamento.",
          estimatedPriceBrl: budgetStr,
          searchQuery: "bombons finos presente natal",
        },
        {
          title: "Barra Artesanal Premium",
          description: "Chocolate artesanal com embalagem festiva.",
          estimatedPriceBrl: budgetStr,
          searchQuery: `barra chocolate artesanal ${tag1}`,
        },
        {
          title: "Panetone Trufado Mini",
          description: "Clima natalino garantido com muito recheio.",
          estimatedPriceBrl: budgetStr,
          searchQuery: "mini panetone trufado chocolate",
        },
        {
          title: "Kit Caneca + Chocolate Quente",
          description: "Combina utilidade com um toque doce para o fim de ano.",
          estimatedPriceBrl: budgetStr,
          searchQuery: "kit chocolate quente caneca",
        },
      ],
      giftNote: `Feliz Natal, ${receiverName}! Escolhi esse doce pensando no seu bom gosto por ${tag1}. Aproveita cada pedaço! 🍫🎄`,
    };
  }

  return {
    ideas: [
      {
        title: `Kit Temático: ${tag1}`,
        description: `Item direto ao ponto para quem curte ${tag1} sem estourar o limite de ${budgetStr}.`,
        estimatedPriceBrl: budgetStr,
        searchQuery: `presente ${tag1}`,
      },
      {
        title: `Caneca Personalizada "${tag2}"`,
        description: "Útil no dia a dia e fácil de encontrar com entrega rápida.",
        estimatedPriceBrl: budgetStr,
        searchQuery: `caneca divertida ${tag2}`,
      },
      {
        title: `Livro ou Guia sobre ${tag1}`,
        description: "Ótima opção para acertar em cheio nos interesses da pessoa.",
        estimatedPriceBrl: budgetStr,
        searchQuery: `livro ${tag1}`,
      },
      {
        title: "Copo Térmico Inox",
        description: "Sucesso garantido em qualquer Amigo Secreto de Natal.",
        estimatedPriceBrl: budgetStr,
        searchQuery: "copo termico inox presente",
      },
      {
        title: `Camiseta ou Acessório ${tag2}`,
        description: "Presente leve, estiloso e com a cara do sorteado.",
        estimatedPriceBrl: budgetStr,
        searchQuery: `camiseta divertida ${tag2}`,
      },
    ],
    giftNote: `Feliz Natal, ${receiverName}! Pensei muito em "${tag1}" na hora de escolher. Que seu fim de ano seja incrível! 🎁✨`,
  };
}

export async function getOrCreateChaosReveal(params: {
  groupId: string;
  giverId: string;
  receiverId: string;
  receiverName: string;
  mode: GroupMode;
  tags: string[];
}): Promise<ChaosRevealPayload> {
  const existing = await db.query.aiGenerations.findFirst({
    where: and(
      eq(aiGenerations.groupId, params.groupId),
      eq(aiGenerations.giverId, params.giverId),
      eq(aiGenerations.receiverId, params.receiverId),
      eq(aiGenerations.generationType, "CHAOS_REVEAL")
    ),
  });

  if (existing) {
    return existing.payload as unknown as ChaosRevealPayload;
  }

  const modeInfo = MODE_CONFIG[params.mode];
  const prompt = `Você é um humorista brasileiro organizando um "${modeInfo.title}" (${modeInfo.subtitle}).
Gere em português brasileiro (PT-BR) natural, leve, engraçado e respeitoso (adequado para família e amigos no WhatsApp):
- Nome do sorteado: ${params.receiverName}
- Características/tags do sorteado: ${params.tags.join(", ") || "nenhuma informada"}

Retorne JSON com:
1. "roast": uma descrição cômica e carinhosa de 2 frases sobre a pessoa tirada.
2. "clues": array com exatamente 3 pistas misteriosas para o participante ler na festa antes de revelar o nome.
3. "forfeit": uma prenda secreta divertida e inofensiva (1 frase) para o participante cumprir na entrega do presente.`;

  let payload: ChaosRevealPayload;
  let modelUsed = "fallback-local";

  try {
    const result = await generateWithFallback<ChaosRevealPayload>(prompt, {
      type: Type.OBJECT,
      properties: {
        roast: { type: Type.STRING },
        clues: { type: Type.ARRAY, items: { type: Type.STRING } },
        forfeit: { type: Type.STRING },
      },
      required: ["roast", "clues", "forfeit"],
    });
    payload = result.data;
    modelUsed = result.model;
  } catch {
    payload = buildFallbackChaos(
      params.receiverName,
      params.mode,
      params.tags
    );
  }

  await db
    .insert(aiGenerations)
    .values({
      groupId: params.groupId,
      giverId: params.giverId,
      receiverId: params.receiverId,
      generationType: "CHAOS_REVEAL",
      model: modelUsed,
      payload: payload as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing();

  return payload;
}

export async function getOrCreateVipGifts(params: {
  groupId: string;
  giverId: string;
  receiverId: string;
  receiverName: string;
  mode: GroupMode;
  budgetCents: number;
  tags: string[];
}): Promise<VipGiftsPayload> {
  const existing = await db.query.aiGenerations.findFirst({
    where: and(
      eq(aiGenerations.groupId, params.groupId),
      eq(aiGenerations.giverId, params.giverId),
      eq(aiGenerations.receiverId, params.receiverId),
      eq(aiGenerations.generationType, "VIP_GIFTS")
    ),
  });

  if (existing) {
    return existing.payload as unknown as VipGiftsPayload;
  }

  const modeInfo = MODE_CONFIG[params.mode];
  const budgetFormatted = formatBrlFromCents(params.budgetCents);

  const prompt = `Você é um Consultor de Presentes VIP brasileiro para "${modeInfo.title}" (${modeInfo.subtitle}).
Orçamento máximo sugerido: ${budgetFormatted}.
Pessoa sorteada: ${params.receiverName}.
Tags/gostos da pessoa: ${params.tags.join(", ") || "geral"}.

Gere em português brasileiro (PT-BR):
1. "ideas": exatamente 5 ideias criativas e compráveis no Brasil (Amazon BR / Mercado Livre) que caibam dentro de ${budgetFormatted}, adaptadas ao modo "${modeInfo.title}".
   Cada ideia deve ter:
   - "title": nome curto do presente
   - "description": por que combina com a pessoa (1 frase)
   - "estimatedPriceBrl": faixa de preço em R$ dentro de ${budgetFormatted}
   - "searchQuery": termo de busca limpo em PT-BR (3 a 5 palavras, sem pontuação) para buscar na Amazon/Mercado Livre.
2. "giftNote": um bilhete engraçado e pronto para imprimir/copiar no cartão do presente (2 a 3 frases).`;

  let payload: VipGiftsPayload;
  let modelUsed = "fallback-local";

  try {
    const result = await generateWithFallback<VipGiftsPayload>(prompt, {
      type: Type.OBJECT,
      properties: {
        ideas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedPriceBrl: { type: Type.STRING },
              searchQuery: { type: Type.STRING },
            },
            required: [
              "title",
              "description",
              "estimatedPriceBrl",
              "searchQuery",
            ],
          },
        },
        giftNote: { type: Type.STRING },
      },
      required: ["ideas", "giftNote"],
    });
    payload = result.data;
    modelUsed = result.model;
  } catch {
    payload = buildFallbackVipGifts(
      params.receiverName,
      params.mode,
      params.budgetCents,
      params.tags
    );
  }

  await db
    .insert(aiGenerations)
    .values({
      groupId: params.groupId,
      giverId: params.giverId,
      receiverId: params.receiverId,
      generationType: "VIP_GIFTS",
      model: modelUsed,
      payload: payload as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing();

  return payload;
}
