import test from "node:test";
import assert from "node:assert/strict";
import { configuredSources, fetchGlobalJobs } from "@/lib/sourcing/global";

test("configuredSources accepte uniquement des URLs HTTPS", () => {
  process.env.RP_GLOBAL_JOB_SOURCES = JSON.stringify([
    "https://example.com/jobs.json", "http://insecure.example/jobs.json", "not-a-url",
  ]);
  assert.deepEqual(configuredSources("RP_GLOBAL_JOB_SOURCES"), ["https://example.com/jobs.json"]);
});

test("fetchGlobalJobs normalise un flux JSON autorisé", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    jobs: [{ id: "job-1", title: "Senior Engineer", company: "Example", country: "India", skills: ["TypeScript", "PostgreSQL"], experienceYears: 5 }],
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const jobs = await fetchGlobalJobs("https://source.example/jobs.json");
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.externalId, "job-1");
    assert.equal(jobs[0]?.companyName, "Example");
    assert.deepEqual(jobs[0]?.skills, ["TypeScript", "PostgreSQL"]);
  } finally { globalThis.fetch = originalFetch; }
});
