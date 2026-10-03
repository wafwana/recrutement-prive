import test from "node:test";
import assert from "node:assert/strict";
import { configuredSources, fetchGlobalJobs } from "@/lib/sourcing/global";
import { assertPublicDnsHost, isPublicIpAddress, isSafeHttpsUrl } from "@/lib/security/ssrf";

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
    const jobs = await fetchGlobalJobs("https://example.com/jobs.json");
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.externalId, "job-1");
    assert.equal(jobs[0]?.companyName, "Example");
    assert.deepEqual(jobs[0]?.skills, ["TypeScript", "PostgreSQL"]);
  } finally { globalThis.fetch = originalFetch; }
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
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input, init) => {
    requested.push(String(input));
    assert.equal(init?.redirect, "manual");
    return new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
  };
  try {
    await assert.rejects(() => fetchGlobalJobs("https://example.com/jobs"), /Source URL rejected/);
    assert.deepEqual(requested, ["https://example.com/jobs"]);
  } finally { globalThis.fetch = originalFetch; }
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
