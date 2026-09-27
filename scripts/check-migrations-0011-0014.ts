import { PrismaClient } from "@prisma/client";
import { normalizeDefault } from "./check-migration-0010";

export const MIGRATIONS_0011_0014 = [
  "0011_password_reset_token",
  "0012_job_category",
  "0013_connect_job_category",
  "0014_candidate_subcategories",
] as const;

export type PriorMigrationState = "MISSING" | "APPLIED";
type LedgerRow = { migration_name: string; finished_at: Date | string | null; rolled_back_at: Date | string | null };
type QueryClient = { query: <T>(sql: string) => Promise<{ rows: T[] }> };
type ColumnShape = { dataType: string; udtName: string; isNullable: string; columnDefault: string | null };

const exactColumns: Record<string, Record<string, ColumnShape>> = {
  PasswordResetToken: {
    id: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    email: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    tokenHash: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    expiresAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "NO", columnDefault: null },
    usedAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "YES", columnDefault: null },
    createdAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "NO", columnDefault: "CURRENT_TIMESTAMP" },
  },
  JobCategory: {
    id: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    code: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    name: { dataType: "jsonb", udtName: "jsonb", isNullable: "NO", columnDefault: null },
    description: { dataType: "jsonb", udtName: "jsonb", isNullable: "YES", columnDefault: null },
    parentId: { dataType: "text", udtName: "text", isNullable: "YES", columnDefault: null },
    sortOrder: { dataType: "integer", udtName: "int4", isNullable: "NO", columnDefault: "0" },
    isActive: { dataType: "boolean", udtName: "bool", isNullable: "NO", columnDefault: "true" },
    createdAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "NO", columnDefault: "CURRENT_TIMESTAMP" },
    updatedAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "NO", columnDefault: null },
  },
};

const partialColumns: Record<string, Record<string, ColumnShape>> = {
  CandidateDocument: {
    url: { dataType: "text", udtName: "text", isNullable: "YES", columnDefault: null },
    fileData: { dataType: "bytea", udtName: "bytea", isNullable: "YES", columnDefault: null },
  },
  CandidateProfile: {
    primaryCategoryId: { dataType: "text", udtName: "text", isNullable: "YES", columnDefault: null },
    subCategoryIds: { dataType: "jsonb", udtName: "jsonb", isNullable: "YES", columnDefault: null },
  },
  Job: {
    jobCategoryId: { dataType: "text", udtName: "text", isNullable: "YES", columnDefault: null },
    subCategoryId: { dataType: "text", udtName: "text", isNullable: "YES", columnDefault: null },
  },
};

const expectedIndexes: Record<string, { unique: boolean; columns: string[] }> = {
  PasswordResetToken_tokenHash_key: { unique: true, columns: ["tokenHash"] },
  PasswordResetToken_email_idx: { unique: false, columns: ["email"] },
  JobCategory_code_key: { unique: true, columns: ["code"] },
  JobCategory_parentId_idx: { unique: false, columns: ["parentId"] },
  CandidateProfile_primaryCategoryId_idx: { unique: false, columns: ["primaryCategoryId"] },
  Job_jobCategoryId_idx: { unique: false, columns: ["jobCategoryId"] },
  Job_subCategoryId_idx: { unique: false, columns: ["subCategoryId"] },
};

const expectedForeignKeys: Record<string, {
  tableName: string; columns: string[]; referencedTable: string; referencedColumns: string[];
  onDelete: string; onUpdate: string;
}> = {
  JobCategory_parentId_fkey: {
    tableName: "JobCategory", columns: ["parentId"], referencedTable: "JobCategory",
    referencedColumns: ["id"], onDelete: "CASCADE", onUpdate: "CASCADE",
  },
  CandidateProfile_primaryCategoryId_fkey: {
    tableName: "CandidateProfile", columns: ["primaryCategoryId"], referencedTable: "JobCategory",
    referencedColumns: ["id"], onDelete: "SET NULL", onUpdate: "CASCADE",
  },
  Job_jobCategoryId_fkey: {
    tableName: "Job", columns: ["jobCategoryId"], referencedTable: "JobCategory",
    referencedColumns: ["id"], onDelete: "SET NULL", onUpdate: "CASCADE",
  },
  Job_subCategoryId_fkey: {
    tableName: "Job", columns: ["subCategoryId"], referencedTable: "JobCategory",
    referencedColumns: ["id"], onDelete: "SET NULL", onUpdate: "CASCADE",
  },
};

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error("Migration history validation failed for " + label + ": expected " + expectedJson + ", got " + actualJson);
  }
}

