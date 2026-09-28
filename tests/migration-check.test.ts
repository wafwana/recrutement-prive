import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assertPriorMigrationLedgerApplied, classifyMigration0010Ledger, migration0010RecoveryAction, normalizeDefault } from "../scripts/check-migration-0010";
import { classifyPriorMigrationLedger, MIGRATIONS_0011_0014 } from "../scripts/check-migrations-0011-0014";

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

test("0010 recovery is state-aware and only resolves a failed migration", () => {
  assert.equal(migration0010RecoveryAction("FAILED"), "RESOLVE");
  assert.equal(migration0010RecoveryAction("APPLIED"), "SKIP");
  const recovery = fs.readFileSync(path.resolve("scripts/recover-migration-0010.ts"), "utf8");
  assert.match(recovery, /\["prisma", "migrate", "resolve", "--applied", MIGRATION\]/);
  assert.match(recovery, /const MIGRATION = "0010_mission_presentation_lock"/);
  assert.match(recovery, /validateMigration0010/);
  assert.doesNotMatch(recovery, /migrate reset|db push|resolve --rolled-back/);
});

test("0010 ledger classification ignores rolled-back history but rejects ambiguous active rows", () => {
  assert.equal(classifyMigration0010Ledger([{ finished_at: null, rolled_back_at: null }]), "FAILED");
  assert.equal(classifyMigration0010Ledger([{ finished_at: "2026-09-27T00:00:00Z", rolled_back_at: null }]), "APPLIED");
  assert.equal(
    classifyMigration0010Ledger([
      { finished_at: null, rolled_back_at: "2026-09-26T03:23:35.530Z" },
      { finished_at: "2026-09-28T12:56:05.839Z", rolled_back_at: null },
    ]),
    "APPLIED",
  );
  assert.throws(() => classifyMigration0010Ledger([]), /exactly one active Prisma ledger row/);
  assert.throws(
    () => classifyMigration0010Ledger([{ finished_at: null, rolled_back_at: "2026-09-27T00:00:00Z" }]),
    /exactly one active Prisma ledger row/,
  );
  assert.throws(
    () => classifyMigration0010Ledger([
      { finished_at: null, rolled_back_at: null },
      { finished_at: null, rolled_back_at: null },
    ]),
    /exactly one active Prisma ledger row/,
  );
});

test("recovery refuses to deploy while prerequisite migration ledger rows are missing or unsafe", () => {
  const names = [
    "0011_password_reset_token",
    "0012_job_category",
    "0013_connect_job_category",
    "0014_candidate_subcategories",
  ];
  const applied = names.map((migration_name) => ({
    migration_name,
    finished_at: "2026-09-27T00:00:00Z",
    rolled_back_at: null,
  }));
  assert.doesNotThrow(() => assertPriorMigrationLedgerApplied(applied));
  assert.throws(
    () => assertPriorMigrationLedgerApplied(applied.slice(1)),
    /prerequisite 0011_password_reset_token must have exactly one successful/,
  );
  assert.throws(
    () => assertPriorMigrationLedgerApplied(applied.map((row, i) => i === 2 ? { ...row, finished_at: null } : row)),
    /prerequisite 0013_connect_job_category must have exactly one successful/,
  );
  assert.throws(
    () => assertPriorMigrationLedgerApplied(applied.map((row, i) => i === 0 ? { ...row, rolled_back_at: "2026-09-27T00:00:00Z" } : row)),
    /prerequisite 0011_password_reset_token must have exactly one successful/,
  );
  assert.throws(
    () => assertPriorMigrationLedgerApplied([...applied, applied[0]]),
    /prerequisite 0011_password_reset_token must have exactly one successful/,
  );
});

test("0011-0014 reconciliation accepts only missing or successful applied ledger rows", () => {
  const missing = classifyPriorMigrationLedger([]);
  for (const name of MIGRATIONS_0011_0014) assert.equal(missing[name], "MISSING");

  const applied = MIGRATIONS_0011_0014.map((migration_name) => ({
    migration_name,
    finished_at: "2026-09-27T00:00:00Z",
    rolled_back_at: null,
  }));
  const states = classifyPriorMigrationLedger(applied);
  for (const name of MIGRATIONS_0011_0014) assert.equal(states[name], "APPLIED");

  assert.throws(
    () => classifyPriorMigrationLedger([{ ...applied[0], finished_at: null }]),
    /failed, rolled-back, duplicate, or ambiguous/,
  );
  assert.throws(
    () => classifyPriorMigrationLedger([{ ...applied[0], rolled_back_at: "2026-09-27T00:00:00Z" }]),
    /failed, rolled-back, duplicate, or ambiguous/,
  );
  assert.throws(
    () => classifyPriorMigrationLedger([applied[0], applied[0]]),
    /failed, rolled-back, duplicate, or ambiguous/,
  );
  assert.throws(
    () => classifyPriorMigrationLedger([{ ...applied[0], migration_name: "0016_unrelated" }]),
    /Unexpected migration ledger row/,
  );
});

test("0011-0014 reconciliation is manual, schema-validated, allowlisted, and ledger-only", () => {
  const workflow = fs.readFileSync(path.resolve(".github/workflows/reconcile-prisma-0011-0014.yml"), "utf8");
  const validator = fs.readFileSync(path.resolve("scripts/check-migrations-0011-0014.ts"), "utf8");
  const reconcile = fs.readFileSync(path.resolve("scripts/reconcile-migrations-0011-0014.ts"), "utf8");
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /CONFIRM_RECONCILE_0011_0014_PRODUCTION/);
  assert.match(workflow, /concurrency:/);
  assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
  assert.ok(validator.includes("SET TRANSACTION READ ONLY"));
  assert.match(validator, /PasswordResetToken_tokenHash_key/);
  assert.match(validator, /JobCategory_parentId_fkey/);
  assert.match(reconcile, /MIGRATIONS_0011_0014/);
  assert.match(reconcile, /migrate", "resolve", "--applied"/);
  assert.doesNotMatch(workflow + reconcile, /migrate deploy|migrate reset|db push|resolve --rolled-back/);
});

test("validator default normalization handles PostgreSQL quoted enum casts", () => {
  assert.equal(normalizeDefault("  'PENDING'::FinancialConditionStatus  "), "'PENDING'::FinancialConditionStatus");
  assert.equal(normalizeDefault("'PENDING'::\"FinancialConditionStatus\""), "'PENDING'::FinancialConditionStatus");
  assert.equal(normalizeDefault("'MISSION_ACTIVE'::\"MissionPresentationState\""), "'MISSION_ACTIVE'::MissionPresentationState");
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
  assert.ok(source.includes("github.ref == 'refs/heads/main'"));
  assert.ok(source.includes("permissions:"));
  assert.ok(source.includes("contents: read"));
  assert.ok(source.includes("scripts/recover-migration-0010.ts"));
  assert.doesNotMatch(source, /npx prisma migrate resolve --applied/);
  assert.doesNotMatch(source, /migrate reset|db push|resolve --rolled-back/);
});
