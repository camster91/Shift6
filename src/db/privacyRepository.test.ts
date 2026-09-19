import type { SQLiteDatabase } from 'expo-sqlite';

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
      schemaVersion: 9,
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
    expect(summary.sections.find((section) => section.key === 'trainingHistory')?.recordCount).toBe(2);
    expect(JSON.stringify(summary)).not.toContain('set-1');
  });

describe('deleteLocalUserData', () => {
  it('clears dependent records and sync mutations in one transaction', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => {
        await callback();
      },
    } as unknown as SQLiteDatabase;

    await expect(deleteLocalUserData(database, 'guest-user')).resolves.toBeUndefined();

    expect(calls).toHaveLength(19);
    expect(calls[0]?.sql).toContain('DELETE FROM sync_outbox');
    expect(calls[0]?.params.every((param) => param === 'guest-user')).toBe(true);
    expect(calls[1]?.sql).toContain('DELETE FROM notification_preferences');
    expect(calls[2]?.sql).toContain('DELETE FROM health_summaries');
    expect(calls[3]?.sql).toContain('DELETE FROM user_considerations');
    expect(calls[4]?.sql).toContain('DELETE FROM body_metrics');
    expect(calls[5]?.sql).toContain('DELETE FROM coach_privacy_preferences');
    expect(calls[6]?.sql).toContain('DELETE FROM cycle_reviews');
    expect(calls[7]?.sql).toContain('DELETE FROM workout_schedule_overrides');
    expect(calls[8]?.sql).toContain('DELETE FROM completed_sets');
    expect(calls[9]?.sql).toContain('DELETE FROM workout_drafts');
    expect(calls[10]?.sql).toContain('DELETE FROM workout_check_ins');
    expect(calls.at(-1)?.sql).toContain('DELETE FROM user_profiles');
  });
});
