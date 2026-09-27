import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import {
  MIGRATIONS_0011_0014,
  validateMigrations0011To0014,
  type PriorMigrationState,
} from "./check-migrations-0011-0014";

export async function reconcileMigrations0011To0014(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const prisma = new PrismaClient();
  let states: Record<string, PriorMigrationState> | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      states = await validateMigrations0011To0014({
        query: async <T>(sql: string) => ({ rows: await tx.$queryRawUnsafe<T[]>(sql) }),
      });
    });
    if (states === null) throw new Error("Migration 0011-0014 precheck did not return ledger state.");

    for (const migrationName of MIGRATIONS_0011_0014) {
      if (states[migrationName] === "APPLIED") {
        console.log(migrationName + " is already applied; skipping.");
        continue;
      }
      if (states[migrationName] !== "MISSING") {
        throw new Error("Refusing to reconcile unexpected state for " + migrationName);
      }
      // Only the four fixed migration names are allowed. No shell interpolation or user-supplied target.
      execFileSync(
        "npx",
        ["prisma", "migrate", "resolve", "--applied", migrationName],
        { stdio: "inherit", env: process.env },
      );
    }

    let finalStates: Record<string, PriorMigrationState> = {};
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      finalStates = await validateMigrations0011To0014({
        query: async <T>(sql: string) => ({ rows: await tx.$queryRawUnsafe<T[]>(sql) }),
      });
    });
    for (const migrationName of MIGRATIONS_0011_0014) {
      if (finalStates[migrationName] !== "APPLIED") {
        throw new Error("Migration history reconciliation did not complete for " + migrationName);
      }
    }
    console.log("Migrations 0011-0014 ledger verified: APPLIED. No schema or business data was changed.");
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  reconcileMigrations0011To0014().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
