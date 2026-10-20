import { NextResponse } from "next/server";
import { auth, getActiveSessionContext } from "@/auth";
import { HELP_GUIDES, getTaxonomyHelpGuides, type HelpGuide } from "@/lib/help/help-center-data";
import { MAILING_TEMPLATES } from "@/lib/mailings/mailings-data";

export async function GET(request: Request) {
  const activeSession = getActiveSessionContext();
  const session = activeSession || (await auth());
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const moduleFilter = searchParams.get("module");
  const categoryFilter = searchParams.get("category");

  const allGuides = [...HELP_GUIDES, ...getTaxonomyHelpGuides()];

  let filteredGuides = allGuides.filter((guide) => {
    if (moduleFilter && guide.module !== moduleFilter) return false;
    if (categoryFilter && guide.categoryCode !== categoryFilter) return false;

    if (!q) return true;

    const inTitle = guide.title.toLowerCase().includes(q);
    const inSummary = guide.summary.toLowerCase().includes(q);
    const inKeywords = guide.keywords.some((k) => k.toLowerCase().includes(q));
    const inSteps = guide.steps.some((s) => s.title.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q));

    return inTitle || inSummary || inKeywords || inSteps;
  });

  // Filter mailing templates if authorized for staff
  const userRole = user.role || "";
  const isStaff = ["OWNER", "ADMIN", "CONSULTANT"].includes(userRole);

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
