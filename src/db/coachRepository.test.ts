import type { SQLiteDatabase } from 'expo-sqlite';

import { demoCoachProposal } from '../domain/fixtures/home';
import {
  getPendingCoachProposals,
  saveCoachProposal,
  updateCoachProposalStatus,
} from './coachRepository';

const pendingRow = {
  id: demoCoachProposal.id,
  user_id: 'guest-user',
  cycle_id: 'cycle-1',
  summary: demoCoachProposal.summary,
  confidence: demoCoachProposal.confidence,
  evidence_json: JSON.stringify(demoCoachProposal.evidence),
  changes_json: JSON.stringify(demoCoachProposal.changes),
  safety_notes_json: JSON.stringify(demoCoachProposal.safetyNotes),
  status: 'pending' as const,
  created_at: demoCoachProposal.createdAt,
  updated_at: demoCoachProposal.createdAt,
};

describe('saveCoachProposal', () => {
  it('persists a validated proposal with user and cycle scope', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
    } as unknown as SQLiteDatabase;

    await saveCoachProposal(database, 'guest-user', 'cycle-1', demoCoachProposal);

    expect(calls[0]?.sql).toContain('INSERT OR IGNORE INTO coach_proposals');
    expect(calls[0]?.params.slice(0, 3)).toEqual([demoCoachProposal.id, 'guest-user', 'cycle-1']);
  });

  it('rejects malformed proposals before touching the database', async () => {
    const database = {
      runAsync: async () => {
        throw new Error('database should not be called');
      },
    } as unknown as SQLiteDatabase;

    await expect(
      saveCoachProposal(database, 'guest-user', 'cycle-1', {
        ...demoCoachProposal,
        summary: '',
      }),
    ).rejects.toThrow('Proposal summary is required.');
  });
});

describe('getPendingCoachProposals', () => {
  it('maps JSON fields back to a typed pending proposal', async () => {
    const database = {
      getAllAsync: async () => [pendingRow],
    } as unknown as SQLiteDatabase;

    await expect(getPendingCoachProposals(database, 'guest-user', 'cycle-1')).resolves.toEqual([
      demoCoachProposal,
    ]);
  });
});

describe('updateCoachProposalStatus', () => {
  it('updates status and queues the latest proposal snapshot atomically', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        ...pendingRow,
        status: 'accepted',
        updated_at: '2026-09-14T12:00:00.000Z',
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => {
        await callback();
      },
    } as unknown as SQLiteDatabase;

    await expect(
      updateCoachProposalStatus(
        database,
        demoCoachProposal.id,
        'accepted',
        '2026-09-14T12:00:00.000Z',
      ),
    ).resolves.toBe('updated');

    expect(calls[0]?.sql).toContain("status = 'pending'");
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(calls[1]?.params[2]).toBe('coach-proposal');
    expect(JSON.parse(String(calls[1]?.params[4]))).toMatchObject({
      userId: 'guest-user',
      cycleId: 'cycle-1',
      proposal: { status: 'accepted' },
    });
  });
});
