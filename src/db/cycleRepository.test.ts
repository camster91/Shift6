import type { SQLiteDatabase } from 'expo-sqlite';

import { demoCycle } from '../domain/fixtures/home';
import { saveTrainingCycle } from './cycleRepository';

function fakeDatabase() {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const database = {
    runAsync: async (sql: string, ...params: unknown[]) => {
      calls.push({ sql, params });
      return { changes: 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push({ sql: 'BEGIN TRANSACTION', params: [] });
      await callback();
      calls.push({ sql: 'COMMIT TRANSACTION', params: [] });
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

describe('saveTrainingCycle', () => {
  it('pauses a previous active cycle and stores the new snapshot atomically', async () => {
    const { database, calls } = fakeDatabase();

    await expect(saveTrainingCycle(database, demoCycle)).resolves.toBeUndefined();

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls[1]?.sql).toContain("SET status = 'paused'");
    expect(calls[2]?.sql).toContain('INSERT INTO training_cycles');
    expect(calls[2]?.params).toContain(JSON.stringify(demoCycle.weeks));
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });
});
