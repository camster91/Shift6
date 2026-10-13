import type { SQLiteDatabase } from 'expo-sqlite';
import type { TrainingCycle } from '../domain/types';
import { getCycleReview } from './cycleReviewRepository';
import { getActiveTrainingCycle, getLatestTrainingCycle } from './cycleRepository';

interface CycleRow {
  id: string;
  user_id: string;
  program_version_id: string;
  status: TrainingCycle['status'];
  current_week: number;
  started_at: string;
  weeks_json: string;
  program_json?: string | null;
  review_updated_at?: string | null;
}
export interface CycleHistoryCursor {
  startedAt: string;
  id: string;
}
export interface SavedCycleEntry {
  cycle: TrainingCycle;
  programTitle: string | null;
  reviewUpdatedAt: string | null;
}
const map = (row: CycleRow): TrainingCycle => ({
  id: row.id,
  userId: row.user_id,
  programVersionId: row.program_version_id,
  status: row.status,
  currentWeek: row.current_week,
  startedAt: row.started_at,
  weeks: JSON.parse(row.weeks_json),
});
export function requestedCycleId(value: unknown): string | null {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 1024 ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new Error('The saved cycle link is invalid.');
  return value;
}
export async function getOwnedTrainingCycle(
  db: SQLiteDatabase,
  userId: string,
  cycleId: string,
): Promise<TrainingCycle | null> {
  const row = await db.getFirstAsync<CycleRow>(
    'SELECT * FROM training_cycles WHERE user_id=? AND id=?;',
    userId,
    cycleId,
  );
  return row ? map(row) : null;
}
export async function selectDashboardCycle(
  db: SQLiteDatabase,
  userId: string,
  selection: unknown,
): Promise<TrainingCycle | null> {
  const id = requestedCycleId(selection);
  // A supplied ID must never fall through to a different local cycle.
  if (id !== null) return getOwnedTrainingCycle(db, userId, id);
  return (await getActiveTrainingCycle(db, userId)) ?? getLatestTrainingCycle(db, userId);
}
export async function getSavedCyclePage(
  db: SQLiteDatabase,
  userId: string,
  cursor: CycleHistoryCursor | null = null,
  pageSize = 20,
): Promise<{ entries: SavedCycleEntry[]; nextCursor: CycleHistoryCursor | null }> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
    throw new Error('Choose a page size between 1 and 100.');
  if (
    cursor &&
    (requestedCycleId(cursor.id) === null || !Number.isFinite(Date.parse(cursor.startedAt)))
  )
    throw new Error('The history cursor is invalid.');
  const rows = await db.getAllAsync<CycleRow>(
    `SELECT c.*, p.program_json, r.updated_at AS review_updated_at
    FROM training_cycles c LEFT JOIN user_program_versions v ON v.id=c.program_version_id
    LEFT JOIN user_programs p ON p.id=v.program_id AND p.user_id=c.user_id
    LEFT JOIN cycle_reviews r ON r.cycle_id=c.id AND r.user_id=c.user_id
    WHERE c.user_id=? ${cursor ? 'AND (c.started_at < ? OR (c.started_at=? AND c.id<?))' : ''}
    ORDER BY c.started_at DESC,c.id DESC LIMIT ?;`,
    userId,
    ...(cursor ? [cursor.startedAt, cursor.startedAt, cursor.id] : []),
    pageSize + 1,
  );
  const selected = rows.slice(0, pageSize);
  const last = selected.at(-1);
  return {
    entries: selected.map((row) => ({
      cycle: map(row),
      programTitle: row.program_json ? String(JSON.parse(row.program_json).title) : null,
      reviewUpdatedAt: row.review_updated_at ?? null,
    })),
    nextCursor: rows.length > pageSize && last ? { startedAt: last.started_at, id: last.id } : null,
  };
}
export async function getOwnedCycleReflection(
  db: SQLiteDatabase,
  userId: string,
  selection: unknown,
) {
  const id = requestedCycleId(selection);
  if (id === null) throw new Error('Choose a saved cycle to inspect its reflection.');
  const cycle = await getOwnedTrainingCycle(db, userId, id);
  if (!cycle) return null;
  return { cycle, review: await getCycleReview(db, userId, id) };
}
