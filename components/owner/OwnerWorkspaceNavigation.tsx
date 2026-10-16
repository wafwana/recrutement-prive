"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

type NavItem = { href: string; labelKey: string };
type NavGroup = { titleKey: string; links: NavItem[] };

const primaryLinks: NavItem[] = [
  { href: "/espace/owner", labelKey: "ws_owner_overview" },
  { href: "/espace/owner/candidats", labelKey: "ws_owner_candidates" },
  { href: "/espace/documents/cv-library", labelKey: "ws_owner_cv_library" },
  { href: "/espace/owner/metiers", labelKey: "ws_owner_jobs_taxonomy" },
  { href: "/espace/owner/sourcing", labelKey: "ws_owner_sourcing" },
  { href: "/espace/owner/cv-matching", labelKey: "ws_owner_matching" },
  { href: "/espace/owner/contacts-securises", labelKey: "ws_owner_executive_search" },
];

const navGroups: NavGroup[] = [
  {
    titleKey: "ws_owner_group_research_sourcing",
    links: [
      { href: "/espace/owner/recherche-proactive", labelKey: "ws_owner_research_candidates" },
      { href: "/espace/owner/matching", labelKey: "ws_owner_matching_operations" },
      { href: "/espace/owner/sourcing/matching", labelKey: "ws_owner_matching_sourcing" },
      { href: "/espace/owner/sourcing/pays", labelKey: "ws_owner_sourcing_countries" },
      { href: "/espace/owner/sourcing/qualification", labelKey: "ws_owner_profile_qualification" },
      { href: "/espace/owner/sourcing/sources", labelKey: "ws_owner_candidate_sources" },
      { href: "/espace/owner/sourcing/sourcing", labelKey: "ws_owner_sourcing_configuration" },
    ],
  },
  {
    titleKey: "ws_owner_group_companies_offers",
    links: [
      { href: "/espace/owner#entreprises", labelKey: "ws_owner_companies" },
      { href: "/espace/owner/entreprises/nouvelle", labelKey: "ws_owner_add_company" },
      { href: "/espace/owner#offres", labelKey: "ws_owner_offers" },
      { href: "/espace/owner/offres/nouvelle", labelKey: "ws_owner_add_offer" },
      { href: "/espace/owner/offres-vivier", labelKey: "ws_owner_offer_pool" },
    ],
  },
  {
    titleKey: "ws_owner_group_cv_documents",
    links: [
      { href: "/espace/owner/cv-intake", labelKey: "ws_owner_cv_intake" },
      { href: "/espace/owner/cv-anonymises", labelKey: "ws_owner_anonymized_cvs" },
      { href: "/espace/owner/archivage", labelKey: "ws_owner_archiving" },
      { href: "/espace/documents", labelKey: "ws_owner_documents" },
    ],
  },
  {
    titleKey: "ws_owner_group_partners_finance",
    links: [
      { href: "/espace/owner/partenaires", labelKey: "ws_owner_partners_sources" },
      { href: "/espace/owner/partenaires/sourcing", labelKey: "ws_owner_partner_sourcing" },
      { href: "/espace/owner/sorties-argent", labelKey: "ws_owner_expenses" },
      { href: "/espace/owner/pre-comptabilite", labelKey: "ws_owner_pre_accounting" },
      { href: "/espace/owner/prestations-tarifs", labelKey: "ws_owner_services_pricing" },
      { href: "/espace/owner/facturation", labelKey: "ws_owner_billing" },
    ],
  },
  {
    titleKey: "ws_owner_group_team_governance",
    links: [
      { href: "/espace/owner/admins", labelKey: "ws_owner_admin_management" },
      { href: "/espace/owner/consultants", labelKey: "ws_owner_consultants" },
      { href: "/owner/permissions", labelKey: "ws_owner_permissions" },
      { href: "/espace/messages", labelKey: "ws_messages" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/espace/owner") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, t }: { item: NavItem; pathname: string; t: (key: string) => string }) {
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
      {t(item.labelKey)}
    </Link>
  );
}

export default function OwnerWorkspaceNavigation() {
  const { t } = useI18n();
  const pathname = usePathname() || "/espace/owner";
  const isDeepOwnerRoute = navGroups.some((group) => group.links.some((link) => isActive(pathname, link.href)));

  return (
    <section
      aria-label={t("ws_owner_navigation_aria")}
      className="border-b border-white/10 bg-[#0e1115] shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <div className="mx-auto w-[min(1280px,calc(100%-32px))] py-4 sm:w-[min(1280px,calc(100%-48px))] lg:w-[min(1280px,calc(100%-64px))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1ce8b]">{t("ws_owner_title")}</p>
            <p className="mt-1 text-sm text-white/55">{t("ws_owner_description")}</p>
          </div>
          <Link
            href="/espace/owner"
            className="inline-flex min-h-10 items-center rounded-md border border-white/15 px-3 py-2 text-sm text-white/75 hover:border-[#c7a15a]/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
          >
            {t("ws_owner_return")}
          </Link>
        </div>

        <nav aria-label={t("ws_owner_quick_navigation_aria")} className="mt-4 flex flex-wrap gap-2">
          {primaryLinks.map((item) => <NavLink key={item.href} item={item} pathname={pathname} t={t} />)}
        </nav>

        <details
          open={isDeepOwnerRoute || undefined}
          className="mt-3 rounded-lg border border-white/10 bg-black/20"
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-3 py-2 text-sm font-medium text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f1ce8b]">
            <span>{t("ws_owner_functions")}</span>
            <span aria-hidden="true" className="text-xs text-[#f1ce8b]">{t("ws_owner_open_collapse")}</span>
          </summary>
          <div className="grid gap-4 border-t border-white/10 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {navGroups.map((group) => {
              const groupTitle = t(group.titleKey);
              return (
              <section key={group.titleKey} aria-label={groupTitle} className="min-w-0">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#f1ce8b]">{groupTitle}</h2>
                <nav aria-label={groupTitle} className="flex flex-col items-start gap-1.5">
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
                        {t(item.labelKey)}
                      </Link>
                    );
                  })}
                </nav>
              </section>
              );
            })}
          </div>
        </details>
      </div>
    </section>
  );
}
