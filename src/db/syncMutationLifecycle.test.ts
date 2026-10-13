import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { CompletedSet, OnboardingProfile } from '../domain/types';
import type { BackendClient, SyncMutation } from '../services/contracts';
import { migrateLocalUserToAccount } from './accountRepository';
import { MIGRATIONS } from './migrations';
import { deleteLocalUserData } from './privacyRepository';
import { saveOnboardingProfile } from './profileRepository';
import { flushSyncOutbox, getPendingSyncMutations } from './syncRepository';
import { saveCompletedSet, saveWorkoutSession, updateCompletedSet } from './workoutRepository';

const timestamp = '2026-09-13T12:00:00.000Z';
const profile: OnboardingProfile = {
  user: {
    id: 'guest-user',
    displayName: 'Cameron',
    unitSystem: 'metric',
    goals: ['strength'],
    experience: 'beginner',
    equipmentIds: [],
    trainingDaysPerWeek: 3,
    preferredSessionMinutes: 30,
    preferredTrainingTime: 'morning',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  coachTone: 'supportive',
  coachIntervention: 'balanced',
  healthConnection: 'not-now',
  completedAt: timestamp,
};
const completedSet: CompletedSet = {
  id: 'set-1',
  sessionId: 'session-1',
  workoutExerciseId: 'exercise-1',
  setNumber: 1,
  load: 50,
  reps: 5,
  completedAt: timestamp,
  idempotencyKey: 'session-1:exercise-1:1',
};

function createDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) {
    for (const statement of migration.statements) sqlite.exec(statement);
  }
  const database = {
    runAsync: async (sql: string, ...params: SQLInputValue[]) => {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getAllAsync: async (sql: string, ...params: SQLInputValue[]) =>
      sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, ...params: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...params) ?? null,
    withTransactionAsync: async (callback: () => Promise<void>) => {
      sqlite.exec('BEGIN;');
      try {
        await callback();
        sqlite.exec('COMMIT;');
      } catch (error) {
        sqlite.exec('ROLLBACK;');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  return { database, sqlite };
}

function backend(sync: BackendClient['sync']): BackendClient {
  return { sync, deleteAccount: async () => ({ deleted: true }) };
}

async function acknowledgeAll(database: SQLiteDatabase) {
  await flushSyncOutbox(
    database,
    backend(async (mutations) => ({
      acknowledgedMutationIds: mutations.map((mutation) => mutation.id),
      rejectedMutationIds: [],
    })),
  );
}

const scenarios = [
  {
    name: 'profile',
    entityType: 'profile',
    entityId: profile.user.id,
    seed: (database: SQLiteDatabase) => saveOnboardingProfile(database, profile),
    edit: (database: SQLiteDatabase) =>
      saveOnboardingProfile(database, {
        ...profile,
        user: { ...profile.user, displayName: 'Updated name' },
      }),
    expectedPayload: {
      userId: profile.user.id,
      profile: { user: { displayName: 'Updated name' } },
    },
  },
  {
    name: 'completed set',
    entityType: 'completed-set',
    entityId: completedSet.id,
    seed: async (database: SQLiteDatabase) => {
      await saveOnboardingProfile(database, profile);
      await database.runAsync(
        `INSERT INTO training_cycles
          (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        'cycle-1',
        profile.user.id,
        'version-1',
        'active',
        1,
        timestamp,
        '[]',
      );
      await saveWorkoutSession(database, {
        id: completedSet.sessionId,
        cycleId: 'cycle-1',
        cycleWeek: 1,
        workoutId: 'workout-1',
        programVersionId: 'version-1',
        workoutFocus: 'strength',
        status: 'in-progress',
        startedAt: timestamp,
        isOffline: true,
      });
      await acknowledgeAll(database);
      await saveCompletedSet(database, completedSet);
    },
    edit: (database: SQLiteDatabase) => updateCompletedSet(database, { ...completedSet, reps: 8 }),
    expectedPayload: { id: completedSet.id, reps: 8 },
  },
];

describe.each(scenarios)('$name sync mutation lifecycle', (scenario) => {
  let database: SQLiteDatabase;
  let sqlite: DatabaseSync;

  beforeEach(async () => {
    ({ database, sqlite } = createDatabase());
    await scenario.seed(database);
  });
  afterEach(() => sqlite.close());

  it('assigns a new operation identity to an edit after the original was acknowledged', async () => {
    const [original] = await getPendingSyncMutations(database);
    expect(original).toBeDefined();
    await acknowledgeAll(database);
    expect(await getPendingSyncMutations(database)).toEqual([]);

    // Same timestamps deliberately reproduce edits within the clock resolution.
    await scenario.edit(database);
    const pending = await getPendingSyncMutations(database);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      entityType: scenario.entityType,
      entityId: scenario.entityId,
      payload: scenario.expectedPayload,
    });
    expect(pending[0]?.idempotencyKey).not.toBe(original?.idempotencyKey);
    expect(pending[0]?.id).not.toBe(original?.id);
  });

  it('preserves an edit saved while the backend is acknowledging an older snapshot', async () => {
    let sent: readonly SyncMutation[] = [];
    const result = await flushSyncOutbox(
      database,
      backend(async (mutations) => {
        sent = mutations;
        await scenario.edit(database);
        return {
          acknowledgedMutationIds: mutations.map((mutation) => mutation.id),
          rejectedMutationIds: [],
        };
      }),
    );
    expect(result.acknowledgedMutationIds).toEqual(sent.map((mutation) => mutation.id));
    const pending = await getPendingSyncMutations(database);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      entityId: scenario.entityId,
      payload: scenario.expectedPayload,
    });
    expect(sent.map((mutation) => mutation.id)).not.toContain(pending[0]?.id);
    expect(sent.map((mutation) => mutation.idempotencyKey)).not.toContain(
      pending[0]?.idempotencyKey,
    );
  });

  it('keeps an unchanged operation identity and snapshot stable across failed retries', async () => {
    const original = await getPendingSyncMutations(database);
    const unavailable = backend(async () => {
      throw new Error('Offline');
    });
    await flushSyncOutbox(database, unavailable);
    await flushSyncOutbox(database, unavailable);
    expect(await getPendingSyncMutations(database)).toEqual(original);
  });
});

it('deletes every queued profile revision for one user while preserving another user', async () => {
  const { database, sqlite } = createDatabase();
  try {
    await saveOnboardingProfile(database, profile);
    await scenarios[0]!.edit(database);
    expect(await getPendingSyncMutations(database)).toHaveLength(2);
    const other = { ...profile, user: { ...profile.user, id: 'other-user' } };
    await saveOnboardingProfile(database, other);
    const otherMutations = (await getPendingSyncMutations(database)).filter(
      (mutation) => mutation.entityId === other.user.id,
    );

    await deleteLocalUserData(database, profile.user.id);

    expect(await getPendingSyncMutations(database)).toEqual(otherMutations);
    expect(
      await database.getFirstAsync('SELECT id FROM user_profiles WHERE id = ?;', other.user.id),
    ).toEqual({ id: other.user.id });
  } finally {
    sqlite.close();
  }
});

it('adopts multiple pending profile revisions without collapsing their operation identities', async () => {
  const { database, sqlite } = createDatabase();
  try {
    await saveOnboardingProfile(database, profile);
    await scenarios[0]!.edit(database);
    const originals = await getPendingSyncMutations(database);
    expect(originals).toHaveLength(2);

    await migrateLocalUserToAccount(database, profile.user.id, 'account-user');

    const adopted = await getPendingSyncMutations(database);
    expect(adopted).toHaveLength(originals.length);
    expect(adopted.map(({ id, idempotencyKey }) => ({ id, idempotencyKey }))).toEqual(
      originals.map(({ id, idempotencyKey }) => ({ id, idempotencyKey })),
    );
    for (const mutation of adopted) {
      expect(mutation).toMatchObject({
        entityType: 'profile',
        entityId: 'account-user',
        payload: { userId: 'account-user', profile: { user: { id: 'account-user' } } },
      });
    }
  } finally {
    sqlite.close();
  }
});

describe('ordered snapshots for one entity', () => {
  it('acknowledges the older snapshot before sending a newer edit', async () => {
    const { database, sqlite } = createDatabase();
    try {
      await saveOnboardingProfile(database, profile);
      await saveOnboardingProfile(database, {
        ...profile,
        user: { ...profile.user, displayName: 'Second' },
      });
      const queued = await getPendingSyncMutations(database);
      expect(queued).toHaveLength(2);
      expect(queued[0]?.payload).toMatchObject({ profile: { user: { displayName: 'Cameron' } } });
      const sent: string[][] = [];
      const accepting = backend(async (mutations) => {
        sent.push(mutations.map((mutation) => mutation.id));
        return {
          acknowledgedMutationIds: mutations.map((mutation) => mutation.id),
          rejectedMutationIds: [],
        };
      });
      await flushSyncOutbox(database, accepting);
      expect(sent[0]).toEqual([queued[0]?.id]);
      expect(await getPendingSyncMutations(database)).toHaveLength(1);
      await flushSyncOutbox(database, accepting);
      expect(sent[1]).toEqual([queued[1]?.id]);
      expect(await getPendingSyncMutations(database)).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
