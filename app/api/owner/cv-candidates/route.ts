import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

export async function GET() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "") || !(await hasPermission(userId, role, "MATCHING"))) {
    return NextResponse.json({ error: "Permission de matching non accordée par l'Owner." }, { status: 403 });
  }

  const candidates = await prisma.candidateProfile.findMany({
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      headline: true,
      user: { select: { name: true, email: true, status: true } },
    },
  });

  return NextResponse.json({
    candidates: candidates
      .filter((candidate) => candidate.user.status === "ACTIVE")
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.user.name,
        email: candidate.user.email,
        headline: candidate.headline,
      })),
  });
}
