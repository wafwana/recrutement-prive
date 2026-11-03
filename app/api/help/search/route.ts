import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { HELP_GUIDES, getTaxonomyHelpGuides, type HelpGuide } from "@/lib/help/help-center-data";
import { MAILING_TEMPLATES } from "@/lib/mailings/mailings-data";
import { getUserPermissions } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userRole = user.role || "";
  const isStaff = ["OWNER", "ADMIN", "CONSULTANT"].includes(userRole);
  if (!isStaff) return NextResponse.json({ error: "Centre d'aide réservé aux collaborateurs." }, { status: 403 });
  const userPermissions = userRole === "OWNER" ? null : await getUserPermissions(user.id);
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get("q") || "").trim();
  if (rawQuery.length > 100) return NextResponse.json({ error: "Recherche limitée à 100 caractères." }, { status: 400 });
  const q = rawQuery.toLowerCase();
  const moduleFilter = searchParams.get("module");
  const allowedModules = new Set(["SOURCING", "MATCHING", "CV_LIBRARY", "PARTNERS", "BILLING", "JOBS", "ADMIN", "METIERS", "GENERAL"]);
  if (moduleFilter && !allowedModules.has(moduleFilter)) return NextResponse.json({ error: "Module de recherche invalide." }, { status: 400 });
  const categoryFilter = searchParams.get("category");
  if (categoryFilter && categoryFilter.length > 80) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });

  const allGuides = [...HELP_GUIDES, ...getTaxonomyHelpGuides()];
  const visibleGuides = allGuides.filter((guide) =>
    userRole === "OWNER" ||
    guide.requiredPermissions.some((permission) =>
      permission === userRole || (Array.isArray(userPermissions) && userPermissions.includes(permission as never)),
    ),
  );

  let filteredGuides = visibleGuides.filter((guide) => {
    if (moduleFilter && guide.module !== moduleFilter) return false;
    if (categoryFilter && guide.categoryCode !== categoryFilter) return false;

    if (!q) return true;

    const inTitle = guide.title.toLowerCase().includes(q);
    const inSummary = guide.summary.toLowerCase().includes(q);
    const inKeywords = guide.keywords.some((k) => k.toLowerCase().includes(q));
    const inSteps = guide.steps.some((s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q));

    return inTitle || inSummary || inKeywords || inSteps;
  });

  // Mailing templates are available to authenticated staff roles only.
  const matchedTemplates = isStaff
    ? MAILING_TEMPLATES.filter((tpl) => {
        if (!q) return true;
        const inName = tpl.name.toLowerCase().includes(q);
        const inSubject = tpl.subject.toLowerCase().includes(q);
        const inCategory = tpl.category.toLowerCase().includes(q);
        return inName || inSubject || inCategory;
      })
    : [];

  return NextResponse.json({
    ok: true,
    query: q,
    guidesCount: filteredGuides.length,
    templatesCount: matchedTemplates.length,
    guides: filteredGuides.slice(0, 50),
    templates: matchedTemplates.slice(0, 20),
  });
}
