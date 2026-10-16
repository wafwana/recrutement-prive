import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { runWithTestSession } from "../auth";
import { getConfiguredSourcesAsync, hasExplicitConfiguredSources } from "../lib/sourcing/global";
import { POST as saveCandidateSourceConfig } from "../app/api/owner/sourcing/config/route";

const SETTING_KEY = "sourcing:candidate_sources";
const ENV_KEY = "RP_GLOBAL_CANDIDATE_SOURCES";

function sourceConfigRequest(sources: string[]) {
  return new Request("http://localhost/api/owner/sourcing/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sources }),
  });
}

async function restoreCandidateSourcesSetting(original: { value: unknown } | null) {
  if (original) {
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: original.value as never },
      update: { value: original.value as never },
    });
  } else {
    await prisma.systemSetting.deleteMany({ where: { key: SETTING_KEY } });
  }
}

test("database candidate sources override default fallbacks, explicit environment sources override the database, and an empty saved list is respected", { skip: !process.env.DATABASE_URL }, async () => {
  const originalEnv = process.env[ENV_KEY];
  const originalSetting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY }, select: { value: true } });
  const databaseSources = ["https://candidates-db.example.test/feed.json"];
  const environmentSources = ["https://candidates-env.example.test/api/candidates"];

  try {
    delete process.env[ENV_KEY];
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: databaseSources },
      update: { value: databaseSources },
    });

    assert.deepEqual(await getConfiguredSourcesAsync(ENV_KEY), databaseSources);
    assert.equal(hasExplicitConfiguredSources(ENV_KEY), false);

    process.env[ENV_KEY] = JSON.stringify(environmentSources);
    assert.equal(hasExplicitConfiguredSources(ENV_KEY), true);
    assert.deepEqual(await getConfiguredSourcesAsync(ENV_KEY), environmentSources);

    delete process.env[ENV_KEY];
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: [] },
      update: { value: [] },
    });
    assert.deepEqual(await getConfiguredSourcesAsync(ENV_KEY), []);
  } finally {
    await restoreCandidateSourcesSetting(originalSetting);
    if (originalEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnv;
  }
});

test("OWNER cannot save database sources while explicit environment sources control the effective list", async () => {
  const originalEnv = process.env[ENV_KEY];
  process.env[ENV_KEY] = JSON.stringify(["https://candidates-env.example.test/api/candidates"]);

  try {
    const response = await runWithTestSession(
      { user: { id: "candidate-source-env-lock-owner", role: "OWNER" } },
      () => saveCandidateSourceConfig(sourceConfigRequest(["https://ignored-db.example.test/feed.json"])),
    );
    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.match(payload.error, /RP_GLOBAL_CANDIDATE_SOURCES/);
  } finally {
    if (originalEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnv;
  }
});

test("source configuration audit records hostnames without storing source paths or query credentials", { skip: !process.env.DATABASE_URL }, async () => {
  const originalEnv = process.env[ENV_KEY];
  const originalSetting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY }, select: { value: true } });
  const actorUserId = "candidate-source-config-audit-test-owner";
  const tokenizedUrl = "https://example.test/private-candidate-feed?access_token=source-config-test-secret";

  try {
    delete process.env[ENV_KEY];
    const response = await runWithTestSession(
      { user: { id: actorUserId, role: "OWNER" } },
      () => saveCandidateSourceConfig(sourceConfigRequest([tokenizedUrl])),
    );
    assert.equal(response.status, 200);

    const stored = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY }, select: { value: true } });
    assert.deepEqual(stored?.value, [tokenizedUrl]);

    const audit = await prisma.auditLog.findFirst({
      where: { actorUserId, action: "UPDATE_CANDIDATE_SOURCING_CONFIG" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    assert.ok(audit, "Source configuration changes must be audited");
    const details = audit.details as Record<string, unknown>;
    assert.equal(details.sourcesCount, 1);
    assert.deepEqual(details.sourceHosts, ["example.test"]);
    assert.doesNotMatch(JSON.stringify(details), /source-config-test-secret|access_token|private-candidate-feed/);
  } finally {
    await prisma.auditLog.deleteMany({ where: { actorUserId, action: "UPDATE_CANDIDATE_SOURCING_CONFIG" } });
    await restoreCandidateSourcesSetting(originalSetting);
    if (originalEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalEnv;
  }
});
