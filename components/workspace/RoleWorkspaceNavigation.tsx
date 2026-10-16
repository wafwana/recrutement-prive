"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type WorkspaceRole = "CANDIDAT" | "ENTREPRISE" | "CONSULTANT" | "ADMIN";
export type WorkspaceNavigationPermission = "PLATFORM_SETTINGS" | "PARTNERS_MANAGE";
type NavItem = { href: string; label: string; permission?: WorkspaceNavigationPermission };
type WorkspaceDefinition = { title: string; description: string; links: NavItem[] };

const workspaces: Record<WorkspaceRole, WorkspaceDefinition> = {
  CANDIDAT: {
    title: "Espace candidat",
    description: "Retrouvez votre profil, vos documents et le suivi de vos démarches.",
    links: [
      { href: "/espace/candidat", label: "Mon profil & mes documents" },
      { href: "/espace/candidat/candidatures", label: "Mes candidatures" },
      { href: "/espace/messages", label: "Messagerie" },
    ],
  },
  ENTREPRISE: {
    title: "Espace entreprise",
    description: "Accédez directement aux offres, aux candidatures et aux présentations sécurisées.",
    links: [
      { href: "/espace/entreprise#entreprise-kpis", label: "Vue d’ensemble" },
      { href: "/espace/entreprise#offres", label: "Mes offres" },
      { href: "/espace/entreprise#candidatures", label: "Candidatures reçues" },
      { href: "/espace/entreprise#presentations-confidentielles", label: "Présentations confidentielles" },
      { href: "/espace/messages", label: "Messagerie" },
    ],
  },
  CONSULTANT: {
    title: "Espace consultant",
    description: "Passez du pipeline candidats à la file de sourcing sans perdre le fil.",
    links: [
      { href: "/espace/consultant", label: "Vue d’ensemble" },
      { href: "/espace/consultant/candidatures", label: "Pipeline candidats" },
      { href: "/espace/consultant/sourcing", label: "File de sourcing" },
      { href: "/espace/messages", label: "Messagerie" },
    ],
  },
  ADMIN: {
    title: "Espace ADMIN",
    description: "Accédez aux outils d’administration accordés par les permissions actives.",
    links: [
      { href: "/espace/admin", label: "Tableau de bord" },
      { href: "/espace/admin/autorisations", label: "Mes autorisations" },
      { href: "/espace/admin/configuration", label: "Configuration", permission: "PLATFORM_SETTINGS" },
      { href: "/espace/admin/partenaires", label: "Partenaires & sources", permission: "PARTNERS_MANAGE" },
      { href: "/espace/messages", label: "Messagerie" },
    ],
  },
};

function isActive(pathname: string, href: string): boolean {
  // Hash destinations are in-page shortcuts; usePathname deliberately excludes the hash.
  if (href.includes("#")) return false;
  if (["/espace/candidat", "/espace/entreprise", "/espace/consultant", "/espace/admin"].includes(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function RoleWorkspaceNavigation({
  role,
  allowedAdminPermissions = [],
}: {
  role: WorkspaceRole;
  allowedAdminPermissions?: WorkspaceNavigationPermission[];
}) {
  const pathname = usePathname() || "/";
  const workspace = workspaces[role];
  const links = workspace.links.filter(
    (item) => !item.permission || allowedAdminPermissions.includes(item.permission),
  );

  return (
    <section
      aria-label={`Navigation de l’espace ${workspace.title.replace("Espace ", "")}`}
      className="border-b border-white/10 bg-[#0e1115]"
    >
      <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-3 md:w-[min(1180px,calc(100%-72px))]">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1ce8b]">{workspace.title}</p>
          <p className="mt-1 text-sm text-white/55">{workspace.description}</p>
        </div>
        <nav aria-label={`Accès rapides — ${workspace.title}`} className="flex flex-wrap gap-2">
          {links.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-flex min-h-11 items-center rounded-md border border-[#c7a15a]/60 bg-[#c7a15a]/15 px-3 py-2 text-sm font-semibold text-[#f1ce8b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
                    : "inline-flex min-h-11 items-center rounded-md border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:border-[#c7a15a]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
