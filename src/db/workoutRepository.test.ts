import type { SQLiteDatabase } from 'expo-sqlite';

import { demoCycle, demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import type { CompletedSet } from '../domain/types';
import {
  completeWorkoutSession,
  completeWorkoutSessionAndAdvanceCycle,
  finishWorkoutSessionPartially,
  finishWorkoutSessionSkipped,
  getCompletedSets,
  getInProgressWorkoutSession,
  getWorkoutDraft,
  saveActiveWorkoutRevision,
  saveCompletedSet,
  saveWorkoutDraft,
  saveWorkoutSession,
  updateWorkoutSessionNote,
  updateWorkoutSessionReadiness,
  updateWorkoutSessionProgramVersion,
  updateCompletedSet,
} from './workoutRepository';

const completedSet: CompletedSet = {
  id: 'set-1',
  sessionId: 'session-1',
  workoutExerciseId: 'workout-exercise-1',
  setNumber: 1,
  load: 185,
  reps: 5,
  rir: 2,
  completedAt: '2026-09-13T12:05:00.000Z',
  idempotencyKey: 'session-1:workout-exercise-1:1',
};

function fakeDatabase(completedSetChanges: number) {
  const calls: string[] = [];
  let runCount = 0;

  const database = {
    runAsync: async (sql: string) => {
      calls.push(sql);
      runCount += 1;
      return { changes: runCount === 1 ? completedSetChanges : 1, lastInsertRowId: 1 };
    },
    withTransactionAsync: async (callback: () => Promise<void>) => {
      calls.push('BEGIN TRANSACTION');
      await callback();
      calls.push('COMMIT TRANSACTION');
    },
  } as unknown as SQLiteDatabase;

  return { database, calls };
}

describe('saveCompletedSet', () => {
  it('commits the local set and outbox mutation in one transaction', async () => {
    const { database, calls } = fakeDatabase(1);

    await expect(saveCompletedSet(database, completedSet)).resolves.toBe('inserted');
    expect(calls[0]).toBe('BEGIN TRANSACTION');
    expect(calls[1]).toContain('INSERT OR IGNORE INTO completed_sets');
    expect(calls[2]).toContain('INSERT OR IGNORE INTO sync_outbox');
    expect(calls[3]).toBe('COMMIT TRANSACTION');
  });

  it('does not enqueue a duplicate set when SQLite reports no inserted row', async () => {
    const { database, calls } = fakeDatabase(0);

    await expect(saveCompletedSet(database, completedSet)).resolves.toBe('duplicate');
    expect(calls).toEqual([
      'BEGIN TRANSACTION',
      expect.stringContaining('completed_sets'),
      'COMMIT TRANSACTION',
    ]);
  });

  it('reads completed sets by stable session and exercise IDs', async () => {
    const database = {
      getAllAsync: async () => [
        {
          id: 'set-1',
          session_id: 'session-1',
          workout_exercise_id: 'workout-exercise-1',
          set_number: 1,
          load: 185,
          reps: 5,
          duration_seconds: null,
          distance_meters: null,
          rpe: null,
          rir: 2,
          completed_at: '2026-09-13T12:05:00.000Z',
          idempotency_key: 'session-1:workout-exercise-1:1',
        },
      ],
    } as unknown as SQLiteDatabase;

    await expect(getCompletedSets(database, 'session-1')).resolves.toEqual([completedSet]);
  });

  it('finds the latest unfinished session for a planned workout', async () => {
    const database = {
      getFirstAsync: async () => ({
        id: 'session-resume',
        cycle_id: 'cycle-1',
        cycle_week: 2,
        workout_id: 'workout-1',
        program_version_id: 'program-version-1',
        workout_focus: 'strength',
        status: 'in-progress',
        started_at: '2026-09-14T12:00:00.000Z',
        completed_at: null,
        is_offline: 1,
        readiness: 'limited',
      }),
    } as unknown as SQLiteDatabase;

    await expect(
      getInProgressWorkoutSession(database, 'cycle-1', 2, 'workout-1'),
    ).resolves.toMatchObject({
      id: 'session-resume',
      cycleWeek: 2,
      status: 'in-progress',
      isOffline: true,
      readiness: 'limited',
    });
  });

  it('updates only an unfinished session and refreshes its sync payload', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-1',
        cycle_id: 'cycle-1',
        cycle_week: 1,
        workout_id: 'workout-1',
        program_version_id: 'program-version-2',
        workout_focus: 'strength',
        status: 'in-progress',
        started_at: '2026-09-14T12:00:00.000Z',
        completed_at: null,
        is_offline: 1,
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      updateWorkoutSessionProgramVersion(database, 'session-1', 'program-version-2'),
    ).resolves.toMatchObject({ programVersionId: 'program-version-2' });
    expect(calls[0]).toMatchObject({
      params: ['program-version-2', 'session-1'],
    });
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(JSON.parse(String(calls[1]?.params[4]))).toMatchObject({
      id: 'session-1',
      programVersionId: 'program-version-2',
    });
  });

  it('persists readiness context only for an unfinished session and refreshes its sync payload', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-1',
        cycle_id: 'cycle-1',
        cycle_week: 1,
        workout_id: 'workout-1',
        program_version_id: 'program-version-1',
        workout_focus: 'strength',
        status: 'in-progress',
        started_at: '2026-09-14T12:00:00.000Z',
        completed_at: null,
        is_offline: 1,
        readiness: 'limited',
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      updateWorkoutSessionReadiness(database, 'session-1', 'limited'),
    ).resolves.toMatchObject({ readiness: 'limited' });
    expect(calls[0]).toMatchObject({ params: ['limited', 'session-1'] });
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(JSON.parse(String(calls[1]?.params[4]))).toMatchObject({
      id: 'session-1',
      readiness: 'limited',
    });
  });

  it('only completes an in-progress session', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-1',
        cycle_id: 'cycle-1',
        cycle_week: 1,
        workout_id: 'workout-1',
        program_version_id: 'program-version-1',
        workout_focus: 'strength',
        status: 'complete',
        started_at: '2026-09-13T12:00:00.000Z',
        completed_at: '2026-09-13T12:30:00.000Z',
        is_offline: 1,
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => {
        await callback();
      },
    } as unknown as SQLiteDatabase;

    await expect(
      completeWorkoutSession(database, 'session-1', '2026-09-13T12:30:00.000Z'),
    ).resolves.toBeUndefined();
    expect(calls[0]).toMatchObject({
      params: ['2026-09-13T12:30:00.000Z', 'session-1'],
    });
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(JSON.parse(String(calls[1]?.params[4]))).toMatchObject({
      id: 'session-1',
      status: 'complete',
      completedAt: '2026-09-13T12:30:00.000Z',
    });
  });

  it('does not rewrite a completed session or enqueue a duplicate completion', async () => {
    const calls: string[] = [];
    const database = {
      runAsync: async (sql: string) => {
        calls.push(sql);
        return { changes: 0, lastInsertRowId: 0 };
      },
      getFirstAsync: async () => {
        throw new Error('should not read a session when no row changed');
      },
      withTransactionAsync: async (callback: () => Promise<void>) => {
        await callback();
      },
    } as unknown as SQLiteDatabase;

    await completeWorkoutSession(database, 'session-1', '2026-09-13T12:30:00.000Z');

    expect(calls).toHaveLength(1);
  });
});

