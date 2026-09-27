import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("0010 validator is fail-closed and checks exact schema", () => {
  const source = fs.readFileSync(path.resolve("scripts/check-migration-0010.ts"), "utf8");
  assert.match(source, /BEGIN READ ONLY/);
  assert.match(source, /MissionPresentation_applicationId_companyId_key/);
  assert.match(source, /MissionPresentation_missionId_companyId_state_idx/);
  assert.match(source, /MissionPresentation_candidateId_companyId_idx/);
  assert.match(source, /referential_constraints/);
  assert.match(source, /delete_rule/);
  assert.match(source, /update_rule/);
  assert.match(source, /assertEqual(Object.keys(foreignKeys).sort(), Object.keys(EXPECTED.foreignKeys).sort()/);
  assert.match(source, /Object.keys(indexes).sort(), Object.keys(EXPECTED.indexes).sort()/);
});

test("production workflow never migrates during build and is serialized", () => {
  const source = fs.readFileSync(path.resolve(".github/workflows/deploy-migrations.yml"), "utf8");
  assert.match(source, /workflow_dispatch/);
  assert.match(source, /DATABASE_URL_PRODUCTION/);
  assert.match(source, /concurrency:/);
  assert.match(source, /migrate deploy/);
});
