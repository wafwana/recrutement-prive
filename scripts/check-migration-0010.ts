import { PrismaClient } from "@prisma/client";

export type DetailedMigrationCheckResult = {
  status: "COMPLETE" | "ABSENT" | "PARTIAL" | "ERROR";
  migrationRecordStatus: "COMPLETE" | "FAILED" | "ABSENT";
  enumsValid: boolean;
  jobColumnsValid: boolean;
  tableValid: boolean;
  indexesValid: boolean;
  foreignKeysValid: boolean;
  ownerColumnsValid: boolean;
  hasErrors: boolean;
  details: string[];
};

export async function checkMigration0010Status(
  prisma: PrismaClient,
  schema: string = "public"
): Promise<DetailedMigrationCheckResult> {
  const details: string[] = [];
  let hasErrors = false;

  // 1. Check _prisma_migrations record
  let migrationRecordStatus: "COMPLETE" | "FAILED" | "ABSENT" = "ABSENT";
  try {
    const records: Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }> =
      await prisma.$queryRaw`
        SELECT "migration_name", "finished_at", "rolled_back_at"
        FROM "_prisma_migrations"
        WHERE "migration_name" LIKE '%0010_mission_presentation_lock%'
      `;
    if (records.length > 0) {
      const rec = records[0];
      if (rec.finished_at && !rec.rolled_back_at) {
        migrationRecordStatus = "COMPLETE";
        details.push("Found completed migration record in _prisma_migrations.");
      } else {
        migrationRecordStatus = "FAILED";
        details.push(`Found FAILED or incomplete migration record in _prisma_migrations (finished_at: ${rec.finished_at}, rolled_back_at: ${rec.rolled_back_at}).`);
      }
    } else {
      details.push("No record found in _prisma_migrations.");
    }
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR querying _prisma_migrations: ${msg}`);
  }

  // 2. Check ENUMs and exact values
  let enumsValid = false;
  let enumTypesFound = 0;
  try {
    const expectedEnums: Record<string, string[]> = {
      MissionPresentationState: [
        "MISSION_ACTIVE",
        "CANDIDAT_ANONYME",
        "CONDITION_FINANCIERE_EN_ATTENTE",
        "PAIEMENT_OU_CONDITION_CONFIRME",
        "IDENTITE_DEBLOQUEE",
        "MISSION_TERMINEE",
      ],
      FinancialConditionStatus: ["PENDING", "CONFIRMED", "FAILED", "EXPIRED"],
    };

    const enumRows: Array<{ typname: string; enumlabel: string }> = await prisma.$queryRaw`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = ${schema}
        AND t.typname IN ('MissionPresentationState', 'FinancialConditionStatus')
    `;

    const foundEnums: Record<string, string[]> = {};
    enumRows.forEach((r) => {
      if (!foundEnums[r.typname]) foundEnums[r.typname] = [];
      foundEnums[r.typname].push(r.enumlabel);
    });

    enumTypesFound = Object.keys(foundEnums).length;

    let valid = true;
    for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
      const labels = foundEnums[enumName] || [];
      const match = expectedValues.every((val) => labels.includes(val)) && labels.length === expectedValues.length;
      if (!match) {
        valid = false;
        details.push(`ENUM '${enumName}' mismatch in schema '${schema}'. Expected: [${expectedValues.join(", ")}], Found: [${labels.join(", ")}].`);
      } else {
        details.push(`ENUM '${enumName}' verified in schema '${schema}' with all ${expectedValues.length} values.`);
      }
    }
    enumsValid = valid;
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking pg_enum in schema '${schema}': ${msg}`);
  }

  // 3. Check Job columns and exact types
  let jobColumnsValid = false;
  let jobColumnsFound = 0;
  try {
    const jobCols: Array<{ column_name: string; data_type: string; udt_name: string; is_nullable: string; column_default: string | null }> = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = ${schema}
        AND table_name = 'Job'
        AND column_name IN ('missionType', 'financialCondition', 'financialConditionStatus')
    `;

    jobColumnsFound = jobCols.length;
    const colMap = new Map(jobCols.map((c) => [c.column_name, c]));
    const missionTypeCol = colMap.get("missionType");
    const financialCondCol = colMap.get("financialCondition");
    const financialCondStatusCol = colMap.get("financialConditionStatus");

    const matchMissionType = missionTypeCol && (missionTypeCol.data_type === "text" || missionTypeCol.udt_name === "text");
    const matchFinancialCond = financialCondCol && (financialCondCol.data_type === "jsonb" || financialCondCol.udt_name === "jsonb");
    const matchFinancialCondStatus =
      financialCondStatusCol &&
      financialCondStatusCol.udt_name === "FinancialConditionStatus" &&
      financialCondStatusCol.is_nullable === "NO";

    if (matchMissionType && matchFinancialCond && matchFinancialCondStatus) {
      jobColumnsValid = true;
      details.push(`Job columns ('missionType', 'financialCondition', 'financialConditionStatus') verified in schema '${schema}'.`);
    } else {
      details.push(`Job columns mismatch in schema '${schema}'. Found: ${jobCols.length}/3 matching expected definitions.`);
    }
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking Job columns in schema '${schema}': ${msg}`);
  }

  // 4. Check Table MissionPresentation and 12 columns
  let tableValid = false;
  let mpColumnsFound = 0;
  try {
    const expectedCols = [
      "id",
      "missionId",
      "applicationId",
      "candidateId",
      "companyId",
      "state",
      "financialConditionStatus",
      "presentedAt",
      "conditionConfirmedAt",
      "unlockedAt",
      "completedAt",
      "securityDetails",
    ];

    const mpCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ${schema}
        AND table_name = 'MissionPresentation'
    `;

    mpColumnsFound = mpCols.length;
    const foundColNames = mpCols.map((c) => c.column_name);
    const matchCols = expectedCols.every((col) => foundColNames.includes(col)) && foundColNames.length === expectedCols.length;

    if (matchCols) {
      tableValid = true;
      details.push(`MissionPresentation table verified in schema '${schema}' with all 12 expected columns.`);
    } else {
      details.push(`MissionPresentation table mismatch in schema '${schema}'. Expected 12 columns, found ${foundColNames.length}.`);
    }
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking MissionPresentation table in schema '${schema}': ${msg}`);
  }

  // 5. Check Indexes
  let indexesValid = false;
  try {
    const expectedIndexes = [
      "MissionPresentation_pkey",
      "MissionPresentation_applicationId_companyId_key",
      "MissionPresentation_missionId_companyId_state_idx",
      "MissionPresentation_candidateId_companyId_idx",
    ];

    const idxRows: Array<{ indexname: string }> = await prisma.$queryRaw`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schema}
        AND tablename = 'MissionPresentation'
    `;

    const foundIdxNames = idxRows.map((i) => i.indexname);
    const matchIdx = expectedIndexes.every((idx) => foundIdxNames.includes(idx));

    if (matchIdx) {
      indexesValid = true;
      details.push(`MissionPresentation indexes (${expectedIndexes.length}) verified in schema '${schema}'.`);
    } else {
      details.push(`MissionPresentation indexes mismatch in schema '${schema}'. Found: [${foundIdxNames.join(", ")}].`);
    }
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking pg_indexes in schema '${schema}': ${msg}`);
  }

  // 6. Check Foreign Keys
  let foreignKeysValid = false;
  try {
    const expectedFKs = [
      "MissionPresentation_missionId_fkey",
      "MissionPresentation_applicationId_fkey",
      "MissionPresentation_candidateId_fkey",
      "MissionPresentation_companyId_fkey",
    ];

    const fkRows: Array<{ conname: string }> = await prisma.$queryRaw`
      SELECT conname
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = ${schema}
        AND c.contype = 'f'
        AND c.conrelid = 'MissionPresentation'::regclass
    `;

    const foundFKNames = fkRows.map((f) => f.conname);
    const matchFK = expectedFKs.every((fk) => foundFKNames.includes(fk));

    if (matchFK) {
      foreignKeysValid = true;
      details.push(`MissionPresentation foreign keys (${expectedFKs.length}) verified in schema '${schema}'.`);
    } else {
      details.push(`MissionPresentation foreign keys mismatch in schema '${schema}'. Found: [${foundFKNames.join(", ")}].`);
    }
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking pg_constraint in schema '${schema}': ${msg}`);
  }

  // 7. Check OWNER critical columns
  let ownerColumnsValid = false;
  try {
    const sirenCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'Company' AND column_name = 'siren'
    `;
    const attachCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'Job' AND column_name = 'attachmentName'
    `;
    const folderCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'CandidateDocument' AND column_name = 'folderPath'
    `;

    ownerColumnsValid = sirenCols.length === 1 && attachCols.length === 1 && folderCols.length === 1;
    details.push(`OWNER columns -> Company.siren: ${sirenCols.length}, Job.attachmentName: ${attachCols.length}, CandidateDocument.folderPath: ${folderCols.length}.`);
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking OWNER columns in schema '${schema}': ${msg}`);
  }

  // Status Classification
  if (hasErrors) {
    return {
      status: "ERROR",
      migrationRecordStatus,
      enumsValid,
      jobColumnsValid,
      tableValid,
      indexesValid,
      foreignKeysValid,
      ownerColumnsValid,
      hasErrors: true,
      details,
    };
  }

  const all0010Valid = enumsValid && jobColumnsValid && tableValid && indexesValid && foreignKeysValid;
  const no0010ObjectsExist = enumTypesFound === 0 && jobColumnsFound === 0 && mpColumnsFound === 0;

  let status: "COMPLETE" | "ABSENT" | "PARTIAL";
  if (all0010Valid) {
    status = "COMPLETE";
  } else if (no0010ObjectsExist) {
    status = "ABSENT";
  } else {
    status = "PARTIAL";
  }

  return {
    status,
    migrationRecordStatus,
    enumsValid,
    jobColumnsValid,
    tableValid,
    indexesValid,
    foreignKeysValid,
    ownerColumnsValid,
    hasErrors: false,
    details,
  };
}

