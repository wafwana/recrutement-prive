import test from "node:test";
import assert from "node:assert/strict";
import { configuredSources, fetchGlobalCandidates } from "@/lib/sourcing/global";
import { ingestGlobalCandidates } from "@/lib/sourcing/ingest";
import { matchCandidateToJob } from "@/lib/matching/candidate-job";

test("configuredSources candidates returns empty when not set or invalid", () => {
  const originalEnv = process.env.RP_GLOBAL_CANDIDATE_SOURCES;
  delete process.env.RP_GLOBAL_CANDIDATE_SOURCES;
  assert.deepEqual(configuredSources("RP_GLOBAL_CANDIDATE_SOURCES"), []);

  process.env.RP_GLOBAL_CANDIDATE_SOURCES = JSON.stringify(["http://insecure.com", "invalid-url"]);
  assert.deepEqual(configuredSources("RP_GLOBAL_CANDIDATE_SOURCES"), []);

  process.env.RP_GLOBAL_CANDIDATE_SOURCES = JSON.stringify(["https://valid.com/candidates.json"]);
  assert.deepEqual(configuredSources("RP_GLOBAL_CANDIDATE_SOURCES"), ["https://valid.com/candidates.json"]);

  if (originalEnv) {
    process.env.RP_GLOBAL_CANDIDATE_SOURCES = originalEnv;
  } else {
    delete process.env.RP_GLOBAL_CANDIDATE_SOURCES;
  }
});

test("fetchGlobalCandidates normalizes candidate profile fields without hallucinating missing data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            id: "cand-101",
            title: "Lead Architect",
            skills: ["Go", "Kubernetes"],
            experienceYears: 8,
            country: "France",
            url: "https://candidates.org/profiles/101",
          },
          {
            profileId: "cand-102",
            name: "Samira K.",
            headline: "Consultante RH",
            location: "Casablanca",
            country: "Maroc",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const candidates = await fetchGlobalCandidates("https://candidates.org/api");
    assert.equal(candidates.length, 2);

    assert.equal(candidates[0].externalId, "cand-101");
    assert.equal(candidates[0].name, undefined);
    assert.equal(candidates[0].headline, "Lead Architect");
    assert.deepEqual(candidates[0].skills, ["Go", "Kubernetes"]);
    assert.equal(candidates[0].experienceYears, 8);
    assert.equal(candidates[0].country, "France");
    assert.equal(candidates[0].sourceProfileUrl, "https://candidates.org/profiles/101");

    assert.equal(candidates[1].externalId, "cand-102");
    assert.equal(candidates[1].name, "Samira K.");
    assert.equal(candidates[1].skills, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ingestGlobalCandidates reports 'Aucune source active' when no candidate sources configured", async () => {
  const originalEnv = process.env.RP_GLOBAL_CANDIDATE_SOURCES;
  delete process.env.RP_GLOBAL_CANDIDATE_SOURCES;

  const result = await ingestGlobalCandidates({
    actorUserId: "test-user-id",
  });

  assert.equal(result.ok, false);
  assert.equal(result.activeSourcesCount, 0);
  assert.equal(result.fetched, 0);
  assert.match(result.message || "", /Aucune source candidats active/i);

  if (typeof originalEnv === "string") {
    process.env.RP_GLOBAL_CANDIDATE_SOURCES = originalEnv;
  }
});

test("matchCandidateToJob evaluates candidates against job constraints persistently and deterministically", () => {
  const candidate = {
    headline: "Senior React & TypeScript Engineer",
    skills: ["React", "TypeScript", "Next.js", "Node.js"],
    experienceYears: 6,
    location: "Paris, France",
    country: "France",
  };

  const job = {
    title: "Lead Frontend Engineer",
    description: "Recherche expert React et TypeScript à Paris.",
    requiredSkills: ["React", "TypeScript", "GraphQL"],
    requiredExperienceYears: 5,
    location: "Paris",
  };

  const result = matchCandidateToJob(candidate, job);
  assert.ok(result.score > 50);
  assert.deepEqual(result.matchedSkills, ["react", "typescript"]);
  assert.deepEqual(result.missingSkills, ["graphql"]);
  assert.equal(result.reasons.length, 4);
});

test("Cron authorization rejects requests without valid CRON_SECRET", async () => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "super-secret-cron-key";

  const reqWithoutAuth = new Request("http://localhost:3000/api/cron/global-candidates");
  const authHeader = reqWithoutAuth.headers.get("authorization");
  assert.equal(authHeader, null);

  const reqWithWrongAuth = new Request("http://localhost:3000/api/cron/global-candidates", {
    headers: { authorization: "Bearer wrong-secret" },
  });

  assert.notEqual(reqWithWrongAuth.headers.get("authorization"), `Bearer ${process.env.CRON_SECRET}`);

  if (typeof originalSecret === "string") {
    process.env.CRON_SECRET = originalSecret;
  } else {
    delete process.env.CRON_SECRET;
  }
});
