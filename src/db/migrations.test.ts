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
});
