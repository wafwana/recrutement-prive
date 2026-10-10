import test from "node:test";
import assert from "node:assert/strict";
import { configuredSources, fetchGlobalJobs } from "@/lib/sourcing/global";
import { assertPublicDnsHost, isPublicIpAddress, isSafeHttpsUrl } from "@/lib/security/ssrf";
import { sanitizeAndValidateGeminiPayload } from "@/lib/ai/privacy";
import { getGeminiModel } from "@/lib/ai/gemini";
import { sanitizePublicOfferDescription } from "@/lib/sourcing/offer-analyzer";

test("configuredSources accepte uniquement des URLs HTTPS", () => {
  process.env.RP_GLOBAL_JOB_SOURCES = JSON.stringify([
    "https://example.com/jobs.json", "http://insecure.example/jobs.json", "not-a-url",
  ]);
  assert.deepEqual(configuredSources("RP_GLOBAL_JOB_SOURCES"), ["https://example.com/jobs.json"]);
});

test("fetchGlobalJobs normalise un flux JSON autorisé", async () => {
  const jobs = await fetchGlobalJobs("https://example.com/jobs.json", async () => new Response(JSON.stringify({
    jobs: [{ id: "job-1", title: "Senior Engineer", company: "Example", country: "India", skills: ["TypeScript", "PostgreSQL"], experienceYears: 5 }],
  }), { status: 200, headers: { "content-type": "application/json" } }));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.externalId, "job-1");
  assert.equal(jobs[0]?.companyName, "Example");
  assert.deepEqual(jobs[0]?.skills, ["TypeScript", "PostgreSQL"]);
});
test("SSRF guard rejects local, reserved, credentialed and literal IPv6 source URLs", () => {
  for (const url of [
    "https://localhost/jobs", "https://127.0.0.1/jobs", "https://10.0.0.5/jobs",
    "https://169.254.169.254/latest/meta-data", "https://100.64.0.1/jobs",
    "https://192.0.2.10/jobs", "https://224.0.0.1/jobs", "https://[::1]/jobs",
    "https://user:pass@example.com/jobs",
  ]) assert.equal(isSafeHttpsUrl(url).safe, false, url);
  assert.equal(isSafeHttpsUrl("https://jobs.example.com/feed").safe, true);
});

test("fetchGlobalJobs revalidates redirects and refuses a redirect to localhost", async () => {
  const requested: string[] = [];
  await assert.rejects(() => fetchGlobalJobs("https://example.com/jobs", async (url) => {
    requested.push(url.toString());
    return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
  }), /Source URL rejected/);
  assert.deepEqual(requested, ["https://example.com/jobs"]);
});
test("SSRF address classifier blocks private, link-local, mapped-private and special-use IPs", () => {
  for (const ip of ["10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "127.0.0.1", "100.64.0.1", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"]) {
    assert.equal(isPublicIpAddress(ip), false, ip);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(isPublicIpAddress(ip), true, ip);
  }
});

test("SSRF DNS guard rejects loopback and private host resolution", async () => {
  await assert.rejects(() => assertPublicDnsHost("localhost"), /non-public|private|reserved/i);
});


test("Gemini public-offer sanitizer strips URLs and contact data before inspection", () => {
  const result = sanitizeAndValidateGeminiPayload({
    title: "Senior Engineer https://jobs.example.com/123",
    location: "Paris",
    descriptionSummary: "Build APIs. website: https://example.com/app Contact recrutement@example.com",
  });
  assert.equal(result.allowed, true);
  assert.ok(result.sanitizedPrompt);
  assert.doesNotMatch(result.sanitizedPrompt || "", /https?:\/\/|@|website\s*:/i);
});

test("Gemini public-offer sanitizer still blocks candidate and confidential markers", () => {
  const candidate = sanitizeAndValidateGeminiPayload({
    title: "Poste ingénieur",
    location: "Paris",
    descriptionSummary: "Le candidat possède une expérience professionnelle.",
  });
  assert.equal(candidate.allowed, false);

  const confidential = sanitizeAndValidateGeminiPayload({
    title: "Directeur",
    location: "Paris",
    descriptionSummary: "Projet strictement confidentiel.",
  });
  assert.equal(confidential.allowed, false);
});


test("Gemini offer sanitization removes company name case-insensitively from title and summary", () => {
  const title = sanitizePublicOfferDescription("Senior Engineer — ACME GROUP", "Acme Group");
  const summary = sanitizePublicOfferDescription("Role at acme group. Apply at https://acme.example/jobs", "ACME GROUP");
  assert.doesNotMatch(title, /acme group/i);
  assert.doesNotMatch(summary, /acme group|https?:\/\//i);
});


test("Gemini defaults to a current economical model unless explicitly configured", () => {
  const originalModel = process.env.GEMINI_MODEL;
  try {
    delete process.env.GEMINI_MODEL;
    assert.equal(getGeminiModel(), "gemini-3.5-flash-lite");
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    assert.equal(getGeminiModel(), "gemini-3.8-flash");
  } finally {
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});
