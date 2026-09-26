import test from "node:test";
import assert from "node:assert/strict";
import { checkMigration0010Status, validateResolveMode } from "../scripts/check-migration-0010";

test("unit test: checkMigration0010Status classifies COMPLETE status in schema 'public'", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes('_prisma_migrations')) {
        return [{ migration_name: "0010_mission_presentation_lock", finished_at: new Date(), rolled_back_at: null }];
      }
      if (q.includes('pg_type')) {
        return [{ typname: "MissionPresentationState" }, { typname: "FinancialConditionStatus" }];
      }
      if (q.includes("table_name = 'Job'") && q.includes("missionType")) {
        return [{ column_name: "missionType" }, { column_name: "financialCondition" }, { column_name: "financialConditionStatus" }];
      }
      if (q.includes("table_name = 'MissionPresentation'")) {
        return [{ table_name: "MissionPresentation" }];
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
  assert.equal(result.enumTypesFound, 2);
  assert.equal(result.jobColumnsFound, 3);
  assert.equal(result.tableExists, true);
  assert.equal(result.ownerColumnsExist, true);
  assert.equal(result.hasErrors, false);
});

test("unit test: checkMigration0010Status classifies ABSENT status when schema has no 0010 objects", async () => {
  const mockPrisma = {
    $queryRaw: async () => [],
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.status, "ABSENT");
  assert.equal(result.enumTypesFound, 0);
  assert.equal(result.jobColumnsFound, 0);
  assert.equal(result.tableExists, false);
  assert.equal(result.hasErrors, false);
});

test("unit test: checkMigration0010Status classifies PARTIAL status when only some objects exist", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes('pg_type')) {
        return [{ typname: "MissionPresentationState" }];
      }
      return [];
    },
  } as any;

  const result = await checkMigration0010Status(mockPrisma, "public");
  assert.equal(result.status, "PARTIAL");
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
      // If query passes schema parameter and value is 'public', return empty
      if (values.includes("public")) {
        return [];
      }
      // If query checks 'other_schema', return items
      if (values.includes("other_schema")) {
        return [{ typname: "MissionPresentationState" }];
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
  assert.equal(result.ownerColumnsExist, false);
});
