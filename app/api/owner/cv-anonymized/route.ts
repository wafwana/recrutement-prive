import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 30) : [];
}
function safeAnalysis(value: unknown) {
  const a = objectValue(value);
  return {
    headline: typeof a.headline === "string" ? a.headline.slice(0, 160) : null,
    skills: strings(a.skills ?? a.explicitSkills),
    languages: strings(a.languages),
    experienceYears: typeof a.experienceYears === "number" && Number.isFinite(a.experienceYears) ? Math.max(0, Math.min(60, Math.round(a.experienceYears))) : null,
    careerLevel: typeof a.careerLevel === "string" ? a.careerLevel : null,
    primaryCategoryCode: typeof a.primaryCategoryCode === "string" ? a.primaryCategoryCode : null,
    subCategoryCodes: strings(a.subCategoryCodes),
    alternativeCategoryCodes: strings(a.alternativeCategoryCodes),
    suggestedPositioning: strings(a.suggestedPositioning),
  };
}

export async function GET() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : undefined;
  const role = typeof session?.user?.role === "string" ? session.user.role : undefined;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role ?? "") || !(await hasPermission(userId, role, "CV_LIBRARY"))) {
    return NextResponse.json({ error: "Permission Bibliothèque CV non accordée par l'Owner." }, { status: 403 });
  }

  const [docs, intakes] = await Promise.all([
    prisma.candidateDocument.findMany({
      where: { docType: "CV" },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, folderPath: true, analyzedAt: true, analysis: true, createdAt: true, candidateId: true, name: true },
    }),
    prisma.cvIntake.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { id: true, folderPath: true, analyzedAt: true, analysis: true, createdAt: true, candidateId: true, status: true },
    }),
  ]);

  const documentKeys = new Set(docs.map((d) => `${d.candidateId ?? ""}::${d.folderPath}`));
  const items = [
    ...docs.map((d) => ({
      id: d.id,
      reference: `RP-${d.id.slice(-6).toUpperCase()}`,
      folderPath: d.folderPath,
      analyzedAt: d.analyzedAt,
      createdAt: d.createdAt,
      status: d.analyzedAt ? "ANALYSE" : "A_ANALYSER",
      profile: safeAnalysis(d.analysis),
    })),
    ...intakes.filter((d) => !documentKeys.has(`${d.candidateId ?? ""}::${d.folderPath}`)).map((d) => ({
      id: d.id,
      reference: `RP-${d.id.slice(-6).toUpperCase()}`,
      folderPath: d.folderPath,
      analyzedAt: d.analyzedAt,
      createdAt: d.createdAt,
      status: d.status || (d.analyzedAt ? "ANALYSE" : "A_ANALYSER"),
      profile: safeAnalysis(d.analysis),
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorRole: role,
      action: "ANONYMIZED_CV_WORKSPACE_VIEW",
      targetType: "CV_LIBRARY",
      details: { profilesReturned: items.length, identityFieldsExcluded: true, originalFilesExcluded: true },
    },
  });

  return NextResponse.json({
    notice: "Profils de travail pseudonymisés : les identités, coordonnées, noms de fichiers originaux et fichiers source ne sont pas exposés par cette API.",
    profiles: items.slice(0, 1000),
    folders: [...new Set(items.map((item) => item.folderPath))].sort(),
  });
}
