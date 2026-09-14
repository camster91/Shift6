import { MIGRATIONS } from './migrations';

describe('local database migrations', () => {
  it('has unique, ascending migration versions', () => {
    const versions = MIGRATIONS.map((migration) => migration.version);

    expect(versions).toEqual([...versions].sort((left, right) => left - right));
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('defines an idempotent completed-set and outbox boundary', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS completed_sets');
    expect(statements).toContain('idempotency_key TEXT NOT NULL UNIQUE');
    expect(statements).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS completed_sets_session_exercise_set',
    );
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS sync_outbox');
  });

  it('adds a durable onboarding profile and equipment boundary', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS user_profiles');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS user_equipment');
    expect(statements).toContain('FOREIGN KEY (user_id) REFERENCES user_profiles(id)');
    expect(statements).toContain('health_connection TEXT NOT NULL');
  });

  it('adds a versioned training-cycle snapshot table', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS training_cycles');
    expect(statements).toContain('weeks_json TEXT NOT NULL');
    expect(statements).toContain('training_cycles_user_status_started');
  });

  it('preserves workout focus for trustworthy progress aggregation', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('ADD COLUMN workout_focus TEXT NOT NULL DEFAULT');
  });

  it('adds versioned user program and custom exercise snapshot tables', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS user_programs');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS user_program_versions');
    expect(statements).toContain('UNIQUE(program_id, version)');
    expect(statements).toContain('CREATE TABLE IF NOT EXISTS user_exercises');
  });

  it('snapshots the cycle week on each workout session', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('ADD COLUMN cycle_week INTEGER NOT NULL DEFAULT 1');
  });

  it('stores scoped coach proposals for offline review', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS coach_proposals');
    expect(statements).toContain('user_id TEXT NOT NULL');
    expect(statements).toContain('cycle_id TEXT NOT NULL');
    expect(statements).toContain('CREATE INDEX IF NOT EXISTS coach_proposals_user_cycle_status');
  });

  it('stores unfinished workout input locally for pause and resume', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS workout_drafts');
    expect(statements).toContain('FOREIGN KEY (session_id) REFERENCES workout_sessions(id)');
  });

  it('stores structured post-workout check-ins without requiring a network', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS workout_check_ins');
    expect(statements).toContain('discomfort_reported INTEGER NOT NULL');
  });

  it('keeps the canonical exercise identity on completed sets for progress history', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('ADD COLUMN exercise_id TEXT');
  });

  it('stores optional workout readiness context on the local session', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('ADD COLUMN readiness TEXT');
  });

  it('stores normalized, user-scoped health summaries locally', () => {
    const statements = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

    expect(statements).toContain('CREATE TABLE IF NOT EXISTS health_summaries');
    expect(statements).toContain('PRIMARY KEY (user_id, source, id)');
    expect(statements).toContain('CREATE INDEX IF NOT EXISTS health_summaries_user_type_start');
    expect(statements).toContain('ON DELETE CASCADE');
  });
});
