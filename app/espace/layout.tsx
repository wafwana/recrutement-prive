import type { ReactNode } from "react";
import Link from "next/link";

const navigation = [
  { href: "/espace/candidat", label: "Candidat" },
  { href: "/espace/entreprise", label: "Entreprise" },
  { href: "/espace/consultant", label: "Consultant" },
];

export default function EspaceLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-20 w-[min(1180px,calc(100%-40px))] items-center justify-between gap-8 md:w-[min(1180px,calc(100%-72px))]">
          <Link href="/" className="font-serif text-xl tracking-[0.22em]">
            RP
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-5 text-[10px] uppercase tracking-[0.2em] text-white/60">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
            <Link href="/" className="text-[#c7a15a]">Retour au site</Link>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
