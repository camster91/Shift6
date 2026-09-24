import type { SQLiteDatabase } from 'expo-sqlite';

import { getCycleReview, saveCycleReview } from './cycleReviewRepository';

describe('cycle review reflections', () => {
  it('upserts a user reflection and queues one replaceable sync mutation atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await saveCycleReview(database, {
      id: 'review-cycle-1',
      userId: 'guest-user',
      cycleId: 'cycle-1',
      overallRating: 4,
      focus: 'more-strength',
      nextAction: 'repeat',
      note: 'The plan felt repeatable.',
      createdAt: '2026-09-14T12:00:00.000Z',
      updatedAt: '2026-09-14T12:01:00.000Z',
    });

    expect(calls[0]?.sql).toContain('INSERT INTO cycle_reviews');
    expect(calls[0]?.sql).toContain('ON CONFLICT(cycle_id) DO UPDATE');
    expect(calls[1]?.sql).toContain('ON CONFLICT(idempotency_key) DO UPDATE');
    expect(calls[1]?.params).toContain('cycle-review:review-cycle-1');
  });

  it('maps invalid persisted rating and focus values to missing feedback', async () => {
    const database = {
      getFirstAsync: async () => ({
        id: 'review-cycle-1',
        user_id: 'guest-user',
        cycle_id: 'cycle-1',
        overall_rating: 8,
        focus: 'untrusted-value',
        next_action: 'untrusted-action',
        note: null,
        created_at: '2026-09-14T12:00:00.000Z',
        updated_at: '2026-09-14T12:00:00.000Z',
      }),
    } as unknown as SQLiteDatabase;

    await expect(getCycleReview(database, 'guest-user', 'cycle-1')).resolves.toMatchObject({
      id: 'review-cycle-1',
      overallRating: undefined,
      focus: undefined,
      nextAction: undefined,
    });
  });

  it('rejects oversized free-text notes before touching the database', async () => {
    const database = {
      withTransactionAsync: async () => {
        throw new Error('transaction should not start');
      },
    } as unknown as SQLiteDatabase;

    await expect(
      saveCycleReview(database, {
        id: 'review-cycle-1',
        userId: 'guest-user',
        cycleId: 'cycle-1',
        note: 'x'.repeat(2_001),
        createdAt: '2026-09-14T12:00:00.000Z',
        updatedAt: '2026-09-14T12:00:00.000Z',
      }),
    ).rejects.toThrow('2,000 characters');
  });
});
