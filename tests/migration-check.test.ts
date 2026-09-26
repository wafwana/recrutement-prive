import test from "node:test";
import assert from "node:assert/strict";
import { checkMigration0010Status, validateResolveMode } from "../scripts/check-migration-0010";

test("unit test: checkMigration0010Status classifies COMPLETE status when 100% of 0010 SQL definitions match", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes('_prisma_migrations')) {
        return [{ migration_name: "0010_mission_presentation_lock", finished_at: new Date(), rolled_back_at: null }];
      }
      if (q.includes('pg_enum')) {
        return [
          { typname: "MissionPresentationState", enumlabel: "MISSION_ACTIVE" },
          { typname: "MissionPresentationState", enumlabel: "CANDIDAT_ANONYME" },
          { typname: "MissionPresentationState", enumlabel: "CONDITION_FINANCIERE_EN_ATTENTE" },
          { typname: "MissionPresentationState", enumlabel: "PAIEMENT_OU_CONDITION_CONFIRME" },
          { typname: "MissionPresentationState", enumlabel: "IDENTITE_DEBLOQUEE" },
          { typname: "MissionPresentationState", enumlabel: "MISSION_TERMINEE" },
          { typname: "FinancialConditionStatus", enumlabel: "PENDING" },
          { typname: "FinancialConditionStatus", enumlabel: "CONFIRMED" },
          { typname: "FinancialConditionStatus", enumlabel: "FAILED" },
          { typname: "FinancialConditionStatus", enumlabel: "EXPIRED" },
        ];
      }
      if (q.includes("table_name = 'Job'") && q.includes("missionType")) {
        return [
          { column_name: "missionType", data_type: "text", udt_name: "text", is_nullable: "YES" },
          { column_name: "financialCondition", data_type: "jsonb", udt_name: "jsonb", is_nullable: "YES" },
          { column_name: "financialConditionStatus", data_type: "USER-DEFINED", udt_name: "FinancialConditionStatus", is_nullable: "NO" },
        ];
      }
      if (q.includes("table_name = 'MissionPresentation'")) {
        return [
          "id", "missionId", "applicationId", "candidateId", "companyId", "state",
          "financialConditionStatus", "presentedAt", "conditionConfirmedAt", "unlockedAt",
          "completedAt", "securityDetails"
        ].map(col => ({ column_name: col }));
      }
      if (q.includes("pg_indexes")) {
        return [
          { indexname: "MissionPresentation_pkey" },
          { indexname: "MissionPresentation_applicationId_companyId_key" },
          { indexname: "MissionPresentation_missionId_companyId_state_idx" },
          { indexname: "MissionPresentation_candidateId_companyId_idx" }
        ];
      }
      if (q.includes("pg_constraint")) {
        return [
          { conname: "MissionPresentation_missionId_fkey" },
          { conname: "MissionPresentation_applicationId_fkey" },
          { conname: "MissionPresentation_candidateId_fkey" },
          { conname: "MissionPresentation_companyId_fkey" }
        ];
      }
      if (q.includes("table_name = 'Company'") && q.includes("siren")) {
        return [{ column_name: "siren" }];
      }
      if (q.includes("table_name = 'Job'") && q.includes("attachmentName")) {
        return [{ column_name: "attachmentName" }];
      }
      if (q.includes("table_name = 'CandidateDocument'") && q.includes("folderPath")) {
        return [{ column_name: "folderPath" }];
      }
      return [];
    },
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.enumsValid, true);
  assert.equal(result.jobColumnsValid, true);
  assert.equal(result.tableValid, true);
  assert.equal(result.indexesValid, true);
  assert.equal(result.foreignKeysValid, true);
  assert.equal(result.ownerColumnsValid, true);
  assert.equal(result.hasErrors, false);
});

test("unit test: checkMigration0010Status classifies ABSENT status when schema has no 0010 objects", async () => {
  const mockPrisma = {
    $queryRaw: async () => [],
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.status, "ABSENT");
  assert.equal(result.enumsValid, false);
  assert.equal(result.jobColumnsValid, false);
  assert.equal(result.tableValid, false);
  assert.equal(result.hasErrors, false);
});

test("unit test: checkMigration0010Status classifies PARTIAL status when ENUM labels or columns are incomplete", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes('pg_enum')) {
        return [
          { typname: "MissionPresentationState", enumlabel: "MISSION_ACTIVE" },
          { typname: "FinancialConditionStatus", enumlabel: "PENDING" },
          { typname: "FinancialConditionStatus", enumlabel: "CONFIRMED" },
          { typname: "FinancialConditionStatus", enumlabel: "FAILED" },
          { typname: "FinancialConditionStatus", enumlabel: "EXPIRED" }
        ]; // Incomplete ENUM labels
      }
      return [];
    },
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.enumsValid, false);
  assert.equal(result.hasErrors, false);
});

test("unit test: checkMigration0010Status classifies ERROR status on SQL query failure", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes('_prisma_migrations')) {
        throw new Error("Relation '_prisma_migrations' does not exist");
      }
      return [];
    },
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.status, "ERROR");
  assert.equal(result.hasErrors, true);
  assert.equal(result.details.some(d => d.includes("SQL ERROR")), true);
});

test("unit test: checkMigration0010Status isolates schema 'public' and ignores objects in 'other_schema'", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray, ...values: any[]) => {
      if (values.includes("public")) {
        return [];
      }
      if (values.includes("other_schema")) {
        if (queryStrings.join("?").includes("pg_enum")) {
          return [
            { typname: "MissionPresentationState", enumlabel: "MISSION_ACTIVE" },
            { typname: "FinancialConditionStatus", enumlabel: "PENDING" },
            { typname: "FinancialConditionStatus", enumlabel: "CONFIRMED" },
            { typname: "FinancialConditionStatus", enumlabel: "FAILED" },
            { typname: "FinancialConditionStatus", enumlabel: "EXPIRED" }
          ];
        }
      }
      return [];
    },
  } as any;

  const resultPublic = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(resultPublic.status, "ABSENT");

  const resultOther = await checkMigration0010Status(mockPrisma, "other_schema");
  assert.equal(resultOther.status, "PARTIAL");
});

test("unit test: validateResolveMode accepts valid modes and rejects invalid ones", () => {
  assert.equal(validateResolveMode("none"), "none");
  assert.equal(validateResolveMode("applied"), "applied");
  assert.equal(validateResolveMode("rolled_back"), "rolled_back");

  assert.throws(() => validateResolveMode("invalid_mode"), /INVALID RESOLVE_MODE/);
  assert.throws(() => validateResolveMode("force_applied"), /INVALID RESOLVE_MODE/);
});

test("unit test: OWNER column detection flags missing columns post-migration", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes("Company") && q.includes("siren")) {
        return []; // Siren column missing
      }
      if (q.includes("Job") && q.includes("attachmentName")) {
        return [{ column_name: "attachmentName" }];
      }
      if (q.includes("CandidateDocument") && q.includes("folderPath")) {
        return [{ column_name: "folderPath" }];
      }
      return [];
    },
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.ownerColumnsValid, false);
});
