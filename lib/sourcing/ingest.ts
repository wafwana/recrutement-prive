import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchGlobalJobs, fetchGlobalCandidates, configuredSources, getConfiguredSourcesAsync } from "@/lib/sourcing/global";
import { qualifyAndMatchExternalOffer } from "@/lib/jobs/offer-pipeline";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";
import { readBatchOffset, writeBatchOffset } from "@/lib/sourcing/batch-state";

export async function markExpiredGlobalJobs() {
  const now = new Date();
  const updated = await prisma.externalJobOpportunity.updateMany({
    where: {
      closingAt: { lt: now },
      status: { notIn: ["EXPIRED", "ARCHIVED", "REJECTED"] },
    },
    data: {
      status: "EXPIRED",
      updatedAt: now,
    },
  });
  return updated.count;
}

export async function ingestGlobalJobs(sourceUrl: string, actorUserId: string, options?: { maxItems?: number }) {
  const items = await fetchGlobalJobs(sourceUrl);
  const maxItems = Math.min(20, Math.max(1, options?.maxItems ?? 20));
  const batchKey = `sourcing:global-jobs-batch:${encodeURIComponent(sourceUrl)}`;
  const offset = await readBatchOffset(batchKey, items.length);
  const batch = items.length > maxItems
    ? Array.from({ length: maxItems }, (_, index) => items[(offset + index) % items.length])
    : items;
  let created = 0, updated = 0, qualified = 0, matched = 0, expired = 0;
  const now = new Date();

  for (const item of batch) {
    const publishedAt = item.publishedAt ? new Date(item.publishedAt) : null;
    const closingAt = item.closingAt ? new Date(item.closingAt) : null;
    const isExpired = Boolean(closingAt && closingAt < now);
    if (isExpired) expired++;

    const rawData = item.raw === undefined ? undefined : JSON.parse(JSON.stringify(item.raw)) as Prisma.InputJsonValue;
    const sourceCollectedAt = new Date();

    const existing = await prisma.externalJobOpportunity.findUnique({
      where: { source_externalId: { source: item.source, externalId: item.externalId } },
      select: { id: true, status: true },
    });

    const targetStatus = isExpired
      ? "EXPIRED"
      : existing?.status && ["QUALIFIED", "OUT_OF_SCOPE", "ARCHIVED", "REJECTED"].includes(existing.status)
      ? existing.status
      : "DETECTED";

    const saved = await prisma.externalJobOpportunity.upsert({
      where: { source_externalId: { source: item.source, externalId: item.externalId } },
      create: {
        externalId: item.externalId,
        source: item.source,
        sourceUrl: item.sourceUrl,
        sourceType: "PUBLIC_JOB_SOURCE",
        sourceCollectedAt,
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
        rawData,
        status: targetStatus,
      },
      update: {
        sourceUrl: item.sourceUrl,
        sourceType: "PUBLIC_JOB_SOURCE",
        sourceCollectedAt,
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
        rawData,
        status: targetStatus,
        updatedAt: now,
      },
      select: { id: true, status: true },
    });

    if (existing) updated++; else created++;

    if (!isExpired && (!existing || ["DETECTED", "A_QUALIFIER"].includes(existing.status))) {
      try {
        const qRes = await qualifyAndMatchExternalOffer(saved.id);
        if (qRes.qualified) {
          qualified++;
          if (qRes.matchesCount > 0) matched++;
        }
      } catch (err) {
        console.warn("[ingestGlobalJobs] Auto qualification error for job", saved.id, err);
      }
    }
  }

  if (items.length > 0 && batch.length > 0) await writeBatchOffset(batchKey, offset + batch.length, items.length);

  const sweptExpired = await markExpiredGlobalJobs();

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole: "SYSTEM",
      action: "GLOBAL_JOB_SOURCING",
      targetType: "EXTERNAL_JOB_SOURCE",
      details: { sourceUrl, fetched: batch.length, sourceTotal: items.length, batchLimit: maxItems, created, updated, qualified, matched, expired, sweptExpired },
    },
  });

  return { sourceUrl, fetched: batch.length, sourceTotal: items.length, batchLimit: maxItems, created, updated, qualified, matched, expired, sweptExpired };
}