describe('saveWorkoutSession', () => {
  it('persists the session and its sync mutation atomically', async () => {
    const calls: string[] = [];
    const database = {
      runAsync: async (sql: string) => {
        calls.push(sql);
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => {
        calls.push('BEGIN TRANSACTION');
        await callback();
        calls.push('COMMIT TRANSACTION');
      },
    } as unknown as SQLiteDatabase;

    await saveWorkoutSession(database, {
      id: 'session-1',
      cycleId: 'cycle-1',
      cycleWeek: 1,
      workoutId: 'workout-1',
      programVersionId: 'program-version-1',
      workoutFocus: 'strength',
      status: 'in-progress',
      startedAt: '2026-09-13T12:00:00.000Z',
      isOffline: true,
    });

    expect(calls[0]).toBe('BEGIN TRANSACTION');
    expect(calls[1]).toContain('INSERT OR IGNORE INTO workout_sessions');
    expect(calls[2]).toContain('INSERT OR IGNORE INTO sync_outbox');
    expect(calls[3]).toBe('COMMIT TRANSACTION');
  });
});

describe('updateWorkoutSessionNote', () => {
  it('updates only an unfinished session and replaces its queued payload', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-1',
        cycle_id: 'cycle-1',
        cycle_week: 1,
        workout_id: 'workout-1',
        program_version_id: 'program-version-1',
        workout_focus: 'strength',
        status: 'in-progress',
        started_at: '2026-09-14T12:00:00.000Z',
        completed_at: null,
        completion_reason: null,
        is_offline: 1,
        readiness: 'ready',
        note: 'Felt strong on the final set.',
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      updateWorkoutSessionNote(database, 'session-1', '  Felt strong on the final set.  '),
    ).resolves.toMatchObject({
      id: 'session-1',
      note: 'Felt strong on the final set.',
    });
    expect(calls[0]?.sql).toContain('UPDATE workout_sessions');
    expect(calls[0]?.params).toEqual(['Felt strong on the final set.', 'session-1']);
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(JSON.parse(String(calls[1]?.params[4]))).toMatchObject({
      id: 'session-1',
      note: 'Felt strong on the final set.',
    });
  });

  it('rejects notes longer than the local safety bound', async () => {
    const database = {} as SQLiteDatabase;

    await expect(updateWorkoutSessionNote(database, 'session-1', 'x'.repeat(501))).rejects.toThrow(
      '500 characters',
    );
  });
});

