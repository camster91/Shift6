import type { SQLiteDatabase } from 'expo-sqlite';
import { runtimeConfig } from '../config/env';
import { getOwnedTrainingCycle } from './cycleHistoryRepository';
import { getUserProgramVersion } from './programRepository';
import { getPersonalGoal, getPersonalObservations } from './personalGoalRepository';
import {
  prepareCoachReview,
  confirmCoachReviewChoice,
  type CoachReviewPreview,
  type CoachReviewWindow,
} from '../domain/coachReview';
import { parseCoachReviewReceipt, type CoachReviewReceipt } from '../domain/coachReviewJournal';
import { stableSnapshotJSON } from '../domain/programPersistence';
import type { WorkoutSession } from '../domain/types';

interface JournalRow {
  id: string;
  user_id: string;
  cycle_id: string;
  program_version_id: string;
  previous_review_id: string | null;
  confirmed_at: string;
  receipt_json: string;
}
export interface SavedCoachReview {
  id: string;
  previousReviewId: string | null;
  receipt: CoachReviewReceipt;
}
function guestOnly() {
  if (runtimeConfig.releaseMode !== 'guest-only')
    throw new Error('Dated Coach reviews are local-only in this release.');
}
async function currentSnapshot(
  tx: SQLiteDatabase,
  owner: string,
  cycleId: string,
  window: CoachReviewWindow,
  now: string,
) {
  const cycle = await getOwnedTrainingCycle(tx, owner, cycleId);
  if (!cycle) throw new Error('This review cycle is unavailable for this person.');
  const version = await getUserProgramVersion(tx, owner, cycle.programVersionId);
  if (!version || version.version.id !== cycle.programVersionId)
    throw new Error('The owned source version is unavailable.');
  const rows = await tx.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM workout_sessions WHERE cycle_id=? ORDER BY started_at,id LIMIT 1001;',
    cycle.id,
  );
  const sessions: WorkoutSession[] = rows.map((row) => ({
    id: String(row.id),
    cycleId: String(row.cycle_id),
    programVersionId: String(row.program_version_id),
    workoutId: String(row.workout_id),
    cycleWeek: Number(row.cycle_week),
    status: row.status as WorkoutSession['status'],
    startedAt: String(row.started_at),
    workoutFocus: row.workout_focus as WorkoutSession['workoutFocus'],
    isOffline: row.is_offline === 1,
    ...(row.completed_at ? { completedAt: String(row.completed_at) } : {}),
    ...(row.completion_reason
      ? { completionReason: row.completion_reason as WorkoutSession['completionReason'] }
      : {}),
    ...(row.readiness ? { readiness: row.readiness as WorkoutSession['readiness'] } : {}),
  }));
  const goal = await getPersonalGoal(tx, owner, cycle.id);
  const count = goal
    ? await tx.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM shift_observations WHERE shift_id=? AND user_id=?;',
        goal.id,
        owner,
      )
    : null;
  if (count && count.count > 1000)
    throw new Error('This review needs a smaller canonical goal packet.');
  const observations = goal ? await getPersonalObservations(tx, owner, goal.id) : [];
  return prepareCoachReview({
    ownerId: owner,
    cycle,
    programVersionId: cycle.programVersionId,
    now,
    window,
    sessions,
    goal,
    observations,
  });
}
function saved(row: JournalRow): SavedCoachReview {
  const { receipt } = parseCoachReviewReceipt(row.receipt_json);
  if (
    receipt.ownerId !== row.user_id ||
    receipt.cycleId !== row.cycle_id ||
    receipt.programVersionId !== row.program_version_id ||
    receipt.confirmedAt !== row.confirmed_at
  )
    throw new Error('The saved review receipt binding is unavailable.');
  return { id: row.id, previousReviewId: row.previous_review_id, receipt };
}
export async function loadDatedCoachReview(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
  window: CoachReviewWindow,
  now: string,
) {
  guestOnly();
  let result: Awaited<ReturnType<typeof currentSnapshot>> | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await currentSnapshot(tx, owner, cycleId, window, now);
  });
  if (!result) throw new Error('Local review could not be read.');
  return result;
}
export async function getSavedCoachReviews(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
  limit = 20,
) {
  guestOnly();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Choose a bounded review history page.');
  if (!(await getOwnedTrainingCycle(db, owner, cycleId)))
    throw new Error('This review cycle is unavailable.');
  const rows = await db.getAllAsync<JournalRow>(
    'SELECT * FROM coach_review_journal WHERE user_id=? AND cycle_id=? ORDER BY rowid DESC LIMIT ?;',
    owner,
    cycleId,
    limit,
  );
  return rows.map(saved);
}
/** Records a dated user choice only. Opening/applying the next workflow is separate. */
export async function confirmDatedCoachReview(
  db: SQLiteDatabase,
  preview: CoachReviewPreview,
  operationId: string,
  expectedPreviousId: string | null,
  confirmedAt: string,
  confirmed: true,
  isCurrent: () => boolean = () => true,
) {
  guestOnly();
  if (
    confirmed !== true ||
    !operationId.trim() ||
    operationId.length > 1024 ||
    /[\u0000-\u001f]/.test(operationId)
  )
    throw new Error('Confirm a valid local review operation.');
  preview = JSON.parse(stableSnapshotJSON(preview)) as CoachReviewPreview;
  let result: SavedCoachReview | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    if (!isCurrent()) throw new Error('Review context changed.');
    const existing = await tx.getFirstAsync<JournalRow>(
      'SELECT * FROM coach_review_journal WHERE id=?;',
      operationId,
    );
    if (existing) {
      const prior = saved(existing);
      const { receipt } = prior;
      if (
        existing.user_id !== preview.ownerId ||
        existing.previous_review_id !== expectedPreviousId ||
        stableSnapshotJSON({
          ownerId: receipt.ownerId,
          cycleId: receipt.cycleId,
          programVersionId: receipt.programVersionId,
          preparedAt: receipt.preparedAt,
          window: receipt.window,
          evidenceFingerprint: receipt.evidenceFingerprint,
          choice: receipt.choice,
          response: receipt.response,
          effect: receipt.effect,
        }) !== stableSnapshotJSON(preview)
      )
        throw new Error('Review operation identity was reused with different confirmed details.');
      if (!isCurrent()) throw new Error('Review context changed.');
      result = prior;
      return;
    }
    const latest = await tx.getFirstAsync<JournalRow>(
      'SELECT * FROM coach_review_journal WHERE user_id=? AND cycle_id=? ORDER BY rowid DESC LIMIT 1;',
      preview.ownerId,
      preview.cycleId,
    );
    if (
      (latest?.id ?? null) !== expectedPreviousId ||
      (latest && confirmedAt < latest.confirmed_at)
    )
      throw new Error('Saved review history changed. Reload before confirming.');
    const count = await tx.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM coach_review_journal WHERE cycle_id=?;',
      preview.cycleId,
    );
    if (count && count.count >= 1000)
      throw new Error('This local cycle review journal reached its limit.');
    const fresh = await currentSnapshot(
      tx,
      preview.ownerId,
      preview.cycleId,
      preview.window,
      confirmedAt,
    );
    const receipt = confirmCoachReviewChoice(preview, fresh, confirmedAt, confirmed);
    const serialized = stableSnapshotJSON(receipt);
    parseCoachReviewReceipt(serialized);
    await tx.runAsync(
      'INSERT INTO coach_review_journal (id,user_id,cycle_id,program_version_id,previous_review_id,confirmed_at,receipt_json) VALUES (?,?,?,?,?,?,?);',
      operationId,
      preview.ownerId,
      preview.cycleId,
      preview.programVersionId,
      expectedPreviousId,
      confirmedAt,
      serialized,
    );
    const readback = await tx.getFirstAsync<JournalRow>(
      'SELECT * FROM coach_review_journal WHERE id=? AND user_id=?;',
      operationId,
      preview.ownerId,
    );
    if (!readback || readback.receipt_json !== serialized || !isCurrent())
      throw new Error('Review receipt could not be confirmed in the current context.');
    result = saved(readback);
  });
  if (!result) throw new Error('The local review transaction did not complete.');
  return result;
}
