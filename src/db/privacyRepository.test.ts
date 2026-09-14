import type { SQLiteDatabase } from 'expo-sqlite';

import { deleteLocalUserData, exportLocalUserData } from './privacyRepository';

describe('exportLocalUserData', () => {
  it('returns user-scoped local records with a versioned export envelope', async () => {
    const database = {
      getAllAsync: async (sql: string) => {
        if (sql.includes('user_profiles')) return [{ id: 'guest-user', display_name: 'Cameron' }];
        if (sql.includes('user_equipment'))
          return [{ user_id: 'guest-user', equipment_id: 'barbell' }];
        if (sql.includes('completed_sets')) return [{ id: 'set-1', session_id: 'session-1' }];
        if (sql.includes('workout_sessions')) return [{ id: 'session-1', cycle_id: 'cycle-1' }];
        if (sql.includes('training_cycles')) return [{ id: 'cycle-1', user_id: 'guest-user' }];
        if (sql.includes('user_program_versions'))
          return [{ id: 'version-1', program_id: 'program-1' }];
        if (sql.includes('user_programs')) return [{ id: 'program-1', user_id: 'guest-user' }];
        if (sql.includes('user_exercises')) return [{ id: 'exercise-1', user_id: 'guest-user' }];
        return [{ id: 'proposal-1', user_id: 'guest-user' }];
      },
    } as unknown as SQLiteDatabase;

    await expect(
      exportLocalUserData(database, 'guest-user', '2026-09-14T12:00:00.000Z'),
    ).resolves.toEqual({
      schemaVersion: 1,
      exportedAt: '2026-09-14T12:00:00.000Z',
      userId: 'guest-user',
      userProfiles: [{ id: 'guest-user', display_name: 'Cameron' }],
      userEquipment: [{ user_id: 'guest-user', equipment_id: 'barbell' }],
      trainingCycles: [{ id: 'cycle-1', user_id: 'guest-user' }],
      workoutSessions: [{ id: 'session-1', cycle_id: 'cycle-1' }],
      completedSets: [{ id: 'set-1', session_id: 'session-1' }],
      userPrograms: [{ id: 'program-1', user_id: 'guest-user' }],
      userProgramVersions: [{ id: 'version-1', program_id: 'program-1' }],
      userExercises: [{ id: 'exercise-1', user_id: 'guest-user' }],
      coachProposals: [{ id: 'proposal-1', user_id: 'guest-user' }],
    });
  });
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

    expect(calls).toHaveLength(11);
    expect(calls[0]?.sql).toContain('DELETE FROM sync_outbox');
    expect(calls[0]?.params.every((param) => param === 'guest-user')).toBe(true);
    expect(calls[1]?.sql).toContain('DELETE FROM completed_sets');
    expect(calls[2]?.sql).toContain('DELETE FROM workout_drafts');
    expect(calls.at(-1)?.sql).toContain('DELETE FROM user_profiles');
  });
});
