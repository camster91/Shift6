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
  {
    version: 22,
    name: 'local-onboarding-recovery',
    statements: [
      `CREATE TABLE IF NOT EXISTS onboarding_drafts (
        user_id TEXT PRIMARY KEY NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 23,
    name: 'guest-personal-goals',
    statements: [
      `CREATE TABLE personal_goal_events (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, shift_id TEXT NOT NULL, kind TEXT NOT NULL, payload_json TEXT NOT NULL, recorded_at TEXT NOT NULL, FOREIGN KEY(shift_id,user_id) REFERENCES shifts(id,user_id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE TABLE personal_goal_drafts (user_id TEXT NOT NULL, cycle_id TEXT NOT NULL, fields_json TEXT NOT NULL, PRIMARY KEY(user_id,cycle_id), FOREIGN KEY(cycle_id,user_id) REFERENCES training_cycles(id,user_id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE TRIGGER cycle_goal_prescription_immutable BEFORE UPDATE OF program_version_id ON training_cycles WHEN NEW.program_version_id != OLD.program_version_id AND EXISTS(SELECT 1 FROM shifts WHERE cycle_id=OLD.id) BEGIN SELECT RAISE(ABORT,'A goal-linked prescription is immutable.'); END;`,
    ],
  },
  {
    version: 24,
    name: 'local-confirmed-recovery-foundation',
    statements: [
      `CREATE TABLE cycle_lifecycle_events (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, cycle_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('pause','resume','review-date')), effective_date TEXT NOT NULL, time_zone TEXT NOT NULL, previous_event_id TEXT, operation_id TEXT NOT NULL, recorded_at TEXT NOT NULL, UNIQUE(user_id,operation_id), UNIQUE(id,user_id,cycle_id), FOREIGN KEY(cycle_id,user_id) REFERENCES training_cycles(id,user_id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(previous_event_id,user_id,cycle_id) REFERENCES cycle_lifecycle_events(id,user_id,cycle_id) DEFERRABLE INITIALLY DEFERRED);`,
      `CREATE TRIGGER lifecycle_content_immutable BEFORE UPDATE OF id,cycle_id,kind,effective_date,time_zone,previous_event_id,operation_id,recorded_at ON cycle_lifecycle_events WHEN NEW.id IS NOT OLD.id OR NEW.cycle_id IS NOT OLD.cycle_id OR NEW.kind IS NOT OLD.kind OR NEW.effective_date IS NOT OLD.effective_date OR NEW.time_zone IS NOT OLD.time_zone OR NEW.previous_event_id IS NOT OLD.previous_event_id OR NEW.operation_id IS NOT OLD.operation_id OR NEW.recorded_at IS NOT OLD.recorded_at BEGIN SELECT RAISE(ABORT,'Lifecycle history is append-only.'); END;`,
      `CREATE UNIQUE INDEX lifecycle_previous_once ON cycle_lifecycle_events(previous_event_id) WHERE previous_event_id IS NOT NULL;`,
      `CREATE UNIQUE INDEX lifecycle_root_once ON cycle_lifecycle_events(cycle_id) WHERE previous_event_id IS NULL;`,
      `CREATE TABLE coach_memory_preferences (user_id TEXT PRIMARY KEY NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE TABLE coach_memory_facts (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, value_json TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision >= 1), operation_id TEXT NOT NULL, confirmed_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id,operation_id), FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE TABLE builder_recovery_drafts (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, snapshot_json TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision >= 1), updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE UNIQUE INDEX completed_sets_id_session ON completed_sets(id,session_id);`,
      `CREATE TABLE set_feedback_events (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, session_id TEXT NOT NULL, completed_set_id TEXT NOT NULL, difficulty TEXT NOT NULL CHECK(difficulty IN ('easier-than-expected','about-right','harder-than-expected')), corrects_event_id TEXT, operation_id TEXT NOT NULL, recorded_at TEXT NOT NULL, UNIQUE(user_id,operation_id), UNIQUE(id,user_id,session_id,completed_set_id), FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(completed_set_id,session_id) REFERENCES completed_sets(id,session_id) ON DELETE CASCADE, FOREIGN KEY(corrects_event_id,user_id,session_id,completed_set_id) REFERENCES set_feedback_events(id,user_id,session_id,completed_set_id) DEFERRABLE INITIALLY DEFERRED);`,
      `CREATE TRIGGER set_feedback_content_immutable BEFORE UPDATE OF id,session_id,completed_set_id,difficulty,corrects_event_id,operation_id,recorded_at ON set_feedback_events WHEN NEW.id IS NOT OLD.id OR NEW.session_id IS NOT OLD.session_id OR NEW.completed_set_id IS NOT OLD.completed_set_id OR NEW.difficulty IS NOT OLD.difficulty OR NEW.corrects_event_id IS NOT OLD.corrects_event_id OR NEW.operation_id IS NOT OLD.operation_id OR NEW.recorded_at IS NOT OLD.recorded_at BEGIN SELECT RAISE(ABORT,'Set feedback history is append-only.'); END;`,
      `CREATE UNIQUE INDEX set_feedback_parent_once ON set_feedback_events(corrects_event_id) WHERE corrects_event_id IS NOT NULL;`,
      `CREATE UNIQUE INDEX set_feedback_root_once ON set_feedback_events(completed_set_id) WHERE corrects_event_id IS NULL;`,
      `CREATE TRIGGER set_feedback_owned_insert BEFORE INSERT ON set_feedback_events WHEN NOT EXISTS(SELECT 1 FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id WHERE s.id=NEW.session_id AND c.user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Feedback must belong to an owned saved set.'); END;`,
      `CREATE TRIGGER set_feedback_owned_update BEFORE UPDATE ON set_feedback_events WHEN NOT EXISTS(SELECT 1 FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id WHERE s.id=NEW.session_id AND c.user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Feedback must belong to an owned saved set.'); END;`,
    ],
  },
  {
    version: 25,
    name: 'actual-load-unit-provenance',
    statements: [
      `CREATE TABLE completed_set_load_provenance (completed_set_id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, user_id TEXT NOT NULL, load_unit TEXT NOT NULL CHECK(load_unit IN ('kg','lb')), load_value REAL NOT NULL CHECK(load_value>=0), set_completed_at TEXT NOT NULL, recorded_at TEXT NOT NULL, FOREIGN KEY(completed_set_id,session_id) REFERENCES completed_sets(id,session_id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE TABLE workout_draft_load_units (session_id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, load_units_json TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(session_id) REFERENCES workout_drafts(session_id) ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE);`,
      `CREATE TRIGGER load_provenance_owned_insert BEFORE INSERT ON completed_set_load_provenance WHEN NOT EXISTS(SELECT 1 FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id JOIN completed_sets t ON t.session_id=s.id WHERE t.id=NEW.completed_set_id AND c.user_id=NEW.user_id AND t.load=NEW.load_value AND t.completed_at=NEW.set_completed_at) BEGIN SELECT RAISE(ABORT,'Actual load provenance must match its owned set.'); END;`,
      `CREATE TRIGGER load_provenance_owned_update BEFORE UPDATE ON completed_set_load_provenance WHEN NOT EXISTS(SELECT 1 FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id JOIN completed_sets t ON t.session_id=s.id WHERE t.id=NEW.completed_set_id AND c.user_id=NEW.user_id AND t.load=NEW.load_value AND t.completed_at=NEW.set_completed_at) BEGIN SELECT RAISE(ABORT,'Actual load provenance must match its owned set.'); END;`,
      `CREATE TRIGGER draft_units_owned_insert BEFORE INSERT ON workout_draft_load_units WHEN NOT EXISTS(SELECT 1 FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id WHERE s.id=NEW.session_id AND c.user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Draft units must belong to the owned session.'); END;`,
      `CREATE TRIGGER draft_units_owned_update BEFORE UPDATE ON workout_draft_load_units WHEN NOT EXISTS(SELECT 1 FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id WHERE s.id=NEW.session_id AND c.user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Draft units must belong to the owned session.'); END;`,
    ],
  },
  {
    version: 26,
    name: 'inactive-confirmed-schedule-revisions',
    statements: [
      `CREATE TRIGGER legacy_schedule_frozen_insert BEFORE INSERT ON workout_schedule_overrides WHEN EXISTS(SELECT 1 FROM schedule_baselines WHERE cycle_id=NEW.cycle_id) BEGIN SELECT RAISE(ABORT,'Legacy schedule writes are blocked by the confirmed baseline.'); END;`,
      `CREATE TRIGGER legacy_schedule_frozen_delete BEFORE DELETE ON workout_schedule_overrides WHEN EXISTS(SELECT 1 FROM schedule_baselines WHERE cycle_id=OLD.cycle_id) BEGIN SELECT RAISE(ABORT,'Legacy schedule deletes are blocked by the confirmed baseline.'); END;`,
      `CREATE TRIGGER legacy_schedule_frozen_update BEFORE UPDATE ON workout_schedule_overrides WHEN (EXISTS(SELECT 1 FROM schedule_baselines WHERE cycle_id=OLD.cycle_id) OR EXISTS(SELECT 1 FROM schedule_baselines WHERE cycle_id=NEW.cycle_id)) AND (NEW.id IS NOT OLD.id OR NEW.cycle_id IS NOT OLD.cycle_id OR NEW.cycle_week IS NOT OLD.cycle_week OR NEW.workout_id IS NOT OLD.workout_id OR NEW.original_date IS NOT OLD.original_date OR NEW.scheduled_date IS NOT OLD.scheduled_date OR NEW.created_at IS NOT OLD.created_at OR NEW.updated_at IS NOT OLD.updated_at OR NEW.user_id IS NOT (SELECT user_id FROM training_cycles WHERE id=NEW.cycle_id)) BEGIN SELECT RAISE(ABORT,'Legacy schedule updates are blocked by the confirmed baseline.'); END;`,
      `CREATE TABLE schedule_baselines (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, cycle_id TEXT NOT NULL UNIQUE, program_version_id TEXT NOT NULL, operation_id TEXT NOT NULL, time_zone TEXT NOT NULL, confirmed_at TEXT NOT NULL, dates_json TEXT NOT NULL, UNIQUE(user_id,operation_id), UNIQUE(cycle_id,user_id,program_version_id), FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(cycle_id) REFERENCES training_cycles(id) ON DELETE CASCADE);`,
      `CREATE TABLE schedule_revisions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, cycle_id TEXT NOT NULL, program_version_id TEXT NOT NULL, cycle_week INTEGER NOT NULL CHECK(cycle_week BETWEEN 1 AND 6), workout_id TEXT NOT NULL, previous_revision_id TEXT, from_date TEXT NOT NULL, to_date TEXT NOT NULL, time_zone TEXT NOT NULL, recorded_at TEXT NOT NULL, effective_date TEXT NOT NULL, UNIQUE(id,user_id,cycle_id), FOREIGN KEY(cycle_id,user_id,program_version_id) REFERENCES schedule_baselines(cycle_id,user_id,program_version_id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(previous_revision_id,user_id,cycle_id) REFERENCES schedule_revisions(id,user_id,cycle_id) ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED);`,
      `CREATE UNIQUE INDEX schedule_revision_root_once ON schedule_revisions(cycle_id) WHERE previous_revision_id IS NULL;`,
      `CREATE UNIQUE INDEX schedule_revision_child_once ON schedule_revisions(previous_revision_id) WHERE previous_revision_id IS NOT NULL;`,
      `CREATE TRIGGER schedule_baseline_owned_insert BEFORE INSERT ON schedule_baselines WHEN NOT EXISTS(SELECT 1 FROM training_cycles WHERE id=NEW.cycle_id AND user_id=NEW.user_id AND program_version_id=NEW.program_version_id) BEGIN SELECT RAISE(ABORT,'Schedule baseline must belong to its exact owned cycle version.'); END;`,
      `CREATE TRIGGER schedule_baseline_owned_update BEFORE UPDATE ON schedule_baselines WHEN NOT EXISTS(SELECT 1 FROM training_cycles WHERE id=NEW.cycle_id AND user_id=NEW.user_id AND program_version_id=NEW.program_version_id) BEGIN SELECT RAISE(ABORT,'Schedule baseline owner changed.'); END;`,
      `CREATE TRIGGER schedule_baseline_immutable BEFORE UPDATE OF id,cycle_id,program_version_id,operation_id,time_zone,confirmed_at,dates_json ON schedule_baselines WHEN NEW.id IS NOT OLD.id OR NEW.cycle_id IS NOT OLD.cycle_id OR NEW.program_version_id IS NOT OLD.program_version_id OR NEW.operation_id IS NOT OLD.operation_id OR NEW.time_zone IS NOT OLD.time_zone OR NEW.confirmed_at IS NOT OLD.confirmed_at OR NEW.dates_json IS NOT OLD.dates_json BEGIN SELECT RAISE(ABORT,'Schedule baseline is immutable.'); END;`,
      `CREATE TRIGGER schedule_revision_immutable BEFORE UPDATE OF id,cycle_id,program_version_id,cycle_week,workout_id,previous_revision_id,from_date,to_date,time_zone,recorded_at,effective_date ON schedule_revisions WHEN NEW.id IS NOT OLD.id OR NEW.cycle_id IS NOT OLD.cycle_id OR NEW.program_version_id IS NOT OLD.program_version_id OR NEW.cycle_week IS NOT OLD.cycle_week OR NEW.workout_id IS NOT OLD.workout_id OR NEW.previous_revision_id IS NOT OLD.previous_revision_id OR NEW.from_date IS NOT OLD.from_date OR NEW.to_date IS NOT OLD.to_date OR NEW.time_zone IS NOT OLD.time_zone OR NEW.recorded_at IS NOT OLD.recorded_at OR NEW.effective_date IS NOT OLD.effective_date BEGIN SELECT RAISE(ABORT,'Schedule revisions are append-only.'); END;`,
    ],
  },
  {
    version: 27,
    name: 'manual-dated-coach-review-intents',
    statements: [
      `CREATE TABLE coach_review_journal (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, cycle_id TEXT NOT NULL, program_version_id TEXT NOT NULL, previous_review_id TEXT, confirmed_at TEXT NOT NULL, receipt_json TEXT NOT NULL CHECK(json_valid(receipt_json)), UNIQUE(id,user_id,cycle_id), FOREIGN KEY(user_id) REFERENCES user_profiles(id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(cycle_id) REFERENCES training_cycles(id) ON DELETE CASCADE, FOREIGN KEY(previous_review_id,user_id,cycle_id) REFERENCES coach_review_journal(id,user_id,cycle_id) ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED);`,
      `CREATE UNIQUE INDEX coach_review_root_once ON coach_review_journal(cycle_id) WHERE previous_review_id IS NULL;`,
      `CREATE UNIQUE INDEX coach_review_child_once ON coach_review_journal(previous_review_id) WHERE previous_review_id IS NOT NULL;`,
      `CREATE TRIGGER coach_review_owned_insert BEFORE INSERT ON coach_review_journal WHEN NOT EXISTS(SELECT 1 FROM training_cycles c WHERE c.id=NEW.cycle_id AND c.user_id=NEW.user_id AND (c.program_version_id=NEW.program_version_id OR EXISTS(SELECT 1 FROM user_program_versions v JOIN user_programs p ON p.id=v.program_id WHERE v.id=NEW.program_version_id AND p.user_id=NEW.user_id))) BEGIN SELECT RAISE(ABORT,'Review must belong to its owned cycle and version.'); END;`,
      `CREATE TRIGGER coach_review_owned_update BEFORE UPDATE ON coach_review_journal WHEN NOT EXISTS(SELECT 1 FROM training_cycles WHERE id=NEW.cycle_id AND user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Review ownership changed.'); END;`,
      `CREATE TRIGGER coach_review_immutable BEFORE UPDATE ON coach_review_journal WHEN NEW.id IS NOT OLD.id OR NEW.cycle_id IS NOT OLD.cycle_id OR NEW.program_version_id IS NOT OLD.program_version_id OR NEW.previous_review_id IS NOT OLD.previous_review_id OR NEW.confirmed_at IS NOT OLD.confirmed_at OR (NEW.receipt_json IS NOT OLD.receipt_json AND NOT (json_extract(NEW.receipt_json,'$.ownerId') IS NEW.user_id AND json_extract(json_extract(NEW.receipt_json,'$.evidenceFingerprint'),'$.ownerId') IS NEW.user_id AND json_extract(json_extract(NEW.receipt_json,'$.evidenceFingerprint'),'$.cycle.userId') IS NEW.user_id AND (json_extract(json_extract(NEW.receipt_json,'$.evidenceFingerprint'),'$.goal') IS NULL OR json_extract(json_extract(NEW.receipt_json,'$.evidenceFingerprint'),'$.goal.userId') IS NEW.user_id) AND json_remove(NEW.receipt_json,'$.ownerId','$.evidenceFingerprint') IS json_remove(OLD.receipt_json,'$.ownerId','$.evidenceFingerprint') AND json_remove(json_extract(NEW.receipt_json,'$.evidenceFingerprint'),'$.ownerId','$.cycle.userId','$.goal.userId') IS json_remove(json_extract(OLD.receipt_json,'$.evidenceFingerprint'),'$.ownerId','$.cycle.userId','$.goal.userId'))) BEGIN SELECT RAISE(ABORT,'Dated review receipts are append-only.'); END;`,
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
