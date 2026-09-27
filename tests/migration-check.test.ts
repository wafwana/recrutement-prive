import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { classifyMigration0010Ledger, normalizeDefault } from "../scripts/check-migration-0010";

test("0010 validator is fail-closed and checks exact schema", () => {
  const source = fs.readFileSync(path.resolve("scripts/check-migration-0010.ts"), "utf8");
  assert.match(source, /SET TRANSACTION READ ONLY/);
  assert.match(source, /MissionPresentation_applicationId_companyId_key/);
  assert.match(source, /MissionPresentation_missionId_companyId_state_idx/);
  assert.match(source, /MissionPresentation_candidateId_companyId_idx/);
  assert.match(source, /referential_constraints/);
  assert.match(source, /delete_rule/);
  assert.match(source, /update_rule/);
  assert.match(source, /idx\.relname IN/);
  assert.match(source, /LEFT JOIN pg_constraint/);
  assert.match(source, /Object\.keys\(foreignKeys\)\.sort\(\), Object\.keys\(EXPECTED\.foreignKeys\)\.sort\(\)/);
  assert.match(source, /Object\.keys\(indexes\)\.sort\(\), Object\.keys\(EXPECTED\.indexes\)\.sort\(\)/);
});

test("0010 ledger classification refuses ambiguous or rolled-back history", () => {
  assert.equal(classifyMigration0010Ledger([{ finished_at: null, rolled_back_at: null }]), "FAILED");
  assert.equal(classifyMigration0010Ledger([{ finished_at: "2026-09-27T00:00:00Z", rolled_back_at: null }]), "APPLIED");
  assert.throws(() => classifyMigration0010Ledger([]), /exactly one Prisma ledger row/);
  assert.throws(
    () => classifyMigration0010Ledger([{ finished_at: null, rolled_back_at: "2026-09-27T00:00:00Z" }]),
    /marked rolled back/,
  );
  assert.throws(
    () => classifyMigration0010Ledger([
      { finished_at: null, rolled_back_at: null },
      { finished_at: null, rolled_back_at: null },
    ]),
    /exactly one Prisma ledger row/,
  );
});

test("validator default normalization is deterministic", () => {
  assert.equal(normalizeDefault("  'PENDING'::FinancialConditionStatus  "), "'PENDING'::FinancialConditionStatus");
  assert.equal(normalizeDefault(null), "");
});

test("production workflow is manual, serialized and guarded", () => {
  const source = fs.readFileSync(path.resolve(".github/workflows/deploy-migrations.yml"), "utf8");
  assert.match(source, /workflow_dispatch/);
  assert.match(source, /DATABASE_URL_PRODUCTION/);
  assert.match(source, /concurrency:/);
  assert.match(source, /cancel-in-progress: false/);
  assert.match(source, /CONFIRM_MIGRATE_PRODUCTION/);
  assert.match(source, /CONFIRM_RESOLVE_0010_APPLIED/);
  assert.match(source, /needs: precheck/);
  assert.doesNotMatch(source, /migrate reset|db push|resolve --rolled-back/);
});
