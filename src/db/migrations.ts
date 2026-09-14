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
  {
    version: 2,
    name: 'onboarding-profile-and-equipment',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        display_name TEXT NOT NULL,
        unit_system TEXT NOT NULL,
        goals_json TEXT NOT NULL,
        experience TEXT NOT NULL,
        training_days_per_week INTEGER NOT NULL,
        preferred_session_minutes INTEGER NOT NULL,
        coach_tone TEXT NOT NULL,
        coach_intervention TEXT NOT NULL,
        health_connection TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS user_equipment (
        user_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        PRIMARY KEY (user_id, equipment_id),
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
      );`,
    ],
  },
  {
    version: 3,
    name: 'versioned-training-cycles',
    statements: [
      `CREATE TABLE IF NOT EXISTS training_cycles (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        program_version_id TEXT NOT NULL,
        status TEXT NOT NULL,
        current_week INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        weeks_json TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS training_cycles_user_status_started
        ON training_cycles(user_id, status, started_at DESC);`,
    ],
  },
  {
    version: 4,
    name: 'workout-session-focus',
    statements: [
      `ALTER TABLE workout_sessions
        ADD COLUMN workout_focus TEXT NOT NULL DEFAULT 'mixed';`,
    ],
  },
  {
    version: 5,
    name: 'user-program-and-exercise-snapshots',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_programs (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        source_program_id TEXT,
        program_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS user_program_versions (
        id TEXT PRIMARY KEY NOT NULL,
        program_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        status TEXT NOT NULL,
        version_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(program_id, version),
        FOREIGN KEY (program_id) REFERENCES user_programs(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS user_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        exercise_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 6,
    name: 'workout-session-cycle-week',
    statements: [
      `ALTER TABLE workout_sessions
        ADD COLUMN cycle_week INTEGER NOT NULL DEFAULT 1;`,
    ],
  },
  {
    version: 7,
    name: 'coach-proposals',
    statements: [
      `CREATE TABLE IF NOT EXISTS coach_proposals (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        confidence TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        changes_json TEXT NOT NULL,
        safety_notes_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS coach_proposals_user_cycle_status
        ON coach_proposals(user_id, cycle_id, status, created_at DESC);`,
    ],
  },
  {
    version: 8,
    name: 'durable-workout-drafts',
    statements: [
      `CREATE TABLE IF NOT EXISTS workout_drafts (
        session_id TEXT PRIMARY KEY NOT NULL,
        values_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );`,
    ],
  },
  {
    version: 9,
    name: 'workout-check-ins',
    statements: [
      `CREATE TABLE IF NOT EXISTS workout_check_ins (
        session_id TEXT PRIMARY KEY NOT NULL,
        energy INTEGER,
        soreness INTEGER,
        perceived_exertion INTEGER,
        discomfort_reported INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );`,
    ],
  },
  {
    version: 10,
    name: 'completed-set-exercise-identity',
    statements: [
      `ALTER TABLE completed_sets
        ADD COLUMN exercise_id TEXT;`,
    ],
  },
  {
    version: 11,
    name: 'workout-session-readiness',
    statements: [
      `ALTER TABLE workout_sessions
        ADD COLUMN readiness TEXT;`,
    ],
  },
  {
    version: 12,
    name: 'local-health-summaries',
    statements: [
      `CREATE TABLE IF NOT EXISTS health_summaries (
        user_id TEXT NOT NULL,
        source TEXT NOT NULL,
        id TEXT NOT NULL,
        health_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        PRIMARY KEY (user_id, source, id),
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS health_summaries_user_type_start
        ON health_summaries(user_id, health_type, start_at ASC);`,
    ],
  },
  {
    version: 13,
    name: 'notification-preferences',
    statements: [
      `CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id TEXT PRIMARY KEY NOT NULL,
        workout_reminders INTEGER NOT NULL DEFAULT 0,
        rest_timer INTEGER NOT NULL DEFAULT 0,
        weekly_review INTEGER NOT NULL DEFAULT 0,
        cycle_review INTEGER NOT NULL DEFAULT 0,
        coach_messages INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
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
