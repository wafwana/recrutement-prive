import type { ReactNode } from "react";
import { auth } from "@/auth";
import OwnerWorkspaceNavigation from "@/components/owner/OwnerWorkspaceNavigation";

export default async function OwnerLegacyLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <>
      {session?.user?.role === "OWNER" ? <OwnerWorkspaceNavigation /> : null}
      {children}
    </>
  );
}
