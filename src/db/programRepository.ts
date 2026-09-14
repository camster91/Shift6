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
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO user_programs
        (id, user_id, source_program_id, program_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         source_program_id = excluded.source_program_id,
         program_json = excluded.program_json,
         updated_at = excluded.updated_at;`,
      program.id,
      userId,
      program.sourceProgramId ?? null,
      JSON.stringify(program),
      version.createdAt,
    );
    await database.runAsync(
      `INSERT INTO user_program_versions
        (id, program_id, version, status, version_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         program_id = excluded.program_id,
         version = excluded.version,
         status = excluded.status,
         version_json = excluded.version_json,
         created_at = excluded.created_at;`,
      version.id,
      program.id,
      version.version,
      version.status,
      JSON.stringify(version),
      version.createdAt,
    );
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
  });
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

export async function saveCustomExercise(
  database: SQLiteDatabase,
  userId: string,
  exercise: Exercise,
  now: string,
): Promise<void> {
  if (!exercise.isCustom) throw new Error('Only custom exercises can be saved to a user library.');

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO user_exercises (id, user_id, exercise_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         exercise_json = excluded.exercise_json,
         updated_at = excluded.updated_at;`,
      exercise.id,
      userId,
      JSON.stringify(exercise),
      now,
      now,
    );
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
