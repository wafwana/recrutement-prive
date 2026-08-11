import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CompanyAccess = {
  userId: string;
  companyId: string;
  memberRole: "OWNER" | "RECRUITER";
};

export async function requireCompanyAccess(): Promise<CompanyAccess> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") {
    throw new Error("Accès entreprise requis");
  }

  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) throw new Error("Aucune entreprise associée à ce compte");

  return {
    userId: session.user.id,
    companyId: membership.companyId,
    memberRole: membership.role,
  };
}

export function isCompanyManager(role: CompanyAccess["memberRole"]) {
  return role === "OWNER";
}
