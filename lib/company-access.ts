import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CompanyAccess = {
  userId: string;
  companyId: string;
  memberRole: "OWNER" | "RECRUITER";
};

export async function requireCompanyAccess(companyId?: string): Promise<CompanyAccess> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ENTREPRISE") {
    throw new Error("Accès entreprise requis");
  }

  const memberships = await prisma.companyMember.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { companyId: true, role: true },
  });

  if (memberships.length === 0) throw new Error("Aucune entreprise associée à ce compte");

  if (companyId) {
    const membership = memberships.find((item) => item.companyId === companyId);
    if (!membership) throw new Error("Accès à cette entreprise refusé");
    return { userId: session.user.id, companyId: membership.companyId, memberRole: membership.role };
  }

  if (memberships.length > 1) {
    throw new Error("Plusieurs entreprises sont associées à ce compte : l'identifiant de l'entreprise est requis");
  }

  const membership = memberships[0];
  return { userId: session.user.id, companyId: membership.companyId, memberRole: membership.role };
}

export function isCompanyManager(role: CompanyAccess["memberRole"]) {
  return role === "OWNER";
}
