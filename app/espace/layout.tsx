import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { CollaboratorActivityTracker } from "@/components/activity/CollaboratorActivityTracker";
import ContextBackButton from "@/components/navigation/ContextBackButton";
import OwnerWorkspaceNavigation from "@/components/owner/OwnerWorkspaceNavigation";
import AdminWorkspaceNavigation from "@/components/admin/AdminWorkspaceNavigation";
import RoleWorkspaceNavigation, { type WorkspaceNavigationPermission } from "@/components/workspace/RoleWorkspaceNavigation";
import { hasPermission } from "@/lib/auth/permissions";
import ReturnToSiteLink from "@/components/navigation/ReturnToSiteLink";

const ADMIN_NAV_PERMISSIONS = [
  "CANDIDATES_VIEW", "CANDIDATES_MANAGE", "CV_INTAKE", "CV_LIBRARY", "CV_MATCHING",
  "METIERS_DOSSIERS", "SOURCING", "OFFRES_VIVIER", "JOBS_MANAGE", "PRESENTATIONS_MANAGE",
  "COMPANIES_MANAGE", "DOCUMENTS_VIEW", "ENTERPRISE_OFFER_SOURCING", "PARTNERS_MANAGE",
  "TECH_SOLUTIONS_MANAGE", "SECURE_CONTACTS_AUTHORIZE", "MESSAGING_CLIENTS_ENTERPRISE",
] as const;

export default async function EspaceLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const adminPermissions = role === "ADMIN" && session?.user?.id
    ? (await Promise.all(ADMIN_NAV_PERMISSIONS.map((permission) =>
        hasPermission(session.user.id, role, permission).catch(() => false),
      ))).flatMap((allowed, index) => allowed ? [ADMIN_NAV_PERMISSIONS[index]] : [])
    : [];

  const canManagePlatformSettings = role === "ADMIN" && session?.user?.id
    ? await hasPermission(session.user.id, role, "PLATFORM_SETTINGS").catch(() => false)
    : false;
  const canManagePartners = role === "ADMIN" && session?.user?.id
    ? await hasPermission(session.user.id, role, "PARTNERS_MANAGE").catch(() => false)
    : false;
  const canManageCvIntake = (role === "ADMIN" || role === "CONSULTANT") && session?.user?.id
    ? await hasPermission(session.user.id, role, "CV_INTAKE").catch(() => false)
    : false;
  const allowedAdminPermissions: WorkspaceNavigationPermission[] = [
    ...(canManagePlatformSettings ? ["PLATFORM_SETTINGS" as const] : []),
    ...(canManagePartners ? ["PARTNERS_MANAGE" as const] : []),
    ...(canManageCvIntake ? ["CV_INTAKE" as const] : []),
  ];
  const workspaceRole =
    role === "CANDIDAT" || role === "ENTREPRISE" || role === "CONSULTANT"
      ? role
      : null;

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-20 w-[min(1180px,calc(100%-40px))] items-center justify-between gap-8 md:w-[min(1180px,calc(100%-72px))]">
          <Link href="/" className="font-serif text-xl tracking-[0.22em]">RP</Link>
          <nav aria-label="Navigation générale" className="flex flex-wrap items-center justify-end gap-4 text-[10px] uppercase tracking-[0.2em] text-white/60">
            {role === "OWNER" || role === "ADMIN" || role === "CONSULTANT" ? <Link href="/espace/help" className="hover:text-[#f1ce8b]">Centre d’aide</Link> : null}
            {role === "OWNER" || role === "ADMIN" || role === "CONSULTANT" ? <Link href="/espace/mailings" className="hover:text-[#f1ce8b]">Bibliothèque de mailings</Link> : null}
            <ReturnToSiteLink />
          </nav>
        </div>
      </header>
      <CollaboratorActivityTracker />
      {role === "OWNER" ? <OwnerWorkspaceNavigation /> : null}
      {role === "ADMIN" ? <AdminWorkspaceNavigation permissions={adminPermissions} /> : null}
      {workspaceRole ? <RoleWorkspaceNavigation role={workspaceRole} allowedAdminPermissions={allowedAdminPermissions} /> : null}
      <ContextBackButton />
      {children}
    </main>
  );
}
