import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recrutement Privé | Cabinet de recrutement",
  description: "Cabinet de recrutement haut de gamme pour talents et entreprises.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
