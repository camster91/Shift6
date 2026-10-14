import type { SQLiteDatabase } from 'expo-sqlite';

import {
  demoCoachProposal,
  demoCycle,
  demoProgram,
  demoProgramVersion,
} from '../domain/fixtures/home';
import type { CoachProposal } from '../domain/types';
import {
  acceptCoachProposalWithRevision,
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

describe('acceptCoachProposalWithRevision', () => {
  it('approves and persists a private revision in one transaction', async () => {
    const sourceWorkout = demoProgramVersion.workouts[0]!;
    const sourceExercise = sourceWorkout.exercises[0]!;
    const proposal: CoachProposal = {
      ...demoCoachProposal,
      id: 'coach-proposal-revision',
      changes: [
        {
          id: 'change-reps',
          type: 'target-change',
          workoutId: sourceWorkout.id,
          workoutExerciseId: sourceExercise.id,
          exerciseId: sourceExercise.exerciseId,
          field: 'reps',
          from: '8',
          to: '9',
          requiresUserConfirmation: true,
        },
      ],
    };
    const calls: string[] = [];
    let savedProgram = demoProgram;
    let savedVersion = demoProgramVersion;
    let savedCycle = demoCycle;
    let decision = 'pending';
    const database = {
      getAllAsync: async () => [],
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push(sql);
        if (sql.includes('UPDATE coach_proposals')) decision = 'accepted';
        if (sql.includes('INSERT INTO user_programs')) savedProgram = JSON.parse(String(params[3]));
        if (sql.includes('INSERT INTO user_program_versions'))
          savedVersion = JSON.parse(String(params[4]));
        if (sql.includes('INSERT INTO training_cycles'))
          savedCycle = {
            id: String(params[0]),
            userId: String(params[1]),
            programVersionId: String(params[2]),
            status: params[3] as typeof demoCycle.status,
            currentWeek: Number(params[4]),
            startedAt: String(params[5]),
            weeks: JSON.parse(String(params[6])),
          };
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async (sql: string) =>
        sql.includes('FROM user_program_versions v')
          ? null
          : sql.includes('FROM user_program_versions')
            ? {
                program_json: JSON.stringify(savedProgram),
                version_json: JSON.stringify(savedVersion),
              }
            : sql.includes('FROM training_cycles')
              ? {
                  id: savedCycle.id,
                  user_id: savedCycle.userId,
                  program_version_id: savedCycle.programVersionId,
                  status: savedCycle.status,
                  current_week: savedCycle.currentWeek,
                  started_at: savedCycle.startedAt,
                  weeks_json: JSON.stringify(savedCycle.weeks),
                }
              : {
                  ...pendingRow,
                  user_id: demoCycle.userId,
                  cycle_id: demoCycle.id,
                  id: proposal.id,
                  changes_json: JSON.stringify(proposal.changes),
                  status: decision,
                  updated_at: '2026-09-14T12:00:00.000Z',
                },
      withExclusiveTransactionAsync: async (callback: (tx: SQLiteDatabase) => Promise<void>) => {
        calls.push('BEGIN TRANSACTION');
        await callback(database as unknown as SQLiteDatabase);
        calls.push('COMMIT TRANSACTION');
      },
    } as unknown as SQLiteDatabase;

    const result = await acceptCoachProposalWithRevision(
      database,
      demoCycle.userId,
      proposal,
      demoProgram,
      demoProgramVersion,
      demoCycle,
      '2026-09-14T12:00:00.000Z',
    );

    expect(result.status).toBe('updated');
    expect(result.version.id).not.toBe(demoProgramVersion.id);
    expect(result.cycle.programVersionId).toBe(result.version.id);
    expect(calls[0]).toBe('BEGIN TRANSACTION');
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('UPDATE coach_proposals'),
        expect.stringContaining('INSERT INTO user_programs'),
        expect.stringContaining('INSERT INTO user_program_versions'),
        expect.stringContaining('INSERT INTO training_cycles'),
        expect.stringContaining('INSERT INTO sync_outbox'),
        'COMMIT TRANSACTION',
      ]),
    );
  });

  it('does not write again when the owner-scoped stored proposal was already decided', async () => {
    const runAsync = jest.fn();
    const database = {
      runAsync,
      getFirstAsync: async () => ({
        ...pendingRow,
        user_id: demoCycle.userId,
        cycle_id: demoCycle.id,
        status: 'accepted',
      }),
      withExclusiveTransactionAsync: async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
        callback(database as unknown as SQLiteDatabase),
    } as unknown as SQLiteDatabase;
    await expect(
      acceptCoachProposalWithRevision(
        database,
        demoCycle.userId,
        demoCoachProposal,
        demoProgram,
        demoProgramVersion,
        demoCycle,
        '2026-09-14T12:00:00.000Z',
      ),
    ).resolves.toMatchObject({ status: 'unchanged' });
    expect(runAsync).not.toHaveBeenCalled();
  });

  it('refuses approval when the persisted cycle points to a newer plan revision', async () => {
    const runAsync = jest.fn();
    const database = {
      runAsync,
      getFirstAsync: async (sql: string) =>
        sql.includes('FROM coach_proposals')
          ? { ...pendingRow, user_id: demoCycle.userId, cycle_id: demoCycle.id }
          : {
              id: demoCycle.id,
              user_id: demoCycle.userId,
              program_version_id: 'newer-version',
              status: 'active',
              current_week: demoCycle.currentWeek,
              started_at: demoCycle.startedAt,
              weeks_json: JSON.stringify(demoCycle.weeks),
            },
      withExclusiveTransactionAsync: async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
        callback(database as unknown as SQLiteDatabase),
    } as unknown as SQLiteDatabase;

    await expect(
      acceptCoachProposalWithRevision(
        database,
        demoCycle.userId,
        demoCoachProposal,
        demoProgram,
        demoProgramVersion,
        demoCycle,
        '2026-09-14T12:00:00.000Z',
      ),
    ).rejects.toThrow('no longer the active local plan');
    expect(runAsync).not.toHaveBeenCalled();
  });
});
