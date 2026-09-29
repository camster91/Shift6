import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { Shift, ShiftObservation } from '../domain/shift';
import { MIGRATIONS } from './migrations';
import { appendShiftObservation, createShift } from './shiftRepository';

function databaseFixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) {
    for (const statement of migration.statements) sqlite.exec(statement);
  }
  const database = {
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = sqlite.prepare(sql).run(...(params as SQLInputValue[]));
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    getFirstAsync: async (sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).get(...(params as SQLInputValue[])) ?? null,
    getAllAsync: async (sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).all(...(params as SQLInputValue[])),
    withTransactionAsync: async (callback: () => Promise<void>) => {
      sqlite.exec('BEGIN TRANSACTION;');
      try {
        await callback();
        sqlite.exec('COMMIT TRANSACTION;');
      } catch (error) {
        sqlite.exec('ROLLBACK TRANSACTION;');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;

  sqlite
    .prepare(
      `INSERT INTO user_profiles
        (id, display_name, unit_system, goals_json, experience, training_days_per_week,
         preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
         health_connection, completed_at, created_at, updated_at)
       VALUES ('user-1', 'User', 'metric', '[]', 'beginner', 3, 30, 'morning',
               'supportive', 'balanced', 'not-now', '2026-09-01', '2026-09-01', '2026-09-01');`,
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO training_cycles
        (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
       VALUES ('cycle-1', 'user-1', 'program-v1', 'active', 1, '2026-09-01', '[]');`,
    )
    .run();

  return { sqlite, database };
}

const shift: Shift = {
  id: 'shift-1',
  userId: 'user-1',
  cycleId: 'cycle-1',
  programVersionId: 'program-v1',
  templateId: 'pilot-reps',
  blockObjective: 'Complete 10 strict reps.',
  protocol: {
    id: 'strict-reps',
    version: 1,
    metric: 'reps',
    canonicalUnit: 'reps',
    direction: 'higher',
    exerciseId: 'push-up',
    variantId: 'strict',
    assistance: 'none',
    equipmentSetup: 'floor',
  },
  target: 10,
  baseline: { state: 'measured', observationId: 'obs-baseline' },
  reviewState: 'missing',
  nextChoice: 'undecided',
};

const baseline: ShiftObservation = {
  id: 'obs-baseline',
  shiftId: 'shift-1',
  protocolId: 'strict-reps',
  protocolVersion: 1,
  measuredAt: '2026-09-01T12:00:00.000Z',
  source: 'assessment',
  value: 4,
  unit: 'reps',
};

describe('shiftRepository', () => {
  it(
    'creates a measured Shift, protocol, baseline, revision and v2 sync records atomically',
    async () => {
    const { sqlite, database } = databaseFixture();
    try {
      await createShift(database, shift, {
        templateVersion: 1,
        createdAt: '2026-09-01T12:05:00.000Z',
        baselineObservation: baseline,
      });

      expect(
        sqlite.prepare('SELECT baseline_state, baseline_observation_id FROM shifts;').get(),
      ).toEqual({
        baseline_state: 'measured',
        baseline_observation_id: 'obs-baseline',
      });
      expect(sqlite.prepare('SELECT value_json, unit FROM shift_observations;').get()).toEqual({
        value_json: '4',
        unit: 'reps',
      });
      expect(
        sqlite.prepare('SELECT entity_type FROM sync_outbox ORDER BY entity_type;').all(),
      ).toEqual([
        { entity_type: 'shift' },
        { entity_type: 'shift-goal-revision' },
        { entity_type: 'shift-observation' },
        { entity_type: 'shift-protocol' },
      ]);
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    },
  );

  it(
    'is idempotent for an identical observation and rejects conflicting reuse of the ID',
    async () => {
    const { sqlite, database } = databaseFixture();
    try {
      await createShift(database, shift, {
        templateVersion: 1,
        createdAt: '2026-09-01T12:05:00.000Z',
        baselineObservation: baseline,
      });
      const next: ShiftObservation = {
        ...baseline,
        id: 'obs-week-3',
        measuredAt: '2026-09-15T12:00:00.000Z',
        value: 7,
      };
      await appendShiftObservation(database, shift.id, next, {
        recordedAt: '2026-09-15T12:01:00.000Z',
      });
      await appendShiftObservation(database, shift.id, next, {
        recordedAt: '2026-09-15T12:01:00.000Z',
      });

      expect(
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM shift_observations WHERE id = 'obs-week-3';")
          .get(),
      ).toEqual({ count: 1 });
      expect(
        sqlite
          .prepare("SELECT COUNT(*) AS count FROM sync_outbox WHERE entity_id = 'obs-week-3';")
          .get(),
      ).toEqual({ count: 1 });

      await expect(
        appendShiftObservation(database, shift.id, { ...next, value: 8 }, {
          recordedAt: '2026-09-15T12:01:00.000Z',
        }),
      ).rejects.toThrow('different contents');
    } finally {
      sqlite.close();
    },
  );

  it(
    'keeps corrections append-only and prevents competing corrections for one measurement',
    async () => {
    const { sqlite, database } = databaseFixture();
    try {
      await createShift(database, shift, {
        templateVersion: 1,
        createdAt: '2026-09-01T12:05:00.000Z',
        baselineObservation: baseline,
      });
      const correction: ShiftObservation = {
        ...baseline,
        id: 'obs-baseline-correction',
        value: 5,
        correctsObservationId: baseline.id,
      };
      await appendShiftObservation(database, shift.id, correction, {
        recordedAt: '2026-09-02T12:00:00.000Z',
      });

      expect(
        sqlite
          .prepare('SELECT id, corrects_observation_id FROM shift_observations ORDER BY id;')
          .all(),
      ).toEqual([
        { id: 'obs-baseline', corrects_observation_id: null },
        { id: 'obs-baseline-correction', corrects_observation_id: 'obs-baseline' },
      ]);

      await expect(
        appendShiftObservation(
          database,
          shift.id,
          { ...correction, id: 'obs-second-correction', value: 6 },
          { recordedAt: '2026-09-03T12:00:00.000Z' },
        ),
      ).rejects.toThrow('already has a different correction');
    } finally {
      sqlite.close();
    }
    },
  );

  it('rolls the whole create transaction back when baseline evidence is invalid', async () => {
    const { sqlite, database } = databaseFixture();
    try {
      await expect(
        createShift(database, shift, {
          templateVersion: 1,
          createdAt: '2026-09-01T12:05:00.000Z',
          baselineObservation: { ...baseline, unit: 'kg' },
        }),
      ).rejects.toThrow('not valid for its measurement protocol');

      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM shifts;').get()).toEqual({
        count: 0,
      });
      expect(sqlite.prepare('SELECT COUNT(*) AS count FROM sync_outbox;').get()).toEqual({
        count: 0,
      });
    } finally {
      sqlite.close();
    }
  });
});
