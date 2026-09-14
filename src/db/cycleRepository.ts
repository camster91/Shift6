import type { SQLiteDatabase } from 'expo-sqlite';

import type { TrainingCycle } from '../domain/types';

interface TrainingCycleRow {
  id: string;
  user_id: string;
  program_version_id: string;
  status: TrainingCycle['status'];
  current_week: number;
  started_at: string;
  weeks_json: string;
}

export async function saveTrainingCycle(
  database: SQLiteDatabase,
  cycle: TrainingCycle,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE training_cycles
          SET status = 'paused'
        WHERE user_id = ? AND status = 'active' AND id != ?;`,
      cycle.userId,
      cycle.id,
    );
    await database.runAsync(
      `INSERT INTO training_cycles
        (id, user_id, program_version_id, status, current_week, started_at, weeks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         program_version_id = excluded.program_version_id,
         status = excluded.status,
         current_week = excluded.current_week,
         started_at = excluded.started_at,
         weeks_json = excluded.weeks_json;`,
      cycle.id,
      cycle.userId,
      cycle.programVersionId,
      cycle.status,
      cycle.currentWeek,
      cycle.startedAt,
      JSON.stringify(cycle.weeks),
    );
  });
}

export async function getActiveTrainingCycle(
  database: SQLiteDatabase,
  userId: string,
): Promise<TrainingCycle | null> {
  const row = await database.getFirstAsync<TrainingCycleRow>(
    `SELECT id, user_id, program_version_id, status, current_week, started_at, weeks_json
       FROM training_cycles
      WHERE user_id = ? AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1;`,
    userId,
  );
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    programVersionId: row.program_version_id,
    status: row.status,
    currentWeek: row.current_week,
    startedAt: row.started_at,
    weeks: JSON.parse(row.weeks_json) as TrainingCycle['weeks'],
  };
}
