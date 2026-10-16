import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import RpBrandSeal from "@/app/components/RpBrandSeal";
import GlobalBackButton from "@/components/navigation/GlobalBackButton";

export const metadata: Metadata = {
  title: "Recrutement Privé | Cabinet de recrutement",
  description: "Cabinet de recrutement haut de gamme pour talents et entreprises.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <I18nProvider>{children}<GlobalBackButton /><RpBrandSeal /></I18nProvider>
      </body>
    </html>
  );
}
