import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
});

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
  { left: "4%", duration: "11s", delay: "-2s", size: "text-sm", char: "❄" },
  { left: "11%", duration: "15s", delay: "-9s", size: "text-xs", char: "❅" },
  { left: "18%", duration: "13s", delay: "-5s", size: "text-base", char: "❄" },
  { left: "26%", duration: "17s", delay: "-12s", size: "text-xs", char: "❆" },
  { left: "33%", duration: "12s", delay: "-3s", size: "text-sm", char: "❄" },
  { left: "41%", duration: "16s", delay: "-8s", size: "text-lg", char: "❅" },
  { left: "49%", duration: "10s", delay: "-6s", size: "text-xs", char: "❄" },
  { left: "57%", duration: "14s", delay: "-11s", size: "text-base", char: "❆" },
  { left: "64%", duration: "12s", delay: "-1s", size: "text-sm", char: "❄" },
  { left: "72%", duration: "16s", delay: "-7s", size: "text-xs", char: "❅" },
  { left: "79%", duration: "11s", delay: "-4s", size: "text-base", char: "❄" },
  { left: "86%", duration: "15s", delay: "-10s", size: "text-sm", char: "❆" },
  { left: "93%", duration: "13s", delay: "-2.5s", size: "text-xs", char: "❄" },
  { left: "8%", duration: "18s", delay: "-14s", size: "text-base", char: "❅" },
  { left: "45%", duration: "14s", delay: "-13s", size: "text-sm", char: "❄" },
  { left: "68%", duration: "17s", delay: "-6.5s", size: "text-xs", char: "❄" },
  { left: "89%", duration: "12s", delay: "-8.5s", size: "text-base", char: "❅" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakarta.variable}`}
    >
      <body className={`${inter.className} min-h-screen antialiased`}>
        <ThemeProvider>
          <AnalyticsTracker />
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
            {SNOWFLAKES.map((flake, idx) => (
              <span
                key={idx}
                className={`snowflake ${flake.size} text-sky-500/45 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:text-sky-200/45 dark:drop-shadow-none`}
                style={{
                  left: flake.left,
                  animationDuration: flake.duration,
                  animationDelay: flake.delay,
                }}
              >
                {flake.char}
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
