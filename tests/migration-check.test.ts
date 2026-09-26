import test from "node:test";
import assert from "node:assert/strict";
import { checkMigration0010Status } from "../scripts/check-migration-0010";

test("unit test: checkMigration0010Status correctly classifies COMPLETE status", async () => {
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

  const result = await checkMigration0010Status(mockPrisma);
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.enumTypesFound, 2);
  assert.equal(result.jobColumnsFound, 3);
  assert.equal(result.tableExists, true);
  assert.equal(result.ownerColumnsExist, true);
});

test("unit test: checkMigration0010Status correctly classifies ABSENT status", async () => {
  const mockPrisma = {
    $queryRaw: async () => [],
  } as any;

  const result = await checkMigration0010Status(mockPrisma);
  assert.equal(result.status, "ABSENT");
  assert.equal(result.enumTypesFound, 0);
  assert.equal(result.jobColumnsFound, 0);
  assert.equal(result.tableExists, false);
});

test("unit test: checkMigration0010Status correctly classifies PARTIAL status", async () => {
  const mockPrisma = {
    $queryRaw: async (queryStrings: TemplateStringsArray) => {
      const q = Array.isArray(queryStrings) ? queryStrings.join("?") : String(queryStrings);
      if (q.includes('pg_type')) {
        return [{ typname: "MissionPresentationState" }];
      }
      return [];
    },
  } as any;

  const result = await checkMigration0010Status(mockPrisma);
  assert.equal(result.status, "PARTIAL");
});
