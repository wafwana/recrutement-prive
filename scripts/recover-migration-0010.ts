import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import {
  classifyMigration0010Ledger,
  migration0010RecoveryAction,
  validateMigration0010,
  type MigrationLedgerState,
} from "./check-migration-0010";

const MIGRATION = "0010_mission_presentation_lock";

export async function recoverMigration0010(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

  const prisma = new PrismaClient();
  let state: MigrationLedgerState | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await validateMigration0010({
        query: async <T>(query: string) => ({
          rows: await tx.$queryRawUnsafe<T[]>(query),
        }),
      });
      const rows = await tx.$queryRawUnsafe<
        Array<{ finished_at: Date | null; rolled_back_at: Date | null }>
      >(`
        SELECT finished_at, rolled_back_at
        FROM "_prisma_migrations"
        WHERE migration_name = '0010_mission_presentation_lock'
      `);
      state = classifyMigration0010Ledger(
        rows.map((row) => ({
          finished_at: row.finished_at === null ? null : "present",
          rolled_back_at: row.rolled_back_at === null ? null : "present",
        })),
      );
    });

    if (state === null) throw new Error("Migration 0010 ledger state was not read.");
    if (migration0010RecoveryAction(state) === "RESOLVE") {
      // Fixed argv: no shell interpolation and no user-selectable migration target.
      execFileSync(
        "npx",
        ["prisma", "migrate", "resolve", "--applied", MIGRATION],
        { stdio: "inherit", env: process.env },
      );
    } else {
      console.log("Migration 0010 is already applied; skipping resolve.");
    }

    const finalRows = await prisma.$queryRawUnsafe<
      Array<{ finished_at: Date | null; rolled_back_at: Date | null }>
    >(`
      SELECT finished_at, rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name = '0010_mission_presentation_lock'
    `);
    const finalState = classifyMigration0010Ledger(
      finalRows.map((row) => ({
        finished_at: row.finished_at === null ? null : "present",
        rolled_back_at: row.rolled_back_at === null ? null : "present",
      })),
    );
    if (finalState !== "APPLIED") {
      throw new Error("Migration 0010 recovery did not reach the APPLIED ledger state.");
    }
    console.log("Migration 0010 ledger state verified: APPLIED.");
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  recoverMigration0010().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
