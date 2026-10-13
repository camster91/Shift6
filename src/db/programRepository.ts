import { SYNC_MUTATION_INSERT_SQL } from './syncOutbox';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Exercise, Program, ProgramVersion } from '../domain/types';

interface UserProgramVersionRow {
  program_json: string;
  version_json: string;
}

export interface UserProgramSnapshot {
  program: Program;
  version: ProgramVersion;
}

/** Latest persisted version per owned private plan; public catalogue approval is unrelated. */
export async function getSavedUserPrograms(
  database: SQLiteDatabase,
  userId: string,
): Promise<UserProgramSnapshot[]> {
  const rows = await database.getAllAsync<
    UserProgramVersionRow & { program_id: string; version_id: string }
  >(
    `SELECT p.id AS program_id, v.id AS version_id, p.program_json, v.version_json
       FROM user_programs p
       INNER JOIN user_program_versions v ON v.program_id = p.id
      WHERE p.user_id = ? AND v.id = (
        SELECT latest.id FROM user_program_versions latest
         WHERE latest.program_id = p.id
         ORDER BY latest.version DESC, latest.created_at DESC, latest.id DESC LIMIT 1
      )
      ORDER BY p.updated_at DESC, p.id ASC;`,
    userId,
  );
  return rows.map((row) => {
    const program = JSON.parse(row.program_json) as Program;
    const version = JSON.parse(row.version_json) as ProgramVersion;
    if (
      program.id !== row.program_id ||
      version.id !== row.version_id ||
      version.programId !== row.program_id ||
      typeof program.title !== 'string' ||
      !Array.isArray(version.workouts)
    )
      throw new Error('A saved private plan could not be read. Your records have not changed.');
    return { program, version };
  });
}

export async function saveProgramVersion(
  database: SQLiteDatabase,
  userId: string,
  program: Program,
  version: ProgramVersion,
): Promise<void> {
  await database.withTransactionAsync(async () =>
    saveProgramVersionInTransaction(database, userId, program, version),
  );
}

export async function saveProgramVersionInTransaction(
  database: SQLiteDatabase,
  userId: string,
  program: Program,
  version: ProgramVersion,
): Promise<void> {
  if (version.programId !== program.id) {
    throw new Error('The program version must belong to the program being saved.');
  }

  const programWrite = await database.runAsync(
    `INSERT INTO user_programs
      (id, user_id, source_program_id, program_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       source_program_id = excluded.source_program_id,
       program_json = excluded.program_json,
       updated_at = excluded.updated_at
     WHERE user_programs.user_id = excluded.user_id;`,
    program.id,
    userId,
    program.sourceProgramId ?? null,
    JSON.stringify(program),
    version.createdAt,
  );
  if (programWrite.changes !== 1) {
    throw new Error('The program ID belongs to another local user.');
  }

  const versionWrite = await database.runAsync(
    `INSERT INTO user_program_versions
      (id, program_id, version, status, version_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       version = excluded.version,
       status = excluded.status,
       version_json = excluded.version_json,
       created_at = excluded.created_at
     WHERE user_program_versions.program_id = excluded.program_id;`,
    version.id,
    program.id,
    version.version,
    version.status,
    JSON.stringify(version),
    version.createdAt,
  );
  if (versionWrite.changes !== 1) {
    throw new Error('The program version ID belongs to another program.');
  }
  await database.runAsync(
    SYNC_MUTATION_INSERT_SQL,
    `outbox-program-version-${version.id}`,
    `program-version:${version.id}`,
    'program-version',
    version.id,
    JSON.stringify({ userId, program, version }),
    version.createdAt,
  );
}

export async function getUserProgramVersion(
  database: SQLiteDatabase,
  userId: string,
  versionId: string,
): Promise<{ program: Program; version: ProgramVersion } | null> {
  const row = await database.getFirstAsync<UserProgramVersionRow>(
    `SELECT user_programs.program_json, user_program_versions.version_json
       FROM user_program_versions
       INNER JOIN user_programs ON user_programs.id = user_program_versions.program_id
      WHERE user_programs.user_id = ? AND user_program_versions.id = ?
      LIMIT 1;`,
    userId,
    versionId,
  );
  if (!row) return null;

  return {
    program: JSON.parse(row.program_json) as Program,
    version: JSON.parse(row.version_json) as ProgramVersion,
  };
}

export async function getUserExercises(
  database: SQLiteDatabase,
  userId: string,
): Promise<Exercise[]> {
  const rows = await database.getAllAsync<{ exercise_json: string }>(
    `SELECT exercise_json
       FROM user_exercises
      WHERE user_id = ?
      ORDER BY updated_at DESC, id ASC;`,
    userId,
  );

  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.exercise_json) as Exercise];
    } catch {
      return [];
    }
  });
}

export async function saveCustomExercise(
  database: SQLiteDatabase,
  userId: string,
  exercise: Exercise,
  now: string,
): Promise<void> {
  if (!exercise.isCustom) throw new Error('Only custom exercises can be saved to a user library.');

  await database.withTransactionAsync(async () => {
    const exerciseWrite = await database.runAsync(
      `INSERT INTO user_exercises (id, user_id, exercise_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         exercise_json = excluded.exercise_json,
         updated_at = excluded.updated_at
       WHERE user_exercises.user_id = excluded.user_id;`,
      exercise.id,
      userId,
      JSON.stringify(exercise),
      now,
      now,
    );
    if (exerciseWrite.changes !== 1) {
      throw new Error('The exercise ID belongs to another local user.');
    }
    await database.runAsync(
      SYNC_MUTATION_INSERT_SQL,
      `outbox-exercise-${exercise.id}`,
      `exercise:${exercise.id}`,
      'exercise',
      exercise.id,
      JSON.stringify({ userId, exercise }),
      now,
    );
  });
}
