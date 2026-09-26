import { PrismaClient } from "@prisma/client";

export type MigrationCheckResult = {
  status: "COMPLETE" | "ABSENT" | "PARTIAL";
  migrationRecordExists: boolean;
  enumTypesFound: number;
  jobColumnsFound: number;
  tableExists: boolean;
  ownerColumnsExist: boolean;
  details: string[];
};

export async function checkMigration0010Status(prisma: PrismaClient): Promise<MigrationCheckResult> {
  const details: string[] = [];

  // 1. Check _prisma_migrations record
  let migrationRecordExists = false;
  try {
    const records: Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }> =
      await prisma.$queryRaw`SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" WHERE "migration_name" LIKE '%0010_mission_presentation_lock%'`;
    if (records.length > 0) {
      const rec = records[0];
      if (rec.finished_at && !rec.rolled_back_at) {
        migrationRecordExists = true;
        details.push("Found completed migration record in _prisma_migrations.");
      } else {
        details.push(`Found incomplete migration record in _prisma_migrations (finished_at: ${rec.finished_at}, rolled_back_at: ${rec.rolled_back_at}).`);
      }
    } else {
      details.push("No record found in _prisma_migrations.");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`Error querying _prisma_migrations: ${msg}`);
  }

  // 2. Check ENUMs
  let enumTypesFound = 0;
  try {
    const enumTypes: Array<{ typname: string }> =
      await prisma.$queryRaw`SELECT typname FROM pg_type WHERE typname IN ('MissionPresentationState', 'FinancialConditionStatus')`;
    enumTypesFound = enumTypes.length;
    details.push(`ENUM types found: ${enumTypesFound}/2.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`Error checking pg_type: ${msg}`);
  }

  // 3. Check Job columns
  let jobColumnsFound = 0;
  try {
    const cols: Array<{ column_name: string }> =
      await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Job' AND column_name IN ('missionType', 'financialCondition', 'financialConditionStatus')`;
    jobColumnsFound = cols.length;
    details.push(`Job columns found: ${jobColumnsFound}/3.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`Error checking Job columns: ${msg}`);
  }

  // 4. Check Table MissionPresentation
  let tableExists = false;
  try {
    const tables: Array<{ table_name: string }> =
      await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_name = 'MissionPresentation'`;
    tableExists = tables.length === 1;
    details.push(`MissionPresentation table found: ${tables.length}/1.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`Error checking MissionPresentation table: ${msg}`);
  }

  // 5. Check OWNER critical columns
  let sirenFound = false;
  let attachFound = false;
  let folderFound = false;
  try {
    const sirenCols: Array<{ column_name: string }> =
      await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Company' AND column_name = 'siren'`;
    sirenFound = sirenCols.length === 1;

    const attachCols: Array<{ column_name: string }> =
      await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'attachmentName'`;
    attachFound = attachCols.length === 1;

    const folderCols: Array<{ column_name: string }> =
      await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'CandidateDocument' AND column_name = 'folderPath'`;
    folderFound = folderCols.length === 1;

    details.push(`OWNER columns found -> Company.siren: ${sirenCols.length}, Job.attachmentName: ${attachCols.length}, CandidateDocument.folderPath: ${folderCols.length}.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    details.push(`Error checking OWNER columns: ${msg}`);
  }

  const ownerColumnsExist = sirenFound && attachFound && folderFound;

  // Classify Status
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
    enumTypesFound,
    jobColumnsFound,
    tableExists,
    ownerColumnsExist,
    details,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const requestedMode = process.env.RESOLVE_MODE || "none";
  console.log(`=== Pre-Migration Status Inspection for 0010_mission_presentation_lock (Requested Mode: ${requestedMode}) ===`);

  const prisma = new PrismaClient();
  try {
    const result = await checkMigration0010Status(prisma);
    console.log("Inspection Details:");
    result.details.forEach((d) => console.log(`  - ${d}`));
    console.log(`Classification: ${result.status}`);

    if (requestedMode === "applied") {
      if (result.status !== "COMPLETE") {
        console.error(`CRITICAL BLOCK: Mode 'applied' was requested, but database state is ${result.status}. You CANNOT resolve as 'applied' unless all schema objects of 0010 exist.`);
        process.exit(1);
      }
      console.log("SAFE TO PROCEED: Mode 'applied' is valid because all 0010 schema objects exist in the database.");
    } else if (requestedMode === "rolled_back") {
      if (result.status !== "ABSENT") {
        console.error(`CRITICAL BLOCK: Mode 'rolled_back' was requested, but database state is ${result.status}. You CANNOT resolve as 'rolled_back' if some objects of 0010 already exist, as re-running the migration SQL will fail on table/type creation.`);
        process.exit(1);
      }
      console.log("SAFE TO PROCEED: Mode 'rolled_back' is valid because no 0010 schema objects exist in the database.");
    } else if (requestedMode === "none") {
      if (result.status === "PARTIAL") {
        console.error("CRITICAL BLOCK: Database is in a PARTIAL state for migration 0010. Manual DBA inspection is required before running migrations.");
        process.exit(1);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error during inspection: ${msg}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
