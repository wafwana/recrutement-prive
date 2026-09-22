import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { configuredSources, fetchGlobalJobs } from "@/lib/sourcing/global";
import { analyzeExternalOffer } from "@/lib/sourcing/offer-analyzer";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const settings = await prisma.systemSetting.findMany({
    where: { key: { startsWith: "sourcing:countries:" } },
    select: { key: true, value: true },
  });

  const companies = settings
    .map((setting) => ({
      companyId: setting.key.slice("sourcing:countries:".length),
      countries: toStringArray(setting.value).slice(0, 50),
    }))
    .filter((item) => item.companyId && item.countries.length);

  const sources = configuredSources("RP_GLOBAL_JOB_SOURCES");
  if (!sources.length) return NextResponse.json({ ok: true, companies: companies.length, sources: 0, offers: 0, matches: 0 });

  const taxonomy = await prisma.jobCategory.findMany({
    where: { isActive: true },
    select: { code: true, name: true, parent: { select: { code: true } } },
    orderBy: { sortOrder: "asc" },
  });

  const taxonomyItems = taxonomy.map((row) => ({
    code: row.code,
    name: typeof row.name === "object" && row.name !== null
      ? String((row.name as Record<string, unknown>).fr ?? (row.name as Record<string, unknown>).en ?? row.code)
      : row.code,
    parentCode: row.parent?.code ?? null,
  }));
  const validCodes = new Set(taxonomy.map((row) => row.code));

  const candidates = await prisma.candidateProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      primaryCategory: { select: { code: true } },
    },
    take: 1000,
  });
  const categoryRows = await prisma.jobCategory.findMany({ select: { id: true, code: true } });
  const categoryCodes = new Map(categoryRows.map((row) => [row.id, row.code]));

  let offers = 0;
  let qualified = 0;
  let matches = 0;
  const errors: { companyId: string; sourceUrl: string; error: string }[] = [];

  for (const company of companies) {
    const selectedCountries = new Set(company.countries.map(normalize));
    for (const sourceUrl of sources) {
      try {
        const items = await fetchGlobalJobs(sourceUrl);
        for (const item of items) {
          if (!item.country || !selectedCountries.has(normalize(item.country))) continue;
          offers++;

          const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
          const closingAt = item.closingAt ? new Date(item.closingAt) : null;
          const externalJob = await prisma.externalJobOpportunity.upsert({
            where: { source_externalId: { source: item.source, externalId: item.externalId } },
            create: {
              externalId: item.externalId,
              source: item.source,
              sourceUrl: item.sourceUrl,
              title: item.title,
              companyName: item.companyName,
              country: item.country,
              city: item.city,
              categoryCode: item.categoryCode,
              subCategoryCode: item.subCategoryCode,
              skills: item.skills,
              experienceYears: item.experienceYears,
              language: item.language,
              salary: item.salary,
              publishedAt,
              closingAt,
              description: item.description,
              rawData: item.raw === undefined ? undefined : JSON.parse(JSON.stringify(item.raw)),
            },
            update: {
              sourceUrl: item.sourceUrl,
              title: item.title,
              companyName: item.companyName,
              country: item.country,
              city: item.city,
              categoryCode: item.categoryCode,
              subCategoryCode: item.subCategoryCode,
              skills: item.skills,
              experienceYears: item.experienceYears,
              language: item.language,
              salary: item.salary,
              publishedAt,
              closingAt,
              description: item.description,
              rawData: item.raw === undefined ? undefined : JSON.parse(JSON.stringify(item.raw)),
            },
          });

          const analysis = await analyzeExternalOffer({
            title: item.title,
            description: item.description,
            companyName: item.companyName,
            country: item.country,
            city: item.city,
            sourceUrl: item.sourceUrl,
            taxonomy: taxonomyItems,
          });

          const fallbackCategory = item.categoryCode && validCodes.has(item.categoryCode) ? item.categoryCode : null;
          const fallbackSubCategory = item.subCategoryCode && validCodes.has(item.subCategoryCode) ? item.subCategoryCode : null;
          const inScope = analysis
            ? analysis.inPlatformScope && Boolean(analysis.categoryCode && validCodes.has(analysis.categoryCode))
            : Boolean(fallbackCategory);

          const categoryCode = analysis?.categoryCode && validCodes.has(analysis.categoryCode) ? analysis.categoryCode : fallbackCategory;
          const subCategoryCode = analysis?.subCategoryCode && validCodes.has(analysis.subCategoryCode) ? analysis.subCategoryCode : fallbackSubCategory;

          const safeAnalysis = analysis
            ? { ...analysis, categoryCode, subCategoryCode }
            : {
                title: item.title,
                summary: item.description || "",
                skills: item.skills || [],
                experienceYears: item.experienceYears ?? null,
                language: item.language || null,
                categoryCode,
                subCategoryCode,
                inPlatformScope: inScope,
                scopeReason: "Qualification déterministe à partir de la taxonomie de la source.",
                confidence: categoryCode ? 0.5 : 0,
              };

          const activeCandidates = candidates;
          const candidateMatches = inScope
            ? activeCandidates
                .map((candidate) => {
                  const subCategoryCodes = Array.isArray(candidate.subCategoryIds)
                    ? candidate.subCategoryIds
                        .filter((value): value is string => typeof value === "string")
                        .map((value) => categoryCodes.get(value) || value)
                    : [];
                  const result = matchCandidateToJob(
                    {
                      skills: candidate.skills,
                      experienceYears: candidate.experienceYears,
                      headline: candidate.headline,
                      bio: candidate.bio,
                      location: candidate.location,
                      country: candidate.country,
                      primaryCategoryCode: candidate.primaryCategory?.code,
                      subCategoryCodes,
                    },
                    {
                      requiredSkills: safeAnalysis.skills,
                      requiredExperienceYears: safeAnalysis.experienceYears,
                      title: safeAnalysis.title,
                      description: safeAnalysis.summary,
                      location: item.city || item.country,
                      categoryCode,
                      subCategoryCode,
                    },
                  );
                  return {
                    candidateId: candidate.id,
                    score: result.score,
                    matchedSkills: result.matchedSkills,
                    missingSkills: result.missingSkills,
                    categoryMatchLevel: result.categoryMatchLevel,
                    reasons: result.reasons,
                  };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 20)
            : [];

          if (inScope) {
            qualified++;
            matches += candidateMatches.length;
          }

          await prisma.enterpriseSourcedOffer.upsert({
            where: { companyId_externalJobId: { companyId: company.companyId, externalJobId: externalJob.id } },
            create: {
              companyId: company.companyId,
              externalJobId: externalJob.id,
              selectedCountry: item.country,
              status: inScope ? "QUALIFIED" : "OUT_OF_SCOPE",
              analysis: safeAnalysis,
              matching: candidateMatches,
              analyzedAt: new Date(),
            },
            update: {
              selectedCountry: item.country,
              status: inScope ? "QUALIFIED" : "OUT_OF_SCOPE",
              analysis: safeAnalysis,
              matching: candidateMatches,
              analyzedAt: new Date(),
            },
          });
        }
      } catch (error) {
        errors.push({
          companyId: company.companyId,
          sourceUrl,
          error: error instanceof Error ? error.message : "Erreur inconnue",
        });
      }
    }
  }

  const owner = await prisma.user.findFirst({ where: { role: "OWNER", status: "ACTIVE" }, select: { id: true } });
  if (owner) {
    await prisma.auditLog.create({
      data: {
        actorUserId: owner.id,
        actorRole: "SYSTEM",
        action: "ENTERPRISE_AUTOMATED_OFFER_SOURCING",
        targetType: "ENTERPRISE_SOURCING",
        details: { companies: companies.length, sources: sources.length, offers, qualified, matches, errors },
      },
    });
  }

  return NextResponse.json({ ok: true, companies: companies.length, sources: sources.length, offers, qualified, matches, errors });
}
