import { PrismaClient } from "@prisma/client";

export type MigrationCheckResult = {
  status: "COMPLETE" | "ABSENT" | "PARTIAL" | "ERROR";
  migrationRecordExists: boolean;
  migrationFailed: boolean;
  enumTypesFound: number;
  jobColumnsFound: number;
  tableExists: boolean;
  ownerColumnsExist: boolean;
  hasErrors: boolean;
  details: string[];
};

export async function checkMigration0010Status(
  prisma: PrismaClient,
  schema: string = "public"
): Promise<MigrationCheckResult> {
  const details: string[] = [];
  let hasErrors = false;

  // 1. Check _prisma_migrations record
  let migrationRecordExists = false;
  let migrationFailed = false;
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
        migrationRecordExists = true;
        details.push("Found completed migration record in _prisma_migrations.");
      } else {
        migrationFailed = true;
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

  // 2. Check ENUMs in target schema
  let enumTypesFound = 0;
  try {
    const enumTypes: Array<{ typname: string }> = await prisma.$queryRaw`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = ${schema}
        AND t.typname IN ('MissionPresentationState', 'FinancialConditionStatus')
    `;
    enumTypesFound = enumTypes.length;
    details.push(`ENUM types found in schema '${schema}': ${enumTypesFound}/2.`);
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking pg_type in schema '${schema}': ${msg}`);
  }

  // 3. Check Job columns in target schema
  let jobColumnsFound = 0;
  try {
    const cols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = ${schema}
        AND table_name = 'Job'
        AND column_name IN ('missionType', 'financialCondition', 'financialConditionStatus')
    `;
    jobColumnsFound = cols.length;
    details.push(`Job columns found in schema '${schema}': ${jobColumnsFound}/3.`);
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking Job columns in schema '${schema}': ${msg}`);
  }

  // 4. Check Table MissionPresentation in target schema
  let tableExists = false;
  try {
    const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schema}
        AND table_name = 'MissionPresentation'
    `;
    tableExists = tables.length === 1;
    details.push(`MissionPresentation table found in schema '${schema}': ${tables.length}/1.`);
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking MissionPresentation table in schema '${schema}': ${msg}`);
  }

  // 5. Check OWNER critical columns in target schema
  let sirenFound = false;
  let attachFound = false;
  let folderFound = false;
  try {
    const sirenCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'Company' AND column_name = 'siren'
    `;
    sirenFound = sirenCols.length === 1;

    const attachCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'Job' AND column_name = 'attachmentName'
    `;
    attachFound = attachCols.length === 1;

    const folderCols: Array<{ column_name: string }> = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'CandidateDocument' AND column_name = 'folderPath'
    `;
    folderFound = folderCols.length === 1;

    details.push(`OWNER columns found in schema '${schema}' -> Company.siren: ${sirenCols.length}, Job.attachmentName: ${attachCols.length}, CandidateDocument.folderPath: ${folderCols.length}.`);
  } catch (err: unknown) {
    hasErrors = true;
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`SQL ERROR checking OWNER columns in schema '${schema}': ${msg}`);
  }

  const ownerColumnsExist = sirenFound && attachFound && folderFound;

  // Classify Status
  if (hasErrors) {
    return {
      status: "ERROR",
      migrationRecordExists,
      migrationFailed,
      enumTypesFound,
      jobColumnsFound,
      tableExists,
      ownerColumnsExist,
      hasErrors: true,
      details,
    };
  }

  const allObjectsExist = enumTypesFound === 2 && jobColumnsFound === 3 && tableExists;
  const noObjectsExist = enumTypesFound === 0 && jobColumnsFound === 0 && !tableExists;

  let status: "COMPLETE" | "ABSENT" | "PARTIAL";
  if (allObjectsExist) {
    status = "COMPLETE";
  } else if (noObjectsExist) {
    status = "ABSENT";
  } else {
    status = "PARTIAL";
  }

  return {
    status,
    migrationRecordExists,
    migrationFailed,
    enumTypesFound,
    jobColumnsFound,
    tableExists,
    ownerColumnsExist,
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

  console.log(`=== Pre-Migration Schema Inspection for 0010_mission_presentation_lock (Requested Mode: ${requestedMode}) ===`);

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
        console.error(`CRITICAL BLOCK: Mode 'applied' was requested, but database state is ${result.status}. You CANNOT resolve as 'applied' unless all schema objects of 0010 exist in schema 'public'.`);
        process.exit(1);
      }
      console.log("SAFE TO PROCEED: Mode 'applied' is valid because all 0010 schema objects exist in schema 'public'.");
    } else if (requestedMode === "rolled_back") {
      if (result.status !== "ABSENT") {
        console.error(`CRITICAL BLOCK: Mode 'rolled_back' was requested, but database state is ${result.status}. You CANNOT resolve as 'rolled_back' if any 0010 objects exist, as re-running migration SQL will fail on duplicate creation.`);
        process.exit(1);
      }
      if (!result.migrationFailed) {
        console.error("CRITICAL BLOCK: Mode 'rolled_back' was requested, but no failed migration 0010 record exists in _prisma_migrations.");
        process.exit(1);
      }
      console.log("SAFE TO PROCEED: Mode 'rolled_back' is valid because migration 0010 is recorded as failed and no 0010 schema objects exist.");
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
