import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { MIGRATIONS } from './migrations';

import {
  buildLocalDataExportSummary,
  deleteLocalUserData,
  exportLocalUserData,
} from './privacyRepository';

describe('exportLocalUserData', () => {
  it('returns user-scoped local records with a versioned export envelope', async () => {
    const database = {
      getAllAsync: async (sql: string) => {
        if (sql.includes('user_profiles')) return [{ id: 'guest-user', display_name: 'Cameron' }];
        if (sql.includes('user_equipment'))
          return [{ user_id: 'guest-user', equipment_id: 'barbell' }];
        if (sql.includes('user_considerations'))
          return [
            {
              user_id: 'guest-user',
              movement_considerations_json: '["avoid-impact"]',
              accessibility_needs_json: '["larger-text"]',
            },
          ];
        if (sql.includes('body_metrics'))
          return [{ id: 'metric-1', user_id: 'guest-user', metric_type: 'weight', value: 90 }];
        if (sql.includes('coach_privacy_preferences'))
          return [
            {
              user_id: 'guest-user',
              provider_coach_enabled: 1,
              notice_version: 1,
            },
          ];
        if (sql.includes('shift_protocols')) return [];
        if (sql.includes('shift_observations')) return [];
        if (sql.includes('shift_goal_revisions')) return [];
        if (sql.includes('shifts')) return [];
        if (sql.includes('workout_drafts')) return [];
        if (sql.includes('workout_check_ins')) return [];
        if (sql.includes('completed_sets')) return [{ id: 'set-1', session_id: 'session-1' }];
        if (sql.includes('workout_sessions')) return [{ id: 'session-1', cycle_id: 'cycle-1' }];
        if (sql.includes('training_cycles')) return [{ id: 'cycle-1', user_id: 'guest-user' }];
        if (sql.includes('user_program_versions'))
          return [{ id: 'version-1', program_id: 'program-1' }];
        if (sql.includes('user_programs')) return [{ id: 'program-1', user_id: 'guest-user' }];
        if (sql.includes('user_exercises')) return [{ id: 'exercise-1', user_id: 'guest-user' }];
        if (sql.includes('health_summaries')) return [{ id: 'health-1', user_id: 'guest-user' }];
        if (sql.includes('notification_preferences')) return [];
        if (sql.includes('cycle_reviews')) return [];
        if (sql.includes('workout_schedule_overrides')) return [];
        return [{ id: 'proposal-1', user_id: 'guest-user' }];
      },
    } as unknown as SQLiteDatabase;

    await expect(
      exportLocalUserData(database, 'guest-user', '2026-09-14T12:00:00.000Z'),
    ).resolves.toEqual({
      schemaVersion: 10,
      exportedAt: '2026-09-14T12:00:00.000Z',
      userId: 'guest-user',
      summary: {
        scope: 'local-device',
        title: 'SHIFT6 local data export',
        description:
          'A structured JSON copy of SHIFT6 data owned by this user and currently stored on this device.',
        limitations:
          'This is a local-device export. It does not claim to include server-only account data or third-party provider records that are not cached in SHIFT6 local storage.',
        totalRecordCount: 13,
        sections: [
          {
            key: 'profile',
            title: 'Profile and equipment',
            description: 'Your local profile answers and saved equipment inventory.',
            recordCount: 2,
          },
          {
            key: 'preferences',
            title: 'Preferences and accessibility',
            description:
              'Local movement/accessibility preferences and Coach provider privacy preference.',
            recordCount: 2,
          },
          {
            key: 'bodyAndHealth',
            title: 'Body metrics and health summaries',
            description: 'Manual body measurements and health summaries imported onto this device.',
            recordCount: 2,
          },
          {
            key: 'shiftsAndMeasurements',
            title: 'Shifts and measurements',
            description:
              'Shift goals, measurement protocols, recorded results, and goal revisions stored on this device.',
            recordCount: 0,
          },
          {
            key: 'trainingHistory',
            title: 'Training history',
            description:
              'Cycles, workout sessions, completed sets, in-progress drafts, check-ins, cycle reviews, and schedule overrides.',
            recordCount: 3,
          },
          {
            key: 'programsAndExercises',
            title: 'Your programs and exercises',
            description: 'Private program copies, program versions, and custom exercise records.',
            recordCount: 3,
          },
          {
            key: 'coachAndNotifications',
            title: 'Coach and notification records',
            description: 'Saved Coach proposals and local notification preferences.',
            recordCount: 1,
          },
        ],
      },
      userProfiles: [{ id: 'guest-user', display_name: 'Cameron' }],
      userEquipment: [{ user_id: 'guest-user', equipment_id: 'barbell' }],
      userConsiderations: [
        {
          user_id: 'guest-user',
          movement_considerations_json: '["avoid-impact"]',
          accessibility_needs_json: '["larger-text"]',
        },
      ],
      bodyMetrics: [{ id: 'metric-1', user_id: 'guest-user', metric_type: 'weight', value: 90 }],
      coachPrivacyPreferences: [
        {
          user_id: 'guest-user',
          provider_coach_enabled: 1,
          notice_version: 1,
        },
      ],
      trainingCycles: [{ id: 'cycle-1', user_id: 'guest-user' }],
      shifts: [],
      shiftProtocols: [],
      shiftObservations: [],
      shiftGoalRevisions: [],
      workoutSessions: [{ id: 'session-1', cycle_id: 'cycle-1' }],
      completedSets: [{ id: 'set-1', session_id: 'session-1' }],
      workoutDrafts: [],
      workoutCheckIns: [],
      userPrograms: [{ id: 'program-1', user_id: 'guest-user' }],
      userProgramVersions: [{ id: 'version-1', program_id: 'program-1' }],
      userExercises: [{ id: 'exercise-1', user_id: 'guest-user' }],
      coachProposals: [{ id: 'proposal-1', user_id: 'guest-user' }],
      healthSummaries: [{ id: 'health-1', user_id: 'guest-user' }],
      notificationPreferences: [],
      cycleReviews: [],
      workoutScheduleOverrides: [],
    });
  });
});

