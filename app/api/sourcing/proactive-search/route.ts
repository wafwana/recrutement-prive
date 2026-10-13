import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth, getActiveSessionContext } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { RP_TAXONOMY } from "@/lib/taxonomy/rp-taxonomy";
import { classifyProactiveCandidate } from "@/lib/sourcing/proactive-classification";
import { ingestGlobalCandidates } from "@/lib/sourcing/ingest";

const searchSchema = z.object({
  sectorCode: z.string().trim().min(1).max(100),
  professionCode: z.string().trim().max(100).optional(),
  query: z.string().trim().max(160).optional(),
  country: z.string().trim().max(100).optional(),
  skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
}).refine((value) => Boolean(value.query || value.professionCode || value.skills?.length), {
  message: "Indique au moins un métier, une compétence ou un synonyme.",
});

async function requireSourcingActor() {
  const active = getActiveSessionContext();
  const session = active || (await auth());
  const userId = typeof session?.user?.id === "string" ? session.user.id : null;
  const role = typeof session?.user?.role === "string" ? session.user.role : null;
  if (!userId || !["OWNER", "ADMIN", "CONSULTANT"].includes(role || "")) return null;
  if (!(await hasPermission(userId, role || undefined, "SOURCING"))) return null;
  if (!(await hasPermission(userId, role || undefined, "METIERS_DOSSIERS"))) return null;
  return { userId, role };
}

