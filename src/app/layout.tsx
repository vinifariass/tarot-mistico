import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "TarotMístico — Consultas Diárias por R$5/mês",
  description: "Acesse tiragens de tarot personalizadas todos os dias. Carta do dia, Celtic Cross, interpretações profundas. Menos que um café por mês.",
  keywords: "tarot, consulta de tarot, carta do dia, arcanos maiores, tiragem de tarot",
  openGraph: {
    title: "TarotMístico",
    description: "As cartas revelam seu destino por apenas R$5/mês",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-void text-parchment antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
