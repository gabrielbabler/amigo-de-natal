import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://amigodenatal.com.br";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Amigo de Natal — Amigo Secreto, da Onça e Chocolate sem cadastro",
  description:
    "Organize seu Amigo Secreto, Amigo da Onça ou Amigo Chocolate em 15 segundos e compartilhe direto no WhatsApp da família. Sem login, sem anúncios.",
  openGraph: {
    title: "Amigo de Natal — Sorteio rápido no WhatsApp",
    description:
      "Crie sua sala grátis em 15 segundos: Amigo Secreto, Amigo da Onça ou Amigo Chocolate!",
    locale: "pt_BR",
    type: "website",
  },
};

const SNOWFLAKES = [
  { left: "6%", duration: "14s", delay: "0s", size: "text-sm" },
  { left: "19%", duration: "18s", delay: "3s", size: "text-xs" },
  { left: "35%", duration: "15s", delay: "6s", size: "text-base" },
  { left: "58%", duration: "17s", delay: "1.5s", size: "text-xs" },
  { left: "76%", duration: "13s", delay: "4.5s", size: "text-sm" },
  { left: "91%", duration: "16s", delay: "2s", size: "text-xs" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ThemeProvider>
          <AnalyticsTracker />
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
            {SNOWFLAKES.map((flake, idx) => (
              <span
                key={idx}
                className={`snowflake ${flake.size} text-emerald-700/20 dark:text-emerald-200/20`}
                style={{
                  left: flake.left,
                  animationDuration: flake.duration,
                  animationDelay: flake.delay,
                }}
              >
                ❄
              </span>
            ))}
          </div>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Header />
            <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
