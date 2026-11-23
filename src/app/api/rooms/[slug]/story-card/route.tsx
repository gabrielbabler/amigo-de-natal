import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { formatBrlFromCents, MODE_CONFIG, type GroupMode } from "@/lib/types";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const group = await db.query.groups.findFirst({
    where: eq(groups.slug, slug),
  });

  const groupName = group?.name ?? "Amigo de Natal";
  const mode = (group?.mode as GroupMode) ?? "SECRETO";
  const modeInfo = MODE_CONFIG[mode];
  const budgetText = group ? formatBrlFromCents(group.budgetCents) : "R$ 50,00";
  const revealDate = group?.revealDate
    ? group.revealDate.split("-").reverse().join("/")
    : "Natal";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "96px 72px",
          background:
            "linear-gradient(160deg, #0F172A 0%, #14532D 55%, #991B1B 100%)",
          color: "#FAFAFA",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "34px",
              fontWeight: 700,
              backgroundColor: "rgba(255,255,255,0.14)",
              padding: "16px 28px",
              borderRadius: "999px",
              alignSelf: "flex-start",
            }}
          >
            <span>{modeInfo.emoji}</span>
            <span>{modeInfo.title}</span>
          </div>

          <div
            style={{
              fontSize: "42px",
              color: "#BBF7D0",
              fontWeight: 600,
              marginTop: "24px",
            }}
          >
            {groupName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            backgroundColor: "rgba(15, 23, 42, 0.72)",
            border: "3px solid rgba(255,255,255,0.22)",
            borderRadius: "48px",
            padding: "64px 52px",
          }}
        >
          <div
            style={{
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.12,
              color: "#FFFFFF",
            }}
          >
            Já tirei o meu no Amigo de Natal... 🤫🎄
          </div>
          <div
            style={{
              fontSize: "38px",
              lineHeight: 1.4,
              color: "#E2E8F0",
            }}
          >
            Será que você vai ganhar um presentão ou uma surpresa?
          </div>

          <div
            style={{
              display: "flex",
              gap: "24px",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(21, 128, 61, 0.35)",
                borderRadius: "24px",
                padding: "20px 32px",
              }}
            >
              <span style={{ fontSize: "24px", color: "#BBF7D0" }}>
                Valor sugerido
              </span>
              <span style={{ fontSize: "38px", fontWeight: 700 }}>
                {budgetText}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(220, 38, 38, 0.35)",
                borderRadius: "24px",
                padding: "20px 32px",
              }}
            >
              <span style={{ fontSize: "24px", color: "#FECACA" }}>
                Revelação
              </span>
              <span style={{ fontSize: "38px", fontWeight: 700 }}>
                {revealDate}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "30px",
            color: "#CBD5E1",
          }}
        >
          <span>amigodenatal.com.br</span>
          <span>🎁 Sorteio sem cadastro</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        "Content-Disposition": `attachment; filename="amigo-de-natal-${slug}.png"`,
      },
    }
  );
}