export function validateResolveMode(requestedMode: string): "none" | "applied" | "rolled_back" {
  if (requestedMode !== "none" && requestedMode !== "applied" && requestedMode !== "rolled_back") {
    throw new Error(`INVALID RESOLVE_MODE '${requestedMode}'. Allowed values are strictly 'none', 'applied', or 'rolled_back'.`);
  }
  return requestedMode;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("CRITICAL ERROR: DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  let requestedMode: "none" | "applied" | "rolled_back";
  try {
    requestedMode = validateResolveMode(process.env.RESOLVE_MODE || "none");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`CRITICAL BLOCK: ${msg}`);
    process.exit(1);
  }

  console.log(`=== Fail-Closed Schema Inspection for 0010_mission_presentation_lock (Requested Mode: ${requestedMode}) ===`);

  const prisma = new PrismaClient();
  try {
    const result = await checkMigration0010Status(prisma);
    console.log("Inspection Details:");
    result.details.forEach((d) => console.log(`  - ${d}`));
    console.log(`Classification: ${result.status}`);

    if (result.status === "ERROR") {
      console.error("CRITICAL BLOCK: Inspection encountered SQL errors. Cannot safely determine database schema state.");
      process.exit(1);
    }

    if (requestedMode === "applied") {
      if (result.status !== "COMPLETE") {
        console.error(`CRITICAL BLOCK: Mode 'applied' was requested, but database state is ${result.status}. You CANNOT resolve as 'applied' unless ALL 0010 schema definitions (enums, columns, table, indexes, foreign keys) match 100% in schema 'public'.`);
        process.exit(1);
      }
      console.log("SAFE TO PROCEED: Mode 'applied' is valid because ALL 0010 schema definitions match 100% in schema 'public'.");
    } else if (requestedMode === "rolled_back") {
      if (result.status !== "ABSENT") {
        console.error(`CRITICAL BLOCK: Mode 'rolled_back' was requested, but database state is ${result.status}. You CANNOT resolve as 'rolled_back' if any 0010 schema objects exist, as re-running migration SQL will fail on duplicate creation.`);
        process.exit(1);
      }
      if (result.migrationRecordStatus !== "FAILED") {
        console.error(`CRITICAL BLOCK: Mode 'rolled_back' was requested, but migration 0010 status in _prisma_migrations is '${result.migrationRecordStatus}' (expected 'FAILED').`);
        process.exit(1);
      }
      console.log("SAFE TO PROCEED: Mode 'rolled_back' is valid because migration 0010 is recorded as FAILED and no 0010 schema objects exist.");
    } else if (requestedMode === "none") {
      if (result.status === "PARTIAL") {
        console.error("CRITICAL BLOCK: Database schema is in a PARTIAL state for migration 0010. Manual DBA inspection is required before running migrations.");
        process.exit(1);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`CRITICAL BLOCK: Unexpected error during inspection: ${msg}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
