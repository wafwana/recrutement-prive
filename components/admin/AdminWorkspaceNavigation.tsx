"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Permission = string;
type Item = { href: string; label: string; permission?: Permission };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  { title: "Candidats & CV", items: [
    { href: "/espace/owner/candidats", label: "Voir les candidats", permission: "CANDIDATES_VIEW" },
    { href: "/espace/owner/candidats", label: "Gérer les candidats", permission: "CANDIDATES_MANAGE" },
    { href: "/espace/owner/cv-intake", label: "Intégrer les CV réels", permission: "CV_INTAKE" },
    { href: "/espace/documents/cv-library", label: "Bibliothèque CV", permission: "CV_LIBRARY" },
    { href: "/espace/owner/cv-matching", label: "CV & Matching transversal", permission: "CV_MATCHING" },
  ]},
  { title: "Métiers & sourcing", items: [
    { href: "/espace/owner/metiers", label: "Métiers & dossiers", permission: "METIERS_DOSSIERS" },
    { href: "/espace/owner/sourcing", label: "Sourcing automatique", permission: "SOURCING" },
    { href: "/espace/owner/recherche-proactive", label: "Recherche proactive candidats", permission: "SOURCING" },
    { href: "/espace/owner/offres-vivier", label: "Vivier des offres", permission: "OFFRES_VIVIER" },
    { href: "/espace/owner/offres/nouvelle", label: "Offres / missions", permission: "JOBS_MANAGE" },
    { href: "/espace/owner/contacts-securises", label: "Présentations candidats", permission: "PRESENTATIONS_MANAGE" },
  ]},
  { title: "Entreprises & documents", items: [
    { href: "/espace/owner#entreprises", label: "Gestion des entreprises", permission: "COMPANIES_MANAGE" },
    { href: "/espace/owner/entreprises/nouvelle", label: "Ajouter une entreprise", permission: "COMPANIES_MANAGE" },
    { href: "/espace/documents", label: "Dépôt de documents", permission: "DOCUMENTS_VIEW" },
    { href: "/espace/owner/sourcing/offres", label: "Sourcing offres entreprise", permission: "ENTERPRISE_OFFER_SOURCING" },
    { href: "/espace/owner/partenaires", label: "Partenaires & Sources", permission: "PARTNERS_MANAGE" },
  ]},
  { title: "Pôle 2 & contacts", items: [
    { href: "/espace/owner/solutions-tech", label: "Solutions technologiques", permission: "TECH_SOLUTIONS_MANAGE" },
    { href: "/espace/owner/contacts-securises", label: "Outreach & Contacts sécurisés", permission: "SECURE_CONTACTS_AUTHORIZE" },
    { href: "/espace/messages", label: "Messagerie clients / entreprises", permission: "MESSAGING_CLIENTS_ENTERPRISE" },
  ]},
];

export default function AdminWorkspaceNavigation({ permissions }: { permissions: Permission[] }) {
  const pathname = usePathname() || "/espace/admin";
  const allowed = new Set(permissions);
  const visibleGroups = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || allowed.has(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <section aria-label="Navigation ADMIN autorisée" className="border-b border-white/10 bg-[#0e1115]">
      <div className="mx-auto w-[min(1280px,calc(100%-32px))] py-4 sm:w-[min(1280px,calc(100%-48px))] lg:w-[min(1280px,calc(100%-64px))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1ce8b]">Espace Administration</p>
            <p className="mt-1 text-sm text-white/55">Navigation filtrée selon les permissions persistées.</p>
          </div>
          <Link href="/espace/admin" className="inline-flex min-h-10 items-center rounded-md border border-white/15 px-3 py-2 text-sm text-white/75 hover:border-[#c7a15a]/50">
            Retour au cockpit ADMIN
          </Link>
        </div>
        <nav aria-label="Accès rapides ADMIN" className="mt-4 flex flex-wrap gap-2">
          <Link href="/espace/admin" aria-current={pathname === "/espace/admin" ? "page" : undefined} className="inline-flex min-h-10 items-center rounded-md border border-[#c7a15a]/60 bg-[#c7a15a]/15 px-3 py-2 text-sm font-semibold text-[#f1ce8b]">Cockpit ADMIN</Link>
          <Link href="/espace/admin/autorisations" aria-current={pathname === "/espace/admin/autorisations" ? "page" : undefined} className="inline-flex min-h-10 items-center rounded-md border border-white/10 px-3 py-2 text-sm text-white/75 hover:border-[#c7a15a]/50">Mes autorisations</Link>
        </nav>
        {visibleGroups.length > 0 && (
          <details className="mt-3 rounded-lg border border-white/10 bg-black/20">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-3 py-2 text-sm font-medium text-white/85">
              <span>Fonctions autorisées</span><span className="text-xs text-[#f1ce8b]">Ouvrir / fermer</span>
            </summary>
            <div className="grid gap-4 border-t border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleGroups.map((group) => (
                <section key={group.title} aria-label={group.title}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f1ce8b]">{group.title}</h2>
                  <nav aria-label={group.title} className="flex flex-col gap-1.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={active ? "w-full rounded px-2.5 py-2 text-sm font-semibold text-[#f1ce8b] underline decoration-[#c7a15a] underline-offset-4" : "w-full rounded px-2.5 py-2 text-sm text-white/70 hover:bg-white/[0.04] hover:text-white"}>{item.label}</Link>;
                    })}
                  </nav>
                </section>
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