export function classifyPriorMigrationLedger(rows: LedgerRow[]): Record<string, PriorMigrationState> {
  const states: Record<string, PriorMigrationState> = {};
  for (const row of rows) {
    if (!(MIGRATIONS_0011_0014 as readonly string[]).includes(row.migration_name)) {
      throw new Error("Unexpected migration ledger row in 0011-0014 validation: " + row.migration_name);
    }
  }
  for (const name of MIGRATIONS_0011_0014) {
    const matches = rows.filter((row) => row.migration_name === name);
    if (matches.length === 0) {
      states[name] = "MISSING";
      continue;
    }
    if (matches.length !== 1 || matches[0].finished_at === null || matches[0].rolled_back_at !== null) {
      throw new Error("Migration history validation failed: " + name + " has failed, rolled-back, duplicate, or ambiguous ledger state.");
    }
    states[name] = "APPLIED";
  }
  return states;
}

export async function validateMigrations0011To0014(client: QueryClient): Promise<Record<string, PriorMigrationState>> {
  const ledgerRows = await client.query<LedgerRow>(
    "SELECT migration_name, finished_at, rolled_back_at FROM \"_prisma_migrations\" " +
    "WHERE migration_name IN ('0011_password_reset_token','0012_job_category','0013_connect_job_category','0014_candidate_subcategories')",
  );
  const states = classifyPriorMigrationLedger(ledgerRows.rows);

  const columnRows = await client.query<{
    table_name: string; column_name: string; data_type: string; udt_name: string;
    is_nullable: string; column_default: string | null;
  }>(
    "SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default " +
    "FROM information_schema.columns WHERE table_schema='public' AND (" +
    "table_name IN ('PasswordResetToken','JobCategory') OR " +
    "(table_name='CandidateDocument' AND column_name IN ('url','fileData')) OR " +
    "(table_name='CandidateProfile' AND column_name IN ('primaryCategoryId','subCategoryIds')) OR " +
    "(table_name='Job' AND column_name IN ('jobCategoryId','subCategoryId')))",
  );
  const columns: Record<string, Record<string, ColumnShape>> = {};
  for (const row of columnRows.rows) {
    (columns[row.table_name] ??= {})[row.column_name] = {
      dataType: row.data_type, udtName: row.udt_name, isNullable: row.is_nullable,
      columnDefault: normalizeDefault(row.column_default) || null,
    };
  }
  for (const [tableName, expected] of Object.entries(exactColumns)) {
    const actual = columns[tableName] ?? {};
    assertEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), tableName + " exact column set");
    for (const [columnName, shape] of Object.entries(expected)) {
      assertEqual(actual[columnName], { ...shape, columnDefault: normalizeDefault(shape.columnDefault) || null }, tableName + "." + columnName);
    }
  }
  for (const [tableName, expected] of Object.entries(partialColumns)) {
    const actual = columns[tableName] ?? {};
    for (const [columnName, shape] of Object.entries(expected)) {
      if (!actual[columnName]) throw new Error("Migration history validation failed: missing " + tableName + "." + columnName);
      assertEqual(actual[columnName], { ...shape, columnDefault: normalizeDefault(shape.columnDefault) || null }, tableName + "." + columnName);
    }
  }

  const pkRows = await client.query<{ table_name: string; column_name: string }>(
    "SELECT tc.table_name, kcu.column_name FROM information_schema.table_constraints tc " +
    "JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name " +
    "AND kcu.table_schema=tc.table_schema AND kcu.table_name=tc.table_name " +
    "WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY' " +
    "AND tc.table_name IN ('PasswordResetToken','JobCategory') ORDER BY tc.table_name,kcu.ordinal_position",
  );
  const primaryKeys: Record<string, string[]> = {};
  for (const row of pkRows.rows) (primaryKeys[row.table_name] ??= []).push(row.column_name);
  assertEqual(primaryKeys, { JobCategory: ["id"], PasswordResetToken: ["id"] }, "primary keys");

  const indexRows = await client.query<{ indexname: string; is_unique: boolean; columns: string[] }>(
    "SELECT idx.relname AS indexname, i.indisunique AS is_unique, " +
    "ARRAY_AGG(att.attname ORDER BY ord.ordinality) AS columns " +
    "FROM pg_class tbl JOIN pg_namespace ns ON ns.oid=tbl.relnamespace " +
    "JOIN pg_index i ON i.indrelid=tbl.oid JOIN pg_class idx ON idx.oid=i.indexrelid " +
    "CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS ord(attnum,ordinality) " +
    "JOIN pg_attribute att ON att.attrelid=tbl.oid AND att.attnum=ord.attnum " +
    "WHERE ns.nspname='public' AND idx.relname IN (" +
    "'PasswordResetToken_tokenHash_key','PasswordResetToken_email_idx'," +
    "'JobCategory_code_key','JobCategory_parentId_idx'," +
    "'CandidateProfile_primaryCategoryId_idx','Job_jobCategoryId_idx','Job_subCategoryId_idx') " +
    "GROUP BY idx.relname,i.indisunique ORDER BY idx.relname",
  );
  const indexes: Record<string, { unique: boolean; columns: string[] }> = {};
  for (const row of indexRows.rows) indexes[row.indexname] = { unique: row.is_unique, columns: row.columns };
  assertEqual(Object.keys(indexes).sort(), Object.keys(expectedIndexes).sort(), "expected indexes");
  for (const [name, expected] of Object.entries(expectedIndexes)) assertEqual(indexes[name], expected, "index " + name);

  const fkRows = await client.query<{
    constraint_name: string; table_name: string; column_name: string;
    foreign_table_name: string; foreign_column_name: string; delete_rule: string; update_rule: string;
    ordinal_position: number;
  }>(
    "SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, " +
    "ccu.column_name AS foreign_column_name, rc.delete_rule, rc.update_rule, kcu.ordinal_position " +
    "FROM information_schema.table_constraints tc " +
    "JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema " +
    "JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema " +
    "JOIN information_schema.referential_constraints rc ON tc.constraint_name=rc.constraint_name AND tc.table_schema=rc.constraint_schema " +
    "WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY' AND tc.constraint_name IN (" +
    "'JobCategory_parentId_fkey','CandidateProfile_primaryCategoryId_fkey','Job_jobCategoryId_fkey','Job_subCategoryId_fkey') " +
    "ORDER BY tc.constraint_name,kcu.ordinal_position",
  );
  const foreignKeys: Record<string, {
    tableName: string; columns: string[]; referencedTable: string; referencedColumns: string[];
    onDelete: string; onUpdate: string;
  }> = {};
  for (const row of fkRows.rows) {
    const current = foreignKeys[row.constraint_name] ??= {
      tableName: row.table_name, columns: [], referencedTable: row.foreign_table_name,
      referencedColumns: [], onDelete: row.delete_rule, onUpdate: row.update_rule,
    };
    current.columns.push(row.column_name);
    current.referencedColumns.push(row.foreign_column_name);
  }
  assertEqual(Object.keys(foreignKeys).sort(), Object.keys(expectedForeignKeys).sort(), "foreign key set");
  for (const [name, expected] of Object.entries(expectedForeignKeys)) assertEqual(foreignKeys[name], expected, "foreign key " + name);

  return states;
}

export async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const prisma = new PrismaClient();
  try {
    let states: Record<string, PriorMigrationState> = {};
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      states = await validateMigrations0011To0014({
        query: async <T>(sql: string) => ({ rows: await tx.$queryRawUnsafe<T[]>(sql) }),
      });
    });
    for (const name of MIGRATIONS_0011_0014) console.log(name + ": " + states[name]);
    console.log("Migrations 0011-0014 schema validation: OK (read-only; no writes).");
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === "file://" + process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
