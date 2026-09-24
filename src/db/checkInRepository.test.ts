import type { SQLiteDatabase } from 'expo-sqlite';

import { getWorkoutCheckIn, saveWorkoutCheckIn } from './checkInRepository';

describe('workout check-ins', () => {
  it('stores structured ratings and a sync mutation atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await saveWorkoutCheckIn(database, {
      sessionId: 'session-1',
      energy: 4,
      soreness: 2,
      perceivedExertion: 3,
      discomfortReported: false,
      note: 'Felt steady.',
      createdAt: '2026-09-14T12:00:00.000Z',
      updatedAt: '2026-09-14T12:01:00.000Z',
    });

    expect(calls[0]?.sql).toContain('INSERT INTO workout_check_ins');
    expect(calls[1]?.sql).toContain('ON CONFLICT(idempotency_key) DO UPDATE');
    expect(calls[1]?.params).toContain('workout-check-in');
  });

  it('maps invalid persisted ratings to missing values', async () => {
    const database = {
      getFirstAsync: async () => ({
        session_id: 'session-1',
        energy: 8,
        soreness: null,
        perceived_exertion: 3,
        discomfort_reported: 1,
        note: null,
        created_at: '2026-09-14T12:00:00.000Z',
        updated_at: '2026-09-14T12:00:00.000Z',
      }),
    } as unknown as SQLiteDatabase;

    await expect(getWorkoutCheckIn(database, 'session-1')).resolves.toMatchObject({
      sessionId: 'session-1',
      energy: undefined,
      soreness: undefined,
      perceivedExertion: 3,
      discomfortReported: true,
    });
  });
});
