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
  {
    version: 14,
    name: 'preferred-training-time',
    statements: [
      `ALTER TABLE user_profiles
        ADD COLUMN preferred_training_time TEXT NOT NULL DEFAULT 'morning';`,
    ],
  },
  {
    version: 15,
    name: 'cycle-review-reflections',
    statements: [
      `CREATE TABLE IF NOT EXISTS cycle_reviews (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL UNIQUE,
        overall_rating INTEGER,
        focus TEXT,
        next_action TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (cycle_id) REFERENCES training_cycles(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS cycle_reviews_user_updated
        ON cycle_reviews(user_id, updated_at DESC);`,
    ],
  },
  {
    version: 16,
    name: 'partial-workout-completion-reason',
    statements: [
      `ALTER TABLE workout_sessions
        ADD COLUMN completion_reason TEXT;`,
    ],
  },
  {
    version: 17,
    name: 'cycle-workout-schedule-overrides',
    statements: [
      `CREATE TABLE IF NOT EXISTS workout_schedule_overrides (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL,
        cycle_week INTEGER NOT NULL,
        workout_id TEXT NOT NULL,
        original_date TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(cycle_id, cycle_week, workout_id),
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (cycle_id) REFERENCES training_cycles(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS workout_schedule_overrides_cycle_date
        ON workout_schedule_overrides(cycle_id, scheduled_date, cycle_week);`,
    ],
  },
  {
    version: 18,
    name: 'workout-session-notes',
    statements: [
      `ALTER TABLE workout_sessions
        ADD COLUMN note TEXT;`,
    ],
  },
  {
    version: 19,
    name: 'profile-considerations-and-manual-body-metrics',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_considerations (
        user_id TEXT PRIMARY KEY NOT NULL,
        movement_considerations_json TEXT NOT NULL DEFAULT '[]',
        accessibility_needs_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS body_metrics (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        measured_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS body_metrics_user_type_measured
        ON body_metrics(user_id, metric_type, measured_at DESC);`,
    ],
  },
  {
    version: 20,
    name: 'coach-provider-privacy-preference',
    statements: [
      `CREATE TABLE IF NOT EXISTS coach_privacy_preferences (
        user_id TEXT PRIMARY KEY NOT NULL,
        provider_coach_enabled INTEGER NOT NULL DEFAULT 0,
        notice_version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
      );`,
    ],
  },
  {
    version: 21,
    name: 'empty-shift-measurement-foundation',
    statements: [
      `CREATE UNIQUE INDEX IF NOT EXISTS training_cycles_id_user
        ON training_cycles(id, user_id);`,
      `CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        cycle_id TEXT NOT NULL UNIQUE,
        program_version_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        template_version INTEGER NOT NULL CHECK (template_version > 0),
        block_objective TEXT NOT NULL,
        longer_term_aspiration TEXT,
        active_protocol_id TEXT NOT NULL,
        active_protocol_version INTEGER NOT NULL CHECK (active_protocol_version > 0),
        target_json TEXT NOT NULL,
        baseline_state TEXT NOT NULL CHECK (baseline_state IN ('measured', 'not-yet-able', 'deferred', 'missing')),
        baseline_observation_id TEXT,
        review_state TEXT NOT NULL CHECK (review_state IN ('due', 'completed', 'declined', 'postponed', 'missing')),
        next_choice TEXT NOT NULL CHECK (next_choice IN ('maintain', 'repeat', 'modify', 'new-goal', 'break', 'undecided')),
        is_primary INTEGER NOT NULL CHECK (is_primary IN (0, 1)),
        created_at TEXT NOT NULL,
        UNIQUE(id, user_id),
        CHECK ((baseline_state = 'measured') = (baseline_observation_id IS NOT NULL)),
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (cycle_id, user_id) REFERENCES training_cycles(id, user_id) ON UPDATE CASCADE
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS shifts_one_primary_per_user
        ON shifts(user_id) WHERE is_primary = 1;`,
      `CREATE INDEX IF NOT EXISTS shifts_user_created
        ON shifts(user_id, created_at DESC);`,
      `CREATE TABLE IF NOT EXISTS shift_protocols (
        shift_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        protocol_id TEXT NOT NULL,
        protocol_version INTEGER NOT NULL CHECK (protocol_version > 0),
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (shift_id, protocol_id, protocol_version),
        FOREIGN KEY (shift_id, user_id) REFERENCES shifts(id, user_id) ON UPDATE CASCADE ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS shift_observations (
        id TEXT PRIMARY KEY NOT NULL,
        shift_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        protocol_id TEXT NOT NULL,
        protocol_version INTEGER NOT NULL,
        measured_at TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('assessment', 'historical-entry', 'import', 'qualifying-workout')),
        value_json TEXT NOT NULL,
        unit TEXT NOT NULL,
        workout_session_id TEXT,
        corrects_observation_id TEXT,
        UNIQUE(shift_id, id),
        CHECK (corrects_observation_id IS NULL OR corrects_observation_id <> id),
        CHECK (source <> 'qualifying-workout' OR workout_session_id IS NOT NULL),
        FOREIGN KEY (shift_id, user_id) REFERENCES shifts(id, user_id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (shift_id, protocol_id, protocol_version)
          REFERENCES shift_protocols(shift_id, protocol_id, protocol_version),
        FOREIGN KEY (shift_id, corrects_observation_id)
          REFERENCES shift_observations(shift_id, id)
      );`,
      `CREATE INDEX IF NOT EXISTS shift_observations_user_date
        ON shift_observations(user_id, shift_id, measured_at, id);`,
      `CREATE TABLE IF NOT EXISTS shift_goal_revisions (
        id TEXT PRIMARY KEY NOT NULL,
        shift_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        previous_revision_id TEXT,
        protocol_id TEXT NOT NULL,
        protocol_version INTEGER NOT NULL,
        target_json TEXT NOT NULL,
        block_objective TEXT NOT NULL,
        reason TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        UNIQUE(shift_id, id),
        CHECK (previous_revision_id IS NULL OR previous_revision_id <> id),
        FOREIGN KEY (shift_id, user_id) REFERENCES shifts(id, user_id) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (shift_id, protocol_id, protocol_version)
          REFERENCES shift_protocols(shift_id, protocol_id, protocol_version),
        FOREIGN KEY (shift_id, previous_revision_id)
          REFERENCES shift_goal_revisions(shift_id, id)
      );`,
      `CREATE INDEX IF NOT EXISTS shift_goal_revisions_user_date
        ON shift_goal_revisions(user_id, shift_id, recorded_at, id);`,
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