export async function POST(request: Request) {
  const actor = await requireSourcingActor();
  if (!actor) return NextResponse.json({ error: "Accès au sourcing proactif non autorisé." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Critères de recherche invalides." }, { status: 400 });
  }

  const sector = RP_TAXONOMY.find((item) => item.code === parsed.data.sectorCode);
  if (!sector) return NextResponse.json({ error: "Secteur inconnu dans la taxonomie." }, { status: 400 });
  const profession = parsed.data.professionCode
    ? sector.subcategories.find((item) => item.code === parsed.data.professionCode)
    : undefined;
  if (parsed.data.professionCode && !profession) {
    return NextResponse.json({ error: "Le métier sélectionné n'appartient pas au secteur choisi." }, { status: 400 });
  }

  const query = parsed.data.query || profession?.name.fr || "";
  const skills = parsed.data.skills !== undefined
    ? [...new Set(parsed.data.skills)]
    : !profession
      ? sector.subcategories.map((item) => item.name.fr)
      : undefined;
  const title = profession ? `${profession.name.fr} — ${sector.name.fr}` : sector.name.fr;

  const search = await prisma.proactiveSearch.create({
    data: {
      title,
      sectorCode: sector.code,
      professionCode: profession?.code || null,
      query: query || null,
      country: parsed.data.country || null,
      skills: skills ? (skills as unknown as Prisma.InputJsonValue) : undefined,
      criteria: {
        query,
        country: parsed.data.country || null,
        skills: skills || [],
        sourceMode: "configured-external-and-internal-fallback",
        jobIndependent: true,
      } as Prisma.InputJsonValue,
      status: "RUNNING",
      createdByUserId: actor.userId,
      startedAt: new Date(),
    },
  });

  try {
    const ingestion = await ingestGlobalCandidates({
      actorUserId: actor.userId,
      maxItems: 10,
      filter: {
        query: query || undefined,
        country: parsed.data.country || undefined,
        skills,
      },
    });

    const candidateIds = [...new Set(ingestion.candidateIds || [])];
    const createdCandidateIds = new Set(ingestion.createdCandidateIds || []);
    const candidates = candidateIds.length
      ? await prisma.sourcedCandidate.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, externalId: true, source: true, headline: true, skills: true, status: true, sourceProfileUrl: true },
        })
      : [];

    const internalProfileIds = [...new Set(candidates
      .filter((candidate) => candidate.source === "PLATFORM_CVTHEQUE" && candidate.externalId?.startsWith("platform:"))
      .map((candidate) => candidate.externalId!.slice("platform:".length))
      .filter(Boolean))];
    const internalProfiles = internalProfileIds.length
      ? await prisma.candidateProfile.findMany({
          where: { id: { in: internalProfileIds } },
          select: {
            id: true,
            documents: {
              where: { docType: "CV" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { analysis: true, analyzedAt: true },
            },
          },
        })
      : [];
    const internalCvByProfileId = new Map(internalProfiles.map((profile) => [profile.id, profile.documents[0] || null]));

    const classified = candidates.map((candidate) => {
      const profileId = candidate.source === "PLATFORM_CVTHEQUE" && candidate.externalId?.startsWith("platform:")
        ? candidate.externalId.slice("platform:".length)
        : null;
      const document = profileId ? internalCvByProfileId.get(profileId) : null;
      const storedAnalysis = document?.analysis && typeof document.analysis === "object" && !Array.isArray(document.analysis)
        ? document.analysis as Record<string, unknown>
        : null;
      const cvAnalyzed = Boolean(
        document?.analyzedAt &&
        storedAnalysis &&
        Array.isArray(storedAnalysis.skills) &&
        Array.isArray(storedAnalysis.subCategoryCodes) &&
        Object.prototype.hasOwnProperty.call(storedAnalysis, "primaryCategoryCode"),
      );
      return {
        candidate,
        cvAnalyzed,
        ...classifyProactiveCandidate({
          sector,
          profession,
          headline: cvAnalyzed && typeof storedAnalysis?.headline === "string" ? storedAnalysis.headline : candidate.headline,
          skills: cvAnalyzed ? storedAnalysis?.skills : candidate.skills,
          cvAnalyzed,
        }),
      };
    });

    // Notify the internal team about newly discovered profiles before creating their classification records.
    for (const item of classified) {
      if (!createdCandidateIds.has(item.candidate.id)) continue;
      await prisma.ownerNotification.create({
        data: {
          title: `Nouveau profil sourcé — ${item.targetProfession?.name.fr || sector.name.fr}`,
          message: `Un nouveau profil public a été découvert via « ${title} ». Classement proposé : ${item.isClassified ? item.targetProfession?.name.fr : "À qualifier"}. ${item.rationale} CV : non analysé ; aucune prise de contact n'a été effectuée.`,
          senderName: "Sourcing proactif",
          senderRole: "SYSTEM",
          status: "UNREAD",
        },
      });
    }

    for (const item of classified) {
      await prisma.proactiveSearchResult.upsert({
        where: { searchId_sourcedCandidateId: { searchId: search.id, sourcedCandidateId: item.candidate.id } },
        create: {
          searchId: search.id,
          sourcedCandidateId: item.candidate.id,
          source: item.candidate.source,
          primarySectorCode: item.isClassified ? sector.code : null,
          primaryProfessionCode: item.isClassified ? item.targetProfession?.code || null : null,
          secondaryMatches: item.targetProfession && profession && item.targetProfession.code !== profession.code
            ? [item.targetProfession.code] as unknown as Prisma.InputJsonValue
            : undefined,
          score: item.score,
          confidence: item.confidence,
          rationale: item.rationale,
          cvStatus: item.candidate.source === "PLATFORM_CVTHEQUE" ? "NOT_ANALYZED" : "NOT_PROVIDED",
          status: item.isClassified ? "CLASSIFIED_AFTER_NOTIFICATION" : "TO_QUALIFY",
        },
        update: {
          source: item.candidate.source,
          primarySectorCode: item.isClassified ? sector.code : null,
          primaryProfessionCode: item.isClassified ? item.targetProfession?.code || null : null,
          score: item.score,
          confidence: item.confidence,
          rationale: item.rationale,
          cvStatus: item.candidate.source === "PLATFORM_CVTHEQUE" ? "NOT_ANALYZED" : "NOT_PROVIDED",
          status: item.isClassified ? "CLASSIFIED_AFTER_NOTIFICATION" : "TO_QUALIFY",
        },
      });
    }

    const sourceResults = (ingestion.results || []) as Array<{ sourceUrl: string; fetched: number; sourceTotal: number; created: number; updated: number; matched: number; error?: string }>;
    const failedSources = sourceResults.filter((result) => Boolean(result.error));
    const finalStatus = failedSources.length ? (candidates.length ? "PARTIAL" : "FAILED") : "COMPLETED";
    const updated = await prisma.proactiveSearch.update({
      where: { id: search.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        sourceSummary: {
          activeSourcesCount: ingestion.activeSourcesCount,
          fetched: ingestion.fetched,
          created: ingestion.created,
          updated: ingestion.updated,
          matched: ingestion.matched,
          fallbackSource: ingestion.fallbackSource || null,
          externalSourcesAllFailed: ingestion.externalSourcesAllFailed || false,
          sources: ingestion.results || [],
          resultCount: classified.length,
          classifiedCount: classified.filter((item) => item.isClassified).length,
          toQualifyCount: classified.filter((item) => !item.isClassified).length,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      ok: true,
      search: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        resultCount: classified.length,
        classifiedCount: classified.filter((item) => item.isClassified).length,
        toQualifyCount: classified.filter((item) => !item.isClassified).length,
        sources: ingestion.results || [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant la recherche.";
    await prisma.proactiveSearch.update({
      where: { id: search.id },
      data: { status: "FAILED", completedAt: new Date(), lastError: message },
    });
    return NextResponse.json({ error: "La recherche n'a pas pu aboutir.", details: message, searchId: search.id }, { status: 500 });
  }
}
