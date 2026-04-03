import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRAT — Brawlhalla Replay Analyzer & Tracker",
  description: "Analysez vos replays Brawlhalla et améliorez votre gameplay avec des métriques e-sport avancées. 100% gratuit, 100% local.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