async function rematchSourcedCandidateAgainstQualifiedOffers(candidateId: string) {
  const candidate = await prisma.sourcedCandidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true, status: true, source: true, skills: true, experienceYears: true,
      headline: true, location: true, matchingDetails: true,
    },
  });
  if (!candidate || ["REJECTED", "ARCHIVED"].includes(candidate.status)) {
    return { candidateId, evaluated: 0, matches: 0, bestScore: 0 };
  }

  const offers = await prisma.externalJobOpportunity.findMany({
    where: { status: { in: ["QUALIFIED", "MATCHING"] } },
    select: {
      id: true, title: true, description: true, country: true, city: true,
      skills: true, experienceYears: true, categoryCode: true, subCategoryCode: true, source: true,
    },
    orderBy: { sourceCollectedAt: "desc" },
    take: 1000,
  });

  const matches = offers
    .map((offer) => {
      const result = matchCandidateToJob(
        {
          skills: candidate.skills,
          experienceYears: candidate.experienceYears,
          headline: candidate.headline,
          location: candidate.location,
        },
        {
          requiredSkills: offer.skills,
          requiredExperienceYears: offer.experienceYears,
          title: offer.title,
          description: offer.description,
          location: [offer.city, offer.country].filter(Boolean).join(", ") || null,
          categoryCode: offer.categoryCode,
          subCategoryCode: offer.subCategoryCode,
        },
      );
      return {
        externalJobId: offer.id,
        title: offer.title,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        categoryMatchLevel: result.categoryMatchLevel,
        reasons: result.reasons,
        source: offer.source,
      };
    })
    .filter((match) => match.score >= 25)
    .sort((a, b) => b.score - a.score);

  const previousDetails =
    candidate.matchingDetails && typeof candidate.matchingDetails === "object" && !Array.isArray(candidate.matchingDetails)
      ? candidate.matchingDetails as Record<string, unknown>
      : {};

  await prisma.sourcedCandidate.update({
    where: { id: candidate.id },
    data: {
      matchingScore: matches[0]?.score ?? 0,
      matchingDetails: {
        ...previousDetails,
        mode: previousDetails.mode || "CANDIDATE_TO_OFFER",
        rematchedAt: new Date().toISOString(),
        offersEvaluated: offers.length,
        matchedOffers: matches.slice(0, 20),
        humanValidated: candidate.status === "VALIDATED",
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    candidateId: candidate.id,
    evaluated: offers.length,
    matches: matches.length,
    bestScore: matches[0]?.score ?? 0,
  };
}

export async function refreshProactiveCandidatePool(actorUserId: string) {
  const demandRows = await prisma.externalJobOpportunity.findMany({
    where: {
      status: { in: ["QUALIFIED", "MATCHING"] },
    },
    select: { skills: true, categoryCode: true, subCategoryCode: true },
    orderBy: { sourceCollectedAt: "desc" },
    take: 500,
  });

  const demand = new Map<string, number>();
  for (const row of demandRows) {
    for (const skill of Array.isArray(row.skills) ? row.skills : []) {
      if (typeof skill !== "string" || !skill.trim()) continue;
      const key = skill.trim().toLowerCase();
      demand.set(key, (demand.get(key) ?? 0) + 1);
    }
  }
  const topDemand = [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);

  const candidates = await prisma.candidateProfile.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { name: true } } },
    take: 1000,
  });

  const batch = candidates.slice(0, maxItems);
  let created = 0;
  let updated = 0;
  for (const candidate of batch) {
    const candidateSkills = Array.isArray(candidate.skills)
      ? candidate.skills.filter((v): v is string => typeof v === "string").map((v) => v.toLowerCase())
      : [];
    const demandMatches = topDemand.filter(([skill]) => candidateSkills.includes(skill));
    const demandScore = demandMatches.reduce((sum, [, weight]) => sum + weight, 0);
    const potentialScore = Math.min(100, demandScore * 5 + Math.min(20, (candidate.experienceYears ?? 0) * 2) + (candidate.headline ? 10 : 0));
    const matchingDetails = {
      mode: "PROACTIVE_TALENT_POOL",
      demandScore,
      potentialScore,
      matchedDemandSkills: demandMatches.slice(0, 10).map(([skill]) => skill),
      humanValidated: false,
    } as unknown as Prisma.InputJsonValue;

    const externalId = `platform:${candidate.id}`;
    const existing = await prisma.sourcedCandidate.findUnique({
      where: { source_externalId: { source: "PLATFORM_CVTHEQUE", externalId } },
      select: { id: true, status: true },
    });
    const finished = existing && ["VALIDATED", "REJECTED", "ARCHIVED", "CONTACTED"].includes(existing.status);
    const data = {
      source: "PLATFORM_CVTHEQUE",
      sourceProfileUrl: null,
      sourceCollectedAt: new Date(),
      name: candidate.user.name || null,
      headline: candidate.headline || null,
      location: candidate.location || candidate.country || null,
      skills: candidateSkills.length ? (candidateSkills as unknown as Prisma.InputJsonValue) : undefined,
      experienceYears: candidate.experienceYears ?? null,
      matchingScore: potentialScore,
      matchingDetails,
      notes: "Viviers proactif : candidat classé selon la demande du marché, sans contact automatique.",
      createdByUserId: actorUserId,
    };

    if (existing) {
      await prisma.sourcedCandidate.update({
        where: { id: existing.id },
        data: { ...data, status: finished ? existing.status : "DETECTED", updatedAt: new Date() },
      });
      if (!finished) await rematchSourcedCandidateAgainstQualifiedOffers(existing.id);
      updated++;
    } else {
      const createdCandidate = await prisma.sourcedCandidate.create({ data: { ...data, externalId, status: "DETECTED" } });
      await rematchSourcedCandidateAgainstQualifiedOffers(createdCandidate.id);
      created++;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole: "SYSTEM",
      action: "GLOBAL_CANDIDATE_SOURCING",
      targetType: "PROACTIVE_TALENT_POOL",
      details: {
        mode: "PROACTIVE_TALENT_POOL",
        demandSignals: topDemand.slice(0, 20).map(([skill, count]) => ({ skill, count })),
        candidatesEvaluated: candidates.length,
        created,
        updated,
        humanValidated: false,
      },
    },
  });

  return { mode: "PROACTIVE_TALENT_POOL", demandSignals: topDemand.length, candidatesEvaluated: candidates.length, created, updated };
}

