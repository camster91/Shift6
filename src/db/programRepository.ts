import type { SQLiteDatabase } from 'expo-sqlite';

import type { Exercise, Program, ProgramVersion } from '../domain/types';

interface UserProgramVersionRow {
  program_json: string;
  version_json: string;
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
    `INSERT INTO sync_outbox
      (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       created_at = excluded.created_at,
       last_error = NULL;`,
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
      `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         created_at = excluded.created_at,
         last_error = NULL;`,
      `outbox-exercise-${exercise.id}`,
      `exercise:${exercise.id}`,
      'exercise',
      exercise.id,
      JSON.stringify({ userId, exercise }),
      now,
    );
  });
}
