import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'local-first-workout-foundation',
    statements: [
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        cycle_id TEXT NOT NULL,
        workout_id TEXT NOT NULL,
        program_version_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        is_offline INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS completed_sets (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        workout_exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        load REAL,
        reps INTEGER,
        duration_seconds INTEGER,
        distance_meters REAL,
        rpe REAL,
        rir REAL,
        completed_at TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS completed_sets_session_exercise_set
        ON completed_sets(session_id, workout_exercise_id, set_number);`,
      `CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );`,
    ],
  },
];

export async function migrateDatabase(
  database: SQLiteDatabase,
  appliedAt = new Date().toISOString(),
): Promise<void> {
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const latest = await database.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations;',
  );
  let currentVersion = latest?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue;

    await database.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await database.execAsync(statement);
      }
      await database.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
        migration.version,
        migration.name,
        appliedAt,
      );
    });

    currentVersion = migration.version;
  }
}
