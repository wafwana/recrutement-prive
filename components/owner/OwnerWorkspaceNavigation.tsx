"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };
type NavGroup = { title: string; links: NavItem[] };

const primaryLinks: NavItem[] = [
  { href: "/espace/owner", label: "Vue d’ensemble" },
  { href: "/espace/owner/candidats", label: "Candidats" },
  { href: "/espace/documents/cv-library", label: "CVthèque" },
  { href: "/espace/owner/metiers", label: "Métiers & dossiers" },
  { href: "/espace/owner/sourcing", label: "Sourcing" },
  { href: "/espace/owner/cv-matching", label: "Matching" },
  { href: "/espace/owner/contacts-securises", label: "Executive Search" },
];

const navGroups: NavGroup[] = [
  {
    title: "Recherche & sourcing",
    links: [
      { href: "/espace/owner/recherche-proactive", label: "Recherche proactive de candidats" },
      { href: "/espace/owner/matching", label: "Matching opérationnel" },
      { href: "/espace/owner/sourcing/matching", label: "Matching du sourcing" },
      { href: "/espace/owner/sourcing/pays", label: "Pays du sourcing" },
      { href: "/espace/owner/sourcing/qualification", label: "Qualification des profils" },
      { href: "/espace/owner/sourcing/sources", label: "Sources de candidats" },
      { href: "/espace/owner/sourcing/sourcing", label: "Configuration du sourcing" },
    ],
  },
  {
    title: "Entreprises & offres",
    links: [
      { href: "/espace/owner/entreprises", label: "Entreprises" },
      { href: "/espace/owner/entreprises/nouvelle", label: "Ajouter une entreprise" },
      { href: "/espace/owner/offres", label: "Offres" },
      { href: "/espace/owner/offres/nouvelle", label: "Ajouter une offre" },
      { href: "/espace/owner/offres-vivier", label: "Vivier des offres" },
    ],
  },
  {
    title: "CV, dossiers & documents",
    links: [
      { href: "/espace/owner/cv-intake", label: "Intégrer des CV" },
      { href: "/espace/owner/cv-anonymises", label: "CV anonymisés" },
      { href: "/espace/owner/archivage", label: "Archivage centralisé" },
      { href: "/espace/documents", label: "Documents" },
    ],
  },
  {
    title: "Partenaires & finances",
    links: [
      { href: "/espace/owner/partenaires", label: "Partenaires & sources" },
      { href: "/espace/owner/partenaires/sourcing", label: "Sourcing partenaires" },
      { href: "/espace/owner/sorties-argent", label: "Sorties d’argent" },
      { href: "/espace/owner/pre-comptabilite", label: "Pré-comptabilité" },
      { href: "/espace/owner/prestations-tarifs", label: "Prestations & tarifs" },
      { href: "/espace/owner/facturation", label: "Facturation" },
    ],
  },
  {
    title: "Équipe & gouvernance",
    links: [
      { href: "/espace/owner/admins", label: "Gestion des ADMIN" },
      { href: "/espace/owner/consultants", label: "Consultants" },
      { href: "/owner/permissions", label: "Permissions" },
      { href: "/espace/messages", label: "Messagerie" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/espace/owner") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex min-h-10 items-center rounded-md border border-[#c7a15a]/60 bg-[#c7a15a]/15 px-3 py-2 text-sm font-semibold text-[#f1ce8b] outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
          : "inline-flex min-h-10 items-center rounded-md border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:border-[#c7a15a]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
      }
    >
      {item.label}
    </Link>
  );
}

export default function OwnerWorkspaceNavigation() {
  const pathname = usePathname() || "/espace/owner";
  const isDeepOwnerRoute = navGroups.some((group) => group.links.some((link) => isActive(pathname, link.href)));

  return (
    <section
      aria-label="Navigation de l’espace OWNER"
      className="border-b border-white/10 bg-[#0e1115] shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <div className="mx-auto w-[min(1280px,calc(100%-32px))] py-4 sm:w-[min(1280px,calc(100%-48px))] lg:w-[min(1280px,calc(100%-64px))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1ce8b]">Espace de travail OWNER</p>
            <p className="mt-1 text-sm text-white/55">Accès rapide aux outils et aux dossiers du cabinet</p>
          </div>
          <Link
            href="/espace/owner"
            className="inline-flex min-h-10 items-center rounded-md border border-white/15 px-3 py-2 text-sm text-white/75 hover:border-[#c7a15a]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
          >
            Retour au cockpit
          </Link>
        </div>

        <nav aria-label="Accès rapide OWNER" className="mt-4 flex flex-wrap gap-2">
          {primaryLinks.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        </nav>

        <details
          open={isDeepOwnerRoute || undefined}
          className="mt-3 rounded-lg border border-white/10 bg-black/20"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-3 py-2 text-sm font-medium text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f1ce8b]">
            <span>Toutes les fonctions</span>
            <span aria-hidden="true" className="text-xs text-[#f1ce8b]">Ouvrir / réduire</span>
          </summary>
          <div className="grid gap-4 border-t border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {navGroups.map((group) => (
              <section key={group.title} aria-label={group.title} className="min-w-0">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f1ce8b]">{group.title}</h2>
                <nav aria-label={group.title} className="flex flex-col items-start gap-1.5">
                  {group.links.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={
                          active
                            ? "w-full rounded px-2.5 py-2 text-sm font-semibold text-[#f1ce8b] underline decoration-[#c7a15a] underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
                            : "w-full rounded px-2.5 py-2 text-sm text-white/70 hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
                        }
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </section>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