describe('saveActiveWorkoutRevision', () => {
  it('commits the version, cycle pointer, session pointer, and outbox rows together', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-1',
        cycle_id: 'cycle-1',
        cycle_week: 1,
        workout_id: 'workout-1',
        program_version_id: 'program-version-2',
        workout_focus: 'strength',
        status: 'in-progress',
        started_at: '2026-09-14T12:00:00.000Z',
        completed_at: null,
        completion_reason: null,
        is_offline: 1,
        readiness: 'ready',
        note: null,
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => {
        calls.push({ sql: 'BEGIN TRANSACTION', params: [] });
        await callback();
        calls.push({ sql: 'COMMIT TRANSACTION', params: [] });
      },
    } as unknown as SQLiteDatabase;

    const nextVersion = { ...demoProgramVersion, id: 'program-version-2' };
    const nextProgram = { ...demoProgram, currentVersionId: nextVersion.id };
    const nextCycle = { ...demoCycle, programVersionId: nextVersion.id };

    await expect(
      saveActiveWorkoutRevision(
        database,
        'guest-user',
        nextProgram,
        nextVersion,
        nextCycle,
        'session-1',
      ),
    ).resolves.toMatchObject({ programVersionId: 'program-version-2' });

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls.some((call) => call.sql.includes('INSERT INTO user_program_versions'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('INSERT INTO training_cycles'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('UPDATE workout_sessions'))).toBe(true);
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
    expect(calls.filter((call) => call.sql === 'BEGIN TRANSACTION')).toHaveLength(1);
  });
});

describe('completeWorkoutSessionAndAdvanceCycle', () => {
  it('commits completion, cycle advancement, sync mutations, and draft deletion together', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async (sql: string) => {
        if (sql.includes('FROM user_program_versions')) {
          return {
            version_json: JSON.stringify({
              ...demoProgramVersion,
              id: 'program-version-1',
              workouts: [{ ...demoProgramVersion.workouts[0]!, id: 'workout-1' }],
            }),
          };
        }
        if (sql.includes('COUNT(DISTINCT workout_id)')) return { count: 1 };
        if (sql.includes('FROM workout_sessions')) {
          return {
            id: 'session-1',
            cycle_id: 'cycle-1',
            cycle_week: 1,
            workout_id: 'workout-1',
            program_version_id: 'program-version-1',
            workout_focus: 'strength',
            status: 'complete',
            started_at: '2026-09-13T12:00:00.000Z',
            completed_at: '2026-09-13T12:30:00.000Z',
            is_offline: 1,
          };
        }
        if (sql.includes('FROM training_cycles')) {
          return {
            id: 'cycle-1',
            user_id: 'guest-user',
            program_version_id: 'program-version-1',
            status: 'active',
            current_week: 1,
            started_at: '2026-09-13T12:00:00.000Z',
            weeks_json: JSON.stringify(
              Array.from({ length: 6 }, (_, index) => ({
                weekNumber: index + 1,
                label: `Week ${index + 1}`,
                phase: 'Training',
                status: index === 0 ? 'current' : 'upcoming',
                completedWorkoutCount: 0,
                plannedWorkoutCount: 1,
              })),
            ),
          };
        }
        return null;
      },
      withTransactionAsync: async (callback: () => Promise<void>) => {
        calls.push({ sql: 'BEGIN TRANSACTION', params: [] });
        await callback();
        calls.push({ sql: 'COMMIT TRANSACTION', params: [] });
      },
    } as unknown as SQLiteDatabase;

    await expect(
      completeWorkoutSessionAndAdvanceCycle(database, 'session-1', '2026-09-13T12:30:00.000Z'),
    ).resolves.toMatchObject({ currentWeek: 2 });

    expect(calls[0]?.sql).toBe('BEGIN TRANSACTION');
    expect(calls.some((call) => call.sql.includes('UPDATE workout_sessions'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('UPDATE training_cycles'))).toBe(true);
    expect(calls.some((call) => call.sql.includes('DELETE FROM workout_drafts'))).toBe(true);
    expect(calls.at(-1)?.sql).toBe('COMMIT TRANSACTION');
  });
});

