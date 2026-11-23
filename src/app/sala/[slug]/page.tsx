import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { RoomClient } from "@/components/RoomClient";
import { formatBrlFromCents, MODE_CONFIG, type GroupMode } from "@/lib/types";

export async function generateMetadata(context: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await context.params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  if (!group) {
    return {
      title: "Sala não encontrada — Amigo de Natal",
    };
  }

  const mode = MODE_CONFIG[group.mode as GroupMode] ?? MODE_CONFIG.SECRETO;
  const budget = formatBrlFromCents(group.budgetCents);
  const dateFormatted = group.revealDate.split("-").reverse().join("/");

  return {
    title: `${mode.emoji} ${group.name} — ${mode.title} | Amigo de Natal`,
    description: `Você foi convidado para o ${mode.title} "${group.name}"! Valor sugerido: ${budget}. Revelação em ${dateFormatted}. Entre em 10 segundos sem cadastro.`,
    openGraph: {
      title: `${mode.emoji} Convite: ${group.name} (${mode.title})`,
      description: `Valor sugerido: ${budget} • Revelação: ${dateFormatted}. Toque para entrar no sorteio!`,
      locale: "pt_BR",
      type: "website",
    },
  };
}

export default async function RoomPage(context: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await context.params;
  return <RoomClient slug={slug} />;
}
