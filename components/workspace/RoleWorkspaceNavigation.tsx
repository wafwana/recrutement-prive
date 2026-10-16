"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

type WorkspaceRole = "CANDIDAT" | "ENTREPRISE" | "CONSULTANT" | "ADMIN";
export type WorkspaceNavigationPermission = "PLATFORM_SETTINGS" | "PARTNERS_MANAGE";
type NavItem = { href: string; labelKey: string; permission?: WorkspaceNavigationPermission };
type WorkspaceDefinition = { titleKey: string; descriptionKey: string; links: NavItem[] };

const workspaces: Record<WorkspaceRole, WorkspaceDefinition> = {
  CANDIDAT: {
    titleKey: "ws_candidate_title",
    descriptionKey: "ws_candidate_description",
    links: [
      { href: "/espace/candidat", labelKey: "ws_candidate_profile_documents" },
      { href: "/espace/candidat/candidatures", labelKey: "ws_candidate_applications" },
      { href: "/espace/messages", labelKey: "ws_messages" },
    ],
  },
  ENTREPRISE: {
    titleKey: "ws_enterprise_title",
    descriptionKey: "ws_enterprise_description",
    links: [
      { href: "/espace/entreprise#entreprise-kpis", labelKey: "ws_overview" },
      { href: "/espace/entreprise#offres", labelKey: "ws_enterprise_offers" },
      { href: "/espace/entreprise#candidatures", labelKey: "ws_enterprise_applications" },
      { href: "/espace/entreprise#presentations-confidentielles", labelKey: "ws_enterprise_presentations" },
      { href: "/espace/messages", labelKey: "ws_messages" },
    ],
  },
  CONSULTANT: {
    titleKey: "ws_consultant_title",
    descriptionKey: "ws_consultant_description",
    links: [
      { href: "/espace/consultant", labelKey: "ws_overview" },
      { href: "/espace/consultant/candidatures", labelKey: "ws_consultant_pipeline" },
      { href: "/espace/consultant/sourcing", labelKey: "ws_consultant_sourcing" },
      { href: "/espace/messages", labelKey: "ws_messages" },
    ],
  },
  ADMIN: {
    titleKey: "ws_admin_title",
    descriptionKey: "ws_admin_description",
    links: [
      { href: "/espace/admin", labelKey: "ws_admin_dashboard" },
      { href: "/espace/admin/autorisations", labelKey: "ws_admin_permissions" },
      { href: "/espace/admin/configuration", labelKey: "ws_admin_configuration", permission: "PLATFORM_SETTINGS" },
      { href: "/espace/admin/partenaires", labelKey: "ws_admin_partners_sources", permission: "PARTNERS_MANAGE" },
      { href: "/espace/messages", labelKey: "ws_messages" },
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
  const { t } = useI18n();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const activeCompanyId = role === "ENTREPRISE" ? searchParams.get("companyId") : null;
  const workspace = workspaces[role];
  const getHref = (href: string) => {
    if (!activeCompanyId || role !== "ENTREPRISE" || !href.startsWith("/espace/entreprise#")) return href;
    const anchor = href.slice(href.indexOf("#"));
    return `/espace/entreprise?companyId=${encodeURIComponent(activeCompanyId)}${anchor}`;
  };
  const links = workspace.links.filter(
    (item) => !item.permission || allowedAdminPermissions.includes(item.permission),
  );

  return (
    <section
      aria-label={t("ws_role_navigation_aria")}
      className="border-b border-white/10 bg-[#0e1115]"
    >
      <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-3 md:w-[min(1180px,calc(100%-72px))]">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1ce8b]">{t(workspace.titleKey)}</p>
          <p className="mt-1 text-sm text-white/55">{t(workspace.descriptionKey)}</p>
        </div>
        <nav aria-label={t("ws_role_quick_navigation_aria")} className="flex flex-wrap gap-2">
          {links.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-flex min-h-11 items-center rounded-md border border-[#c7a15a]/60 bg-[#c7a15a]/15 px-3 py-2 text-sm font-semibold text-[#f1ce8b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
                    : "inline-flex min-h-11 items-center rounded-md border border-white/10 px-3 py-2 text-sm text-white/75 transition hover:border-[#c7a15a]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
                }
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