describe('finishWorkoutSessionPartially', () => {
  it('persists the partial status and reason without advancing a cycle', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-1',
        cycle_id: 'cycle-1',
        cycle_week: 2,
        workout_id: 'workout-1',
        program_version_id: 'program-version-1',
        workout_focus: 'strength',
        status: 'partial',
        started_at: '2026-09-14T12:00:00.000Z',
        completed_at: '2026-09-14T12:12:00.000Z',
        completion_reason: 'time-limited',
        is_offline: 1,
        readiness: 'limited',
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      finishWorkoutSessionPartially(
        database,
        'session-1',
        '2026-09-14T12:12:00.000Z',
        'time-limited',
      ),
    ).resolves.toMatchObject({
      id: 'session-1',
      status: 'partial',
      completionReason: 'time-limited',
      cycleWeek: 2,
    });
    expect(calls[0]).toMatchObject({
      params: ['partial', '2026-09-14T12:12:00.000Z', 'time-limited', 'session-1'],
    });
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(JSON.parse(String(calls[1]?.params[4]))).toMatchObject({
      id: 'session-1',
      status: 'partial',
      completionReason: 'time-limited',
    });
    expect(calls.at(-1)?.sql).toContain('DELETE FROM workout_drafts');
    expect(calls.some((call) => call.sql.includes('training_cycles'))).toBe(false);
  });

  it('does not finalize an already-ended session', async () => {
    const database = {
      runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
      getFirstAsync: async () => {
        throw new Error('should not reload an unchanged session');
      },
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      finishWorkoutSessionPartially(database, 'session-1', '2026-09-14T12:12:00.000Z', 'other'),
    ).resolves.toBeNull();
  });

  it('can mark an untouched session skipped with an explicit reason', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        id: 'session-2',
        cycle_id: 'cycle-1',
        cycle_week: 1,
        workout_id: 'workout-1',
        program_version_id: 'program-version-1',
        workout_focus: 'strength',
        status: 'skipped',
        started_at: '2026-09-15T12:00:00.000Z',
        completed_at: '2026-09-15T12:01:00.000Z',
        completion_reason: 'readiness',
        is_offline: 0,
        readiness: 'rest',
      }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      finishWorkoutSessionSkipped(database, 'session-2', '2026-09-15T12:01:00.000Z', 'readiness'),
    ).resolves.toMatchObject({ status: 'skipped', completionReason: 'readiness' });
    expect(calls[0]?.params).toEqual([
      'skipped',
      '2026-09-15T12:01:00.000Z',
      'readiness',
      'session-2',
    ]);
    expect(calls[1]?.sql).toContain('INSERT INTO sync_outbox');
    expect(calls.at(-1)?.sql).toContain('DELETE FROM workout_drafts');
  });
});

describe('workout drafts and corrections', () => {
  it('round-trips unfinished input through the local draft table', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const database = {
      runAsync: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return { changes: 1, lastInsertRowId: 1 };
      },
      getFirstAsync: async () => ({
        values_json: JSON.stringify({ 'exercise:1': { load: '95' } }),
      }),
    } as unknown as SQLiteDatabase;

    await saveWorkoutDraft(
      database,
      'session-1',
      {
        'exercise:1': { load: '95', reps: '5', duration: '', distance: '', rpe: '', rir: '' },
      },
      '2026-09-14T12:00:00.000Z',
    );

    await expect(getWorkoutDraft(database, 'session-1')).resolves.toEqual({
      'exercise:1': { load: '95' },
    });
    expect(calls[0]?.sql).toContain('ON CONFLICT(session_id) DO UPDATE');
  });

  it('updates a completed set and replaces its pending outbox payload', async () => {
    const calls: string[] = [];
    const database = {
      runAsync: async (sql: string) => {
        calls.push(sql);
        return { changes: 1, lastInsertRowId: 1 };
      },
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;

    await expect(
      updateCompletedSet(database, {
        id: 'set-1',
        sessionId: 'session-1',
        workoutExerciseId: 'workout-exercise-1',
        setNumber: 1,
        load: 100,
        reps: 5,
        completedAt: '2026-09-14T12:00:00.000Z',
        idempotencyKey: 'session-1:workout-exercise-1:1',
      }),
    ).resolves.toBe('updated');
    expect(calls[0]).toContain('UPDATE completed_sets');
    expect(calls[1]).toContain('ON CONFLICT(idempotency_key) DO UPDATE');
  });
});
