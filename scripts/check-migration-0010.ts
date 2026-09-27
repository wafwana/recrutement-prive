import { PrismaClient } from "@prisma/client";

export type MigrationLedgerState = "FAILED" | "APPLIED";

export type Migration0010Expected = {
  enums: Record<string, string[]>;
  jobColumns: Record<string, { dataType: string; udtName: string; isNullable: string; columnDefault: string | null }>;
  missionPresentationColumns: Record<string, { dataType: string; udtName: string; isNullable: string; columnDefault: string | null }>;
  primaryKey: string[];
  indexes: Record<string, { unique: boolean; columns: string[] }>;
  foreignKeys: Record<string, { columns: string[]; referencedTable: string; referencedColumns: string[]; onDelete: string; onUpdate: string }>;
};

const EXPECTED: Migration0010Expected = {
  enums: {
    MissionPresentationState: [
      "MISSION_ACTIVE",
      "CANDIDAT_ANONYME",
      "CONDITION_FINANCIERE_EN_ATTENTE",
      "PAIEMENT_OU_CONDITION_CONFIRME",
      "IDENTITE_DEBLOQUEE",
      "MISSION_TERMINEE",
    ],
    FinancialConditionStatus: ["PENDING", "CONFIRMED", "FAILED", "EXPIRED"],
  },
  jobColumns: {
    missionType: { dataType: "text", udtName: "text", isNullable: "YES", columnDefault: null },
    financialCondition: { dataType: "jsonb", udtName: "jsonb", isNullable: "YES", columnDefault: null },
    financialConditionStatus: {
      dataType: "USER-DEFINED",
      udtName: "FinancialConditionStatus",
      isNullable: "NO",
      columnDefault: "'PENDING'::FinancialConditionStatus",
    },
  },
  missionPresentationColumns: {
    id: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    missionId: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    applicationId: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    candidateId: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    companyId: { dataType: "text", udtName: "text", isNullable: "NO", columnDefault: null },
    state: {
      dataType: "USER-DEFINED",
      udtName: "MissionPresentationState",
      isNullable: "NO",
      columnDefault: "'MISSION_ACTIVE'::MissionPresentationState",
    },
    financialConditionStatus: {
      dataType: "USER-DEFINED",
      udtName: "FinancialConditionStatus",
      isNullable: "NO",
      columnDefault: "'PENDING'::FinancialConditionStatus",
    },
    presentedAt: {
      dataType: "timestamp without time zone",
      udtName: "timestamp",
      isNullable: "NO",
      columnDefault: "CURRENT_TIMESTAMP",
    },
    conditionConfirmedAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "YES", columnDefault: null },
    unlockedAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "YES", columnDefault: null },
    completedAt: { dataType: "timestamp without time zone", udtName: "timestamp", isNullable: "YES", columnDefault: null },
    securityDetails: { dataType: "jsonb", udtName: "jsonb", isNullable: "YES", columnDefault: null },
  },
  primaryKey: ["id"],
  indexes: {
    MissionPresentation_applicationId_companyId_key: { unique: true, columns: ["applicationId", "companyId"] },
    MissionPresentation_missionId_companyId_state_idx: { unique: false, columns: ["missionId", "companyId", "state"] },
    MissionPresentation_candidateId_companyId_idx: { unique: false, columns: ["candidateId", "companyId"] },
  },
  foreignKeys: {
    MissionPresentation_missionId_fkey: {
      columns: ["missionId"],
      referencedTable: "Job",
      referencedColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    MissionPresentation_applicationId_fkey: {
      columns: ["applicationId"],
      referencedTable: "Application",
      referencedColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    MissionPresentation_candidateId_fkey: {
      columns: ["candidateId"],
      referencedTable: "CandidateProfile",
      referencedColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    MissionPresentation_companyId_fkey: {
      columns: ["companyId"],
      referencedTable: "Company",
      referencedColumns: ["id"],
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
};

// PostgreSQL may render mixed-case enum casts with quoted identifiers in information_schema defaults.
export const normalizeDefault = (v: string | null) =>
  (v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/::"([A-Za-z_][A-Za-z0-9_]*)"/g, "::$1");

export function classifyMigration0010Ledger(rows: Array<{ finished_at: string | null; rolled_back_at: string | null }>): MigrationLedgerState {
  if (rows.length !== 1) {
    throw new Error(`Migration 0010 validation failed: expected exactly one Prisma ledger row, found ${rows.length}`);
  }
  const row = rows[0];
  if (row.rolled_back_at !== null) {
    throw new Error("Migration 0010 validation failed: ledger row is marked rolled back; refusing automatic recovery.");
  }
  return row.finished_at === null ? "FAILED" : "APPLIED";
}

export function migration0010RecoveryAction(state: MigrationLedgerState): "RESOLVE" | "SKIP" {
  return state === "FAILED" ? "RESOLVE" : "SKIP";
}

const REQUIRED_PRIOR_MIGRATIONS = [
  "0011_password_reset_token",
  "0012_job_category",
  "0013_connect_job_category",
  "0014_candidate_subcategories",
] as const;

export function assertPriorMigrationLedgerApplied(
  rows: Array<{ migration_name: string; finished_at: string | null; rolled_back_at: string | null }>,
): void {
  const byName = new Map<string, typeof rows>();
  for (const row of rows) byName.set(row.migration_name, [...(byName.get(row.migration_name) ?? []), row]);
  for (const migrationName of REQUIRED_PRIOR_MIGRATIONS) {
    const matches = byName.get(migrationName) ?? [];
    if (matches.length !== 1 || matches[0].finished_at === null || matches[0].rolled_back_at !== null) {
      throw new Error(
        `Migration recovery blocked: prerequisite ${migrationName} must have exactly one successful, non-rolled-back ledger row; reconcile its history separately before resolving 0010 or deploying later migrations.`,
      );
    }
  }
  if (rows.length !== REQUIRED_PRIOR_MIGRATIONS.length) {
    throw new Error("Migration recovery blocked: unexpected or duplicate prerequisite migration ledger rows.");
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`Migration 0010 validation failed for ${label}: expected ${e}, got ${a}`);
}

export async function validateMigration0010(client: { query: <T>(query: string) => Promise<{ rows: T[] }> }): Promise<void> {
  const migrationRows = await client.query<{
    migration_name: string;
    finished_at: string | null;
    rolled_back_at: string | null;
  }>(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = '0010_mission_presentation_lock'
  `);
  const ledgerState = classifyMigration0010Ledger(migrationRows.rows);
  console.log(`Migration 0010 ledger status: ${ledgerState}`);

  const priorMigrationRows = await client.query<{
    migration_name: string;
    finished_at: string | null;
    rolled_back_at: string | null;
  }>(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name IN (
      '0011_password_reset_token',
      '0012_job_category',
      '0013_connect_job_category',
      '0014_candidate_subcategories'
    )
  `);
  assertPriorMigrationLedgerApplied(priorMigrationRows.rows);

  const enumRows = await client.query<{
    typname: string;
    enumlabel: string;
    enumsortorder: number;
  }>(`
    SELECT t.typname, e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN ('MissionPresentationState','FinancialConditionStatus')
    ORDER BY t.typname, e.enumsortorder
  `);
  const enums: Record<string, string[]> = {};
  for (const row of enumRows.rows) (enums[row.typname] ??= []).push(row.enumlabel);
  assertEqual(
    Object.fromEntries(Object.entries(enums).sort(([a], [b]) => a.localeCompare(b))),
    Object.fromEntries(Object.entries(EXPECTED.enums).sort(([a], [b]) => a.localeCompare(b))),
    "enum values",
  );

  const jobRows = await client.query<{
    column_name: string; data_type: string; udt_name: string; is_nullable: string; column_default: string | null;
  }>(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Job' AND column_name IN ('missionType','financialCondition','financialConditionStatus')
    ORDER BY column_name
  `);
  const jobColumns: Record<string, object> = {};
  for (const row of jobRows.rows) {
    jobColumns[row.column_name] = {
      dataType: row.data_type,
      udtName: row.udt_name,
      isNullable: row.is_nullable,
      columnDefault: normalizeDefault(row.column_default),
    };
  }
  for (const [name, expected] of Object.entries(EXPECTED.jobColumns)) {
    const got = jobColumns[name];
    if (!got) throw new Error(`Migration 0010 validation failed: missing Job.${name}`);
    assertEqual(got, { ...expected, columnDefault: normalizeDefault(expected.columnDefault) }, `Job.${name}`);
  }
  assertEqual(Object.keys(jobColumns).sort(), Object.keys(EXPECTED.jobColumns).sort(), "Job 0010 column set");

  const mpRows = await client.query<{
    column_name: string; data_type: string; udt_name: string; is_nullable: string; column_default: string | null;
  }>(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='MissionPresentation'
    ORDER BY ordinal_position
  `);
  const missionPresentationColumns: Record<string, object> = {};
  for (const row of mpRows.rows) {
    missionPresentationColumns[row.column_name] = {
      dataType: row.data_type,
      udtName: row.udt_name,
      isNullable: row.is_nullable,
      columnDefault: normalizeDefault(row.column_default),
    };
  }
  assertEqual(Object.keys(missionPresentationColumns).sort(), Object.keys(EXPECTED.missionPresentationColumns).sort(), "MissionPresentation column set");
  for (const [name, expected] of Object.entries(EXPECTED.missionPresentationColumns)) {
    assertEqual(
      missionPresentationColumns[name],
      { ...expected, columnDefault: normalizeDefault(expected.columnDefault) },
      `MissionPresentation.${name}`,
    );
  }

  const pkRows = await client.query<{ column_name: string }>(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name=tc.constraint_name
     AND kcu.table_schema=tc.table_schema
     AND kcu.table_name=tc.table_name
    WHERE tc.table_schema='public'
      AND tc.table_name='MissionPresentation'
      AND tc.constraint_type='PRIMARY KEY'
    ORDER BY kcu.ordinal_position
  `);
  assertEqual(pkRows.rows.map(r => r.column_name), EXPECTED.primaryKey, "primary key");

  const indexRows = await client.query<{ indexname: string; is_unique: boolean; columns: string[] }>(`
    SELECT idx.relname AS indexname,
           i.indisunique AS is_unique,
           ARRAY_AGG(att.attname ORDER BY ord.ordinality) AS columns
    FROM pg_class tbl
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    JOIN pg_index i ON i.indrelid = tbl.oid
    JOIN pg_class idx ON idx.oid = i.indexrelid
    CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS ord(attnum, ordinality)
    JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = ord.attnum
    LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'MissionPresentation'
      AND idx.relname IN (
        'MissionPresentation_applicationId_companyId_key',
        'MissionPresentation_missionId_companyId_state_idx',
        'MissionPresentation_candidateId_companyId_idx'
      )
    GROUP BY idx.relname, i.indisunique
    ORDER BY idx.relname
  `);
  const indexes: Record<string, { unique: boolean; columns: string[] }> = {};
  for (const row of indexRows.rows) {
    indexes[row.indexname] = { unique: row.is_unique, columns: row.columns };
  }
  for (const [name, expected] of Object.entries(EXPECTED.indexes)) {
    if (!indexes[name]) throw new Error(`Migration 0010 validation failed: missing index ${name}`);
    assertEqual(indexes[name], expected, `index ${name}`);
  }
  assertEqual(Object.keys(indexes).sort(), Object.keys(EXPECTED.indexes).sort(), "MissionPresentation migration-defined index set");


  const fkRows = await client.query<{
    constraint_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
    delete_rule: string;
    update_rule: string;
    ordinal_position: number;
  }>(`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name, rc.delete_rule, rc.update_rule,
           kcu.ordinal_position
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name=ccu.constraint_name AND tc.table_schema=ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name=rc.constraint_name AND tc.table_schema=rc.constraint_schema
    WHERE tc.table_schema='public'
      AND tc.table_name='MissionPresentation'
      AND tc.constraint_type='FOREIGN KEY'
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `);
  const foreignKeys: Record<string, {
    columns: string[]; referencedTable: string; referencedColumns: string[]; onDelete: string; onUpdate: string;
  }> = {};
  for (const row of fkRows.rows) {
    const current = (foreignKeys[row.constraint_name] ??= {
      columns: [], referencedTable: row.foreign_table_name, referencedColumns: [], onDelete: row.delete_rule, onUpdate: row.update_rule,
    });
    current.columns.push(row.column_name);
    current.referencedColumns.push(row.foreign_column_name);
  }
  assertEqual(Object.keys(foreignKeys).sort(), Object.keys(EXPECTED.foreignKeys).sort(), "foreign key set");
  for (const [name, expected] of Object.entries(EXPECTED.foreignKeys)) {
    assertEqual(foreignKeys[name], expected, `foreign key ${name}`);
  }
}

export async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await validateMigration0010({
        query: async <T>(query: string) => ({ rows: await tx.$queryRawUnsafe<T[]>(query) }),
      });
    });
    console.log("Migration 0010 schema validation: OK (read-only transaction, no writes).");
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
