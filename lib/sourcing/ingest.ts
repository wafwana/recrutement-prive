import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchGlobalJobs, fetchGlobalCandidates, configuredSources, getConfiguredSourcesAsync } from "@/lib/sourcing/global";
import { qualifyAndMatchExternalOffer } from "@/lib/jobs/offer-pipeline";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

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

export async function ingestGlobalJobs(sourceUrl: string, actorUserId: string) {
  const items = await fetchGlobalJobs(sourceUrl);
  let created = 0, updated = 0, qualified = 0, matched = 0, expired = 0;
  const now = new Date();

  for (const item of items) {
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

  const sweptExpired = await markExpiredGlobalJobs();

  await prisma.auditLog.create({
    data: {
      actorUserId,
      actorRole: "SYSTEM",
      action: "GLOBAL_JOB_SOURCING",
      targetType: "EXTERNAL_JOB_SOURCE",
      details: { sourceUrl, fetched: items.length, created, updated, qualified, matched, expired, sweptExpired },
    },
  });

  return { sourceUrl, fetched: items.length, created, updated, qualified, matched, expired, sweptExpired };
}

export type CandidateSourcingFilter = {
  query?: string;
  skills?: string[];
  country?: string;
  jobId?: string;
};

export async function ingestGlobalCandidates(params: {
  sourceUrl?: string;
  filter?: CandidateSourcingFilter;
  actorUserId: string;
}) {
  const { sourceUrl, filter, actorUserId } = params;
  const sources = sourceUrl && /^https:\/\//i.test(sourceUrl)
    ? [sourceUrl]
    : await getConfiguredSourcesAsync("RP_GLOBAL_CANDIDATE_SOURCES");

  if (!sources.length) {
    return {
      ok: false,
      activeSourcesCount: 0,
      message: "Aucune source candidats active. Veuillez configurer RP_GLOBAL_CANDIDATE_SOURCES avec des URLs HTTPS valides.",
      fetched: 0,
      created: 0,
      updated: 0,
      matched: 0,
      results: [],
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
  const results: Array<{ sourceUrl: string; fetched: number; created: number; updated: number; matched: number; error?: string }> = [];

  const sourceCollectedAt = new Date();

  for (const source of sources) {
    try {
      const candidates = await fetchGlobalCandidates(source);
      let created = 0;
      let updated = 0;
      let matched = 0;

      for (const candidate of candidates) {
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
            updated++;
          } else {
            await prisma.sourcedCandidate.create({
              data: { ...data, externalId: candidate.externalId },
            });
            created++;
          }
        } else {
          await prisma.sourcedCandidate.create({ data });
          created++;
        }
      }

      totalFetched += candidates.length;
      totalCreated += created;
      totalUpdated += updated;
      totalMatched += matched;

      results.push({ sourceUrl: source, fetched: candidates.length, created, updated, matched });
    } catch (err) {
      results.push({
        sourceUrl: source,
        fetched: 0,
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
    created: totalCreated,
    updated: totalUpdated,
    matched: totalMatched,
    results,
  };
}
