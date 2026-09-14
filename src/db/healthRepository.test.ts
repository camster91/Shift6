import type { SQLiteDatabase } from 'expo-sqlite';

import { getDailyHealthTrends, getHealthSummaries, saveHealthSummaries } from './healthRepository';

const samples = [
  {
    id: 'steps-1',
    type: 'steps' as const,
    value: 1000,
    unit: 'count',
    startAt: '2026-09-01T08:00:00.000Z',
    endAt: '2026-09-01T09:00:00.000Z',
    source: 'Apple Health',
  },
  {
    id: 'steps-1',
    type: 'steps' as const,
    value: 1100,
    unit: 'count',
    startAt: '2026-09-01T08:00:00.000Z',
    endAt: '2026-09-01T09:00:00.000Z',
    source: 'Apple Health',
  },
];

describe('local health summary repository', () => {
  it('normalizes before persistence and never queues health data for sync', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(saveHealthSummaries(database, 'guest-user', samples)).resolves.toEqual([
      {
        id: 'steps-1',
        type: 'steps',
        value: 1000,
        unit: 'count',
        startAt: '2026-09-01T08:00:00.000Z',
        endAt: '2026-09-01T09:00:00.000Z',
        source: 'Apple Health',
      },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.sql).toContain('INSERT INTO health_summaries');
    expect(calls[0]?.sql).not.toContain('sync_outbox');
  });

  it('reads user-scoped rows and derives daily trends through the domain boundary', async () => {
    const database = {
      getAllAsync: async () => [
        {
          user_id: 'guest-user',
          source: 'Apple Health',
          id: 'steps-1',
          health_type: 'steps',
          value: 2000,
          unit: 'count',
          start_at: '2026-09-01T08:00:00.000Z',
          end_at: '2026-09-01T09:00:00.000Z',
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(
      getHealthSummaries(database, 'guest-user', {
        types: ['steps'],
        range: {
          startAt: '2026-09-01T00:00:00.000Z',
          endAt: '2026-09-02T00:00:00.000Z',
        },
      }),
    ).resolves.toMatchObject([{ id: 'steps-1', type: 'steps', value: 2000 }]);
    await expect(getDailyHealthTrends(database, 'guest-user')).resolves.toEqual([
      {
        day: '2026-09-01',
        type: 'steps',
        value: 2000,
        unit: 'count',
        sampleCount: 1,
        sourceCount: 1,
      },
    ]);
  });

  it('returns no rows when the caller explicitly requests no data types', async () => {
    const database = {
      getAllAsync: jest.fn(),
    } as unknown as SQLiteDatabase;

    await expect(getHealthSummaries(database, 'guest-user', { types: [] })).resolves.toEqual([]);
    expect(database.getAllAsync).not.toHaveBeenCalled();
  });
});