describe('buildLocalDataExportSummary', () => {
  it('makes export scope and section counts understandable without exposing record values', () => {
    const summary = buildLocalDataExportSummary({
      userProfiles: [{ id: 'user-1' }],
      userEquipment: [],
      userConsiderations: [],
      bodyMetrics: [],
      coachPrivacyPreferences: [],
      trainingCycles: [],
      shifts: [],
      shiftProtocols: [],
      shiftObservations: [],
      shiftGoalRevisions: [],
      workoutSessions: [],
      completedSets: [{ id: 'set-1' }, { id: 'set-2' }],
      workoutDrafts: [],
      workoutCheckIns: [],
      userPrograms: [],
      userProgramVersions: [],
      userExercises: [],
      coachProposals: [],
      healthSummaries: [],
      notificationPreferences: [],
      cycleReviews: [],
      workoutScheduleOverrides: [],
    });

    expect(summary.scope).toBe('local-device');
    expect(summary.totalRecordCount).toBe(3);
    expect(summary.limitations).toContain('server-only');
    expect(summary.sections.find((section) => section.key === 'trainingHistory')?.recordCount).toBe(
      2,
    );
    expect(JSON.stringify(summary)).not.toContain('set-1');
  });
});

describe('deleteLocalUserData', () => {
  it('fails before deleting records when a future Shift child mutation cannot be attributed safely', async () => {
    const runAsync = jest.fn();
    const database = {
      getFirstAsync: async () => ({ id: 'future-child' }),
      runAsync,
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(deleteLocalUserData(database, 'owner-1')).rejects.toThrow(
      'Shift sync records require a compatible build',
    );
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('clears dependent records and sync mutations in one transaction', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      getFirstAsync: async () => null,
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => {
        await callback();
      },
    } as unknown as SQLiteDatabase;

    await expect(deleteLocalUserData(database, 'guest-user')).resolves.toBeUndefined();

    expect(calls).toHaveLength(23);
    expect(calls[0]?.sql).toContain('DELETE FROM sync_outbox');
    expect(calls[0]?.params.every((param) => param === 'guest-user')).toBe(true);
    expect(calls[1]?.sql).toContain('DELETE FROM notification_preferences');
    expect(calls[2]?.sql).toContain('DELETE FROM health_summaries');
    expect(calls[3]?.sql).toContain('DELETE FROM user_considerations');
    expect(calls[4]?.sql).toContain('DELETE FROM body_metrics');
    expect(calls[5]?.sql).toContain('DELETE FROM coach_privacy_preferences');
    expect(calls[6]?.sql).toContain('DELETE FROM cycle_reviews');
    expect(calls[7]?.sql).toContain('DELETE FROM workout_schedule_overrides');
    expect(calls[8]?.sql).toContain('DELETE FROM shift_observations');
    expect(calls[9]?.sql).toContain('DELETE FROM shift_goal_revisions');
    expect(calls[10]?.sql).toContain('DELETE FROM shift_protocols');
    expect(calls[11]?.sql).toContain('DELETE FROM shifts');
    expect(calls[12]?.sql).toContain('DELETE FROM completed_sets');
    expect(calls[13]?.sql).toContain('DELETE FROM workout_drafts');
    expect(calls[14]?.sql).toContain('DELETE FROM workout_check_ins');
    expect(calls.at(-1)?.sql).toContain('DELETE FROM user_profiles');
  });

  it('exports and deletes one owner’s Shift history while preserving another owner and foreign keys', async () => {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec('PRAGMA foreign_keys = ON;');
    const database = {
      getFirstAsync: async (sql: string, ...params: unknown[]) =>
        sqlite.prepare(sql).get(...(params as SQLInputValue[])) ?? null,
      getAllAsync: async (sql: string, ...params: unknown[]) =>
        sqlite.prepare(sql).all(...(params as SQLInputValue[])),
      runAsync: async (sql: string, ...params: unknown[]) => {
        const result = sqlite.prepare(sql).run(...(params as SQLInputValue[]));
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      },
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

    try {
      for (const migration of MIGRATIONS) {
        for (const statement of migration.statements) sqlite.exec(statement);
      }
      for (const owner of ['owner-1', 'owner-2']) {
        sqlite
          .prepare(
            `INSERT INTO user_profiles
              (id, display_name, unit_system, goals_json, experience, training_days_per_week,
               preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
               health_connection, completed_at, created_at, updated_at)
             VALUES (?, ?, 'metric', '[]', 'beginner', 3, 30, 'morning', 'supportive',
                     'balanced', 'not-now', '2026-09-01', '2026-09-01', '2026-09-01');`,
          )
          .run(owner, owner);
        sqlite
          .prepare(
            `INSERT INTO training_cycles
              (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
             VALUES (?, ?, 'version-1', 'active', 1, '2026-09-01', '[]');`,
          )
          .run(`cycle-${owner}`, owner);
        sqlite
          .prepare(
            `INSERT INTO shifts
              (id, user_id, cycle_id, program_version_id, template_id, template_version,
               block_objective, active_protocol_id, active_protocol_version, target_json,
               baseline_state, review_state, next_choice, is_primary, created_at)
             VALUES (?, ?, ?, 'version-1', 'draft-reps', 1, 'Rep goal', 'reps', 1,
                     '10', 'missing', 'missing', 'undecided', 1, '2026-09-01');`,
          )
          .run(`shift-${owner}`, owner, `cycle-${owner}`);
        sqlite
          .prepare(
            `INSERT INTO shift_protocols
              (shift_id, user_id, protocol_id, protocol_version, snapshot_json, created_at)
             VALUES (?, ?, 'reps', 1, '{}', '2026-09-01');`,
          )
          .run(`shift-${owner}`, owner);
        sqlite
          .prepare(
            `INSERT INTO shift_observations
              (id, shift_id, user_id, protocol_id, protocol_version, measured_at,
               recorded_at, source, value_json, unit)
             VALUES (?, ?, ?, 'reps', 1, '2026-09-01', '2026-09-01', 'assessment', '5', 'reps');`,
          )
          .run(`observation-${owner}`, `shift-${owner}`, owner);
        sqlite
          .prepare(
            `INSERT INTO shift_goal_revisions
              (id, shift_id, user_id, protocol_id, protocol_version, target_json,
               block_objective, reason, recorded_at)
             VALUES (?, ?, ?, 'reps', 1, '10', 'Rep goal', 'initial', '2026-09-01');`,
          )
          .run(`revision-${owner}`, `shift-${owner}`, owner);
        sqlite
          .prepare(
            `INSERT INTO sync_outbox
              (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
             VALUES (?, ?, 'shift', ?, '{}', '2026-09-01');`,
          )
          .run(`outbox-${owner}`, `key-${owner}`, `shift-${owner}`);
      }

      const exportData = await exportLocalUserData(database, 'owner-1', '2026-09-24');
      expect(exportData.schemaVersion).toBe(10);
      expect(exportData.shifts.map((row) => row.id)).toEqual(['shift-owner-1']);
      expect(exportData.shiftProtocols.map((row) => row.shift_id)).toEqual(['shift-owner-1']);
      expect(exportData.shiftObservations.map((row) => row.id)).toEqual(['observation-owner-1']);
      expect(exportData.shiftGoalRevisions.map((row) => row.id)).toEqual(['revision-owner-1']);
      expect(
        exportData.summary.sections.find((section) => section.key === 'shiftsAndMeasurements')
          ?.recordCount,
      ).toBe(4);

      await deleteLocalUserData(database, 'owner-1');
      for (const table of [
        'user_profiles',
        'training_cycles',
        'shifts',
        'shift_protocols',
        'shift_observations',
        'shift_goal_revisions',
      ]) {
        expect(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table};`).get()).toMatchObject({
          count: 1,
        });
      }
      expect(sqlite.prepare('SELECT entity_id FROM sync_outbox;').all()).toEqual([
        { entity_id: 'shift-owner-2' },
      ]);
      expect(sqlite.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
