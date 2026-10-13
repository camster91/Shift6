import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { MIGRATIONS } from './migrations';
import { saveCustomExercise, saveProgramVersion } from './programRepository';
import { saveTrainingCycle } from './cycleRepository';
import { acceptCoachProposalWithRevision, saveCoachProposal } from './coachRepository';
import { createTrainingCycle } from '../domain/cycle';
import { createCustomExercise } from '../domain/programBuilder';
import { demoCoachProposal, demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { foundationalExercises } from '../domain/fixtures/exercises';
import type { CoachProposal, ProgramVersion } from '../domain/types';

function sqliteDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  for (const migration of MIGRATIONS) {
    for (const statement of migration.statements) sqlite.exec(statement);
  }

  const database = {
    runAsync: async (sql: string, ...params: unknown[]) => {
      const result = sqlite.prepare(sql).run(...(params as SQLInputValue[]));
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).get(...(params as SQLInputValue[])) ?? null,
    getAllAsync: async (sql: string, ...params: unknown[]) =>
      sqlite.prepare(sql).all(...(params as SQLInputValue[])),
    withExclusiveTransactionAsync: async (callback: (tx: SQLiteDatabase) => Promise<void>) =>
      database.withTransactionAsync(() => callback(database)),
    withTransactionAsync: async (callback: () => Promise<void>) => {
      sqlite.exec('BEGIN TRANSACTION;');
      try {
        await callback();
        sqlite.exec('COMMIT TRANSACTION;');
      } catch (error) {
        sqlite.exec('ROLLBACK TRANSACTION;');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;

  return { database, sqlite };
}

const now = '2026-10-13T12:00:00.000Z';
const owner = 'guest-user';
const movement = demoProgramVersion.workouts[0]!.exercises[0]!;
function substitution(to: string): CoachProposal {
  return {
    ...demoCoachProposal,
    changes: [
      {
        id: 'replacement',
        type: 'exercise-substitution',
        workoutId: demoProgramVersion.workouts[0]!.id,
        workoutExerciseId: movement.id,
        exerciseId: movement.exerciseId,
        field: 'exerciseId',
        from: movement.exerciseId,
        to,
        requiresUserConfirmation: true,
      },
    ],
  };
}
function custom(id: string) {
  return createCustomExercise({
    id,
    name: 'Synthetic private movement',
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    equipmentIds: ['equipment-bodyweight'],
  });
}
function records(sqlite: DatabaseSync) {
  return Object.fromEntries(
    [
      'coach_proposals',
      'user_programs',
      'user_program_versions',
      'training_cycles',
      'sync_outbox',
    ].map((table) => [table, sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]),
  );
}
async function setup(
  database: SQLiteDatabase,
  proposal: CoachProposal,
  version: ProgramVersion = demoProgramVersion,
) {
  await saveProgramVersion(database, owner, demoProgram, version);
  const cycle = createTrainingCycle({
    id: 'boundary-cycle',
    userId: owner,
    programVersion: version,
    startedAt: now,
  });
  await saveTrainingCycle(database, cycle);
  await saveCoachProposal(database, owner, cycle.id, proposal);
  return cycle;
}
describe('confirmed Coach executor boundaries (real SQLite)', () => {
  it.each(['missing', 'gated-public', 'foreign', 'public-shadow'])(
    'rejects %s replacement without altering proposal, plan, cycle or outbox',
    async (kind) => {
      const { database, sqlite } = sqliteDatabase();
      try {
        const destination =
          kind === 'gated-public' || kind === 'public-shadow'
            ? foundationalExercises[0]!.id
            : 'private-replacement';
        if (kind === 'foreign')
          await saveCustomExercise(database, 'another-owner', custom(destination), now);
        if (kind === 'public-shadow')
          await saveCustomExercise(database, owner, custom(destination), now);
        const proposal = substitution(destination);
        const cycle = await setup(database, proposal);
        const before = records(sqlite);
        await expect(
          acceptCoachProposalWithRevision(
            database,
            owner,
            proposal,
            demoProgram,
            demoProgramVersion,
            cycle,
            now,
          ),
        ).rejects.toThrow('unavailable or awaiting');
        expect(records(sqlite)).toEqual(before);
      } finally {
        sqlite.close();
      }
    },
  );
  it('accepts an explicitly confirmed owner-scoped custom replacement and preserves source history', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      await saveCustomExercise(database, owner, custom('private-replacement'), now);
      const proposal = substitution('private-replacement');
      const cycle = await setup(database, proposal);
      const source = sqlite
        .prepare('SELECT * FROM user_program_versions WHERE id=?')
        .get(demoProgramVersion.id);
      const result = await acceptCoachProposalWithRevision(
        database,
        owner,
        proposal,
        demoProgram,
        demoProgramVersion,
        cycle,
        now,
      );
      expect(result.status).toBe('updated');
      expect(result.version.workouts[0]!.exercises[0]!.exerciseId).toBe('private-replacement');
      expect(
        sqlite.prepare('SELECT * FROM user_program_versions WHERE id=?').get(demoProgramVersion.id),
      ).toEqual(source);
      expect(
        sqlite.prepare('SELECT status FROM coach_proposals WHERE id=?').get(proposal.id),
      ).toMatchObject({ status: 'accepted' });
      expect(
        sqlite.prepare('SELECT program_version_id FROM training_cycles WHERE id=?').get(cycle.id),
      ).toMatchObject({ program_version_id: result.version.id });
    } finally {
      sqlite.close();
    }
  });
  it('rejects explicit 40kg to 45lb before changing any persisted record', async () => {
    const { database, sqlite } = sqliteDatabase();
    try {
      const version = JSON.parse(JSON.stringify(demoProgramVersion)) as ProgramVersion;
      version.workouts[0]!.exercises[0]!.sets[0]!.target.load = { value: 40, unit: 'metric' };
      const proposal: CoachProposal = {
        ...demoCoachProposal,
        changes: [
          {
            ...substitution('unused').changes[0]!,
            type: 'target-change',
            field: 'load',
            from: '40kg',
            to: '45lb',
          },
        ],
      };
      const cycle = await setup(database, proposal, version);
      const before = records(sqlite);
      await expect(
        acceptCoachProposalWithRevision(
          database,
          owner,
          proposal,
          demoProgram,
          version,
          cycle,
          now,
        ),
      ).rejects.toThrow('current target unit');
      expect(records(sqlite)).toEqual(before);
    } finally {
      sqlite.close();
    }
  });
});