export type CandidateSourcingFilter = {
  query?: string;
  skills?: string[];
  country?: string;
  jobId?: string;
};

async function ingestPlatformCvthequeCandidates(actorUserId: string, options?: { maxItems?: number }) {
  const maxItems = Math.min(20, Math.max(1, options?.maxItems ?? 10));
  const candidates = await prisma.candidateProfile.findMany({
    where: { status: "ACTIVE" },
    include: { user: { select: { name: true } } },
    take: 1000,
  });

  let created = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const externalId = `platform:${candidate.id}`;
    const data = {
      source: "PLATFORM_CVTHEQUE",
      sourceProfileUrl: null,
      sourceCollectedAt: new Date(),
      name: candidate.user.name || null,
      headline: candidate.headline || null,
      location: candidate.location || candidate.country || null,
      skills: candidate.skills && Array.isArray(candidate.skills)
        ? candidate.skills as Prisma.InputJsonValue
        : undefined,
      experienceYears: candidate.experienceYears ?? null,
      notes: "Projection interne de la CVthèque : utilisée pour le matching, jamais contactée automatiquement.",
      createdByUserId: actorUserId,
    };

    const existing = await prisma.sourcedCandidate.findUnique({
      where: { source_externalId: { source: "PLATFORM_CVTHEQUE", externalId } },
      select: { id: true, status: true },
    });

    if (existing) {
      const isFinished = ["VALIDATED", "REJECTED", "ARCHIVED", "CONTACTED"].includes(existing.status);
      await prisma.sourcedCandidate.update({
        where: { id: existing.id },
        data: {
          ...data,
          status: isFinished ? existing.status : "DETECTED",
          updatedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.sourcedCandidate.create({
        data: { ...data, externalId, status: "DETECTED" },
      });
      created++;
    }
  }

  return { fetched: batch.length, sourceTotal: candidates.length, batchLimit: maxItems, created, updated };
}

export async function ingestGlobalCandidates(params: {
  sourceUrl?: string;
  filter?: CandidateSourcingFilter;
  actorUserId: string;
  maxItems?: number;
}) {
  const { sourceUrl, filter, actorUserId } = params;
  const maxItems = Math.min(20, Math.max(1, params.maxItems ?? 10));
  const sources = sourceUrl && /^https:\/\//i.test(sourceUrl)
    ? [sourceUrl]
    : await getConfiguredSourcesAsync("RP_GLOBAL_CANDIDATE_SOURCES");

  if (!sources.length) {
    const internal = await ingestPlatformCvthequeCandidates(actorUserId, { maxItems });
    await prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: "SYSTEM",
        action: "GLOBAL_CANDIDATE_SOURCING",
        targetType: "PLATFORM_CVTHEQUE",
        details: {
          activeSourcesCount: 0,
          fallbackSource: "PLATFORM_CVTHEQUE",
          ...internal,
          matched: 0,
        },
      },
    });
    return {
      ok: true,
      activeSourcesCount: 1,
      fallbackSource: "PLATFORM_CVTHEQUE",
      message: "Aucune source externe configurée : la CVthèque interne alimente le sourcing candidat et le matching.",
      fetched: internal.fetched,
      sourceTotal: internal.sourceTotal,
      batchLimit: internal.batchLimit,
      created: internal.created,
      updated: internal.updated,
      matched: 0,
      results: [{
        sourceUrl: "PLATFORM_CVTHEQUE",
        fetched: internal.fetched,
        sourceTotal: internal.sourceTotal,
        batchLimit: internal.batchLimit,
        created: internal.created,
        updated: internal.updated,
        matched: 0,
      }],
    };
  }

  const targetJob = filter?.jobId
    ? await prisma.job.findUnique({
        where: { id: filter.jobId },
        include: { jobCategory: { select: { code: true } }, subCategory: { select: { code: true } } },
      })
    : null;

  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalMatched = 0;
  const results: Array<{ sourceUrl: string; fetched: number; sourceTotal: number; batchLimit: number; created: number; updated: number; matched: number; error?: string }> = [];

  const sourceCollectedAt = new Date();

  for (const source of sources) {
    try {
      const candidates = await fetchGlobalCandidates(source);
      const batchKey = `sourcing:global-candidates-batch:${encodeURIComponent(source)}`;
      const offset = await readBatchOffset(batchKey, candidates.length);
      const batch = candidates.length > maxItems
        ? Array.from({ length: maxItems }, (_, index) => candidates[(offset + index) % candidates.length])
        : candidates;
      let created = 0;
      let updated = 0;
      let matched = 0;

      for (const candidate of batch) {
        if (filter?.query) {
          const q = filter.query.toLowerCase();
          const matchTitle = (candidate.headline || "").toLowerCase().includes(q);
          const matchSkills = (candidate.skills || []).some((s) => s.toLowerCase().includes(q));
          if (!matchTitle && !matchSkills) continue;
        }

        if (filter?.country && candidate.country) {
          if (candidate.country.toLowerCase() !== filter.country.toLowerCase()) continue;
        }

        if (filter?.skills && filter.skills.length > 0) {
          const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase());
          const hasSkill = filter.skills.some((reqSkill) => candidateSkills.includes(reqSkill.toLowerCase()));
          if (!hasSkill) continue;
        }

        let score: number | null = null;
        let matchDetails: Prisma.InputJsonValue | undefined = undefined;

        if (targetJob) {
          const result = matchCandidateToJob(
            {
              skills: candidate.skills,
              experienceYears: candidate.experienceYears,
              headline: candidate.headline,
              location: candidate.location,
              country: candidate.country,
            },
            {
              requiredSkills: targetJob.requiredSkills,
              requiredExperienceYears: targetJob.requiredExperienceYears,
              title: targetJob.title,
              description: targetJob.description,
              location: targetJob.location,
              categoryCode: targetJob.jobCategory?.code,
              subCategoryCode: targetJob.subCategory?.code,
            }
          );
          score = result.score;
          matchDetails = { jobId: targetJob.id, externalId: candidate.externalId, match: result } as unknown as Prisma.InputJsonValue;
          if (score > 0) matched++;
        }

        const initialStatus: "MATCHED" | "DETECTED" = targetJob ? "MATCHED" : "DETECTED";

        const data = {
          source: candidate.source,
          sourceProfileUrl: candidate.sourceProfileUrl,
          sourceCollectedAt,
          name: candidate.name || null,
          headline: candidate.headline || null,
          location: candidate.location || candidate.country || null,
          skills: candidate.skills && candidate.skills.length ? (candidate.skills as unknown as Prisma.InputJsonValue) : undefined,
          experienceYears: candidate.experienceYears ?? null,
          status: initialStatus,
          matchingScore: score,
          matchingDetails: matchDetails,
          notes: candidate.country ? `Pays source : ${candidate.country}` : undefined,
          createdByUserId: actorUserId,
        };

        if (candidate.externalId) {
          const existing = await prisma.sourcedCandidate.findUnique({
            where: { source_externalId: { source: candidate.source, externalId: candidate.externalId } },
            select: { id: true, status: true },
          });

          if (existing) {
            const isFinished = ["VALIDATED", "REJECTED", "ARCHIVED", "CONTACTED"].includes(existing.status);
            const statusToSet = isFinished ? existing.status : data.status;

            await prisma.sourcedCandidate.update({
              where: { id: existing.id },
              data: {
                ...data,
                status: statusToSet,
                updatedAt: new Date(),
              },
            });
            if (!isFinished) await rematchSourcedCandidateAgainstQualifiedOffers(existing.id);
            updated++;
          } else {
            const createdCandidate = await prisma.sourcedCandidate.create({
              data: { ...data, externalId: candidate.externalId },
            });
            await rematchSourcedCandidateAgainstQualifiedOffers(createdCandidate.id);
            created++;
          }
        } else {
          const createdCandidate = await prisma.sourcedCandidate.create({ data });
          await rematchSourcedCandidateAgainstQualifiedOffers(createdCandidate.id);
          created++;
        }
      }

      if (candidates.length > 0 && batch.length > 0) {
        await writeBatchOffset(batchKey, offset + batch.length, candidates.length);
      }

      totalFetched += batch.length;
      totalCreated += created;
      totalUpdated += updated;
      totalMatched += matched;

      results.push({ sourceUrl: source, fetched: batch.length, sourceTotal: candidates.length, batchLimit: maxItems, created, updated, matched });
    } catch (err) {
      results.push({
        sourceUrl: source,
        fetched: 0,
        sourceTotal: 0,
        batchLimit: maxItems,
        created: 0,
        updated: 0,
        matched: 0,
        error: err instanceof Error ? err.message : "Source inaccessible",
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole: "SYSTEM",
      action: "GLOBAL_CANDIDATE_SOURCING",
      targetType: targetJob ? "JOB" : "GLOBAL_CANDIDATE_SOURCING",
      targetId: targetJob?.id || null,
      details: {
        activeSourcesCount: sources.length,
        fetched: totalFetched,
        batchLimit: maxItems,
        created: totalCreated,
        updated: totalUpdated,
        matched: totalMatched,
        results,
      },
    },
  });

  return {
    ok: true,
    activeSourcesCount: sources.length,
    fetched: totalFetched,
    batchLimit: maxItems,
    created: totalCreated,
    updated: totalUpdated,
    matched: totalMatched,
    results,
  };
}
