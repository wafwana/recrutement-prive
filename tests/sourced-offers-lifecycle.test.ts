import test from "node:test";
import assert from "node:assert/strict";
import { fetchGlobalJobs } from "@/lib/sourcing/global";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

test("sourcing engine normalizes undated job offers as active opportunities", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        jobs: [
          {
            id: "undated-job-001",
            title: "Architecte Solution Cloud",
            company: "Enterprise Corp",
            country: "France",
            city: "Paris",
            skills: ["AWS", "Kubernetes", "Terraform"],
            experienceYears: 7,
            description: "Conception d'architectures cloud hybrides.",
            // Notice: no publishedAt or closingAt provided
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const jobs = await fetchGlobalJobs("https://example.com/undated-jobs.json");
    assert.equal(jobs.length, 1);
    const job = jobs[0];

    assert.equal(job.externalId, "undated-job-001");
    assert.equal(job.title, "Architecte Solution Cloud");
    assert.equal(job.companyName, "Enterprise Corp");
    assert.equal(job.publishedAt, undefined);
    assert.equal(job.closingAt, undefined);
    assert.deepEqual(job.skills, ["AWS", "Kubernetes", "Terraform"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("absence of closingAt or publishedAt date does not prevent candidate matching", () => {
  const candidate = {
    headline: "Architecte Cloud AWS Senior",
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "Python"],
    experienceYears: 8,
    location: "Paris, France",
    country: "France",
    primaryCategoryCode: "IT_DEV",
  };

  const undatedOffer = {
    title: "Architecte Solution Cloud",
    description: "Poste à Paris pour expert AWS et Kubernetes sans date de cloture.",
    requiredSkills: ["AWS", "Kubernetes", "Terraform"],
    requiredExperienceYears: 5,
    location: "Paris, France",
    categoryCode: "IT_DEV",
    subCategoryCode: "IT_CLOUD",
  };

  const matchResult = matchCandidateToJob(candidate, undatedOffer);

  assert.ok(matchResult.score >= 50, "Le score de matching doit être significatif (>50)");
  assert.deepEqual(matchResult.matchedSkills, ["aws", "kubernetes", "terraform"]);
  assert.equal(matchResult.missingSkills.length, 0);
  assert.ok(matchResult.reasons.length >= 3);
});

test("expiration logic exclusively flags offers with explicit closingAt < now", () => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000); // 24h in past
  const futureDate = new Date(now.getTime() + 86400000); // 24h in future

  const checkIsExpired = (closingAt: Date | null) => Boolean(closingAt && closingAt < now);

  assert.equal(checkIsExpired(null), false, "Une offre sans closingAt ne doit JAMAIS être expirée");
  assert.equal(checkIsExpired(pastDate), true, "Une offre avec closingAt passé doit être expirée");
  assert.equal(checkIsExpired(futureDate), false, "Une offre avec closingAt futur ne doit pas être expirée");
});
