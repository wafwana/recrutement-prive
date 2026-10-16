import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { CollaboratorActivityTracker } from "@/components/activity/CollaboratorActivityTracker";
import ContextBackButton from "@/components/navigation/ContextBackButton";
import OwnerWorkspaceNavigation from "@/components/owner/OwnerWorkspaceNavigation";
import RoleWorkspaceNavigation, { type WorkspaceNavigationPermission } from "@/components/workspace/RoleWorkspaceNavigation";
import { hasPermission } from "@/lib/auth/permissions";

export default async function EspaceLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  const canManagePlatformSettings = role === "ADMIN" && session?.user?.id
    ? await hasPermission(session.user.id, role, "PLATFORM_SETTINGS").catch(() => false)
    : false;
  const canManagePartners = role === "ADMIN" && session?.user?.id
    ? await hasPermission(session.user.id, role, "PARTNERS_MANAGE").catch(() => false)
    : false;
  const allowedAdminPermissions: WorkspaceNavigationPermission[] = [
    ...(canManagePlatformSettings ? ["PLATFORM_SETTINGS" as const] : []),
    ...(canManagePartners ? ["PARTNERS_MANAGE" as const] : []),
  ];
  const workspaceRole =
    role === "CANDIDAT" || role === "ENTREPRISE" || role === "CONSULTANT" || role === "ADMIN"
      ? role
      : null;

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-20 w-[min(1180px,calc(100%-40px))] items-center justify-between gap-8 md:w-[min(1180px,calc(100%-72px))]">
          <Link href="/" className="font-serif text-xl tracking-[0.22em]">RP</Link>
          <nav aria-label="Navigation générale" className="flex items-center justify-end text-[10px] uppercase tracking-[0.2em] text-white/60">
            <Link href="/" className="min-h-11 inline-flex items-center px-2 text-[#c7a15a] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]">Retour au site</Link>
          </nav>
        </div>
      </header>
      <CollaboratorActivityTracker />
      {role === "OWNER" ? <OwnerWorkspaceNavigation /> : null}
      {workspaceRole ? <RoleWorkspaceNavigation role={workspaceRole} allowedAdminPermissions={allowedAdminPermissions} /> : null}
      <ContextBackButton />
      {children}
    </main>
  );
}
