import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CheckInRating,
  CycleReview,
  CycleReviewAction,
  CycleReviewFocus,
} from '../domain/types';

interface CycleReviewRow {
  id: string;
  user_id: string;
  cycle_id: string;
  overall_rating: number | null;
  focus: string | null;
  next_action: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Stores the user's end-of-cycle reflection separately from derived facts.
 * The reflection is replaceable for the same cycle and syncs with one stable
 * idempotency key, so editing feedback cannot create duplicate records.
 */
export async function saveCycleReview(
  database: SQLiteDatabase,
  review: CycleReview,
): Promise<void> {
  if (!review.id.trim() || !review.userId.trim() || !review.cycleId.trim()) {
    throw new Error('A cycle review needs stable user, cycle, and review IDs.');
  }
  if (review.note && review.note.length > 2_000) {
    throw new Error('Cycle review notes must be 2,000 characters or fewer.');
  }

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO cycle_reviews
        (id, user_id, cycle_id, overall_rating, focus, next_action, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cycle_id) DO UPDATE SET
         id = excluded.id,
         user_id = excluded.user_id,
         overall_rating = excluded.overall_rating,
         focus = excluded.focus,
         next_action = excluded.next_action,
         note = excluded.note,
         updated_at = excluded.updated_at;`,
      review.id,
      review.userId,
      review.cycleId,
      review.overallRating ?? null,
      review.focus ?? null,
      review.nextAction ?? null,
      review.note ?? null,
      review.createdAt,
      review.updatedAt,
    );
    await database.runAsync(
      `INSERT INTO sync_outbox
        (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(idempotency_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         created_at = excluded.created_at,
         last_error = NULL;`,
      `outbox-cycle-review-${review.id}`,
      `cycle-review:${review.id}`,
      'cycle-review',
      review.id,
      JSON.stringify(review),
      review.updatedAt,
    );
  });
}

export async function getCycleReview(
  database: SQLiteDatabase,
  userId: string,
  cycleId: string,
): Promise<CycleReview | null> {
  const row = await database.getFirstAsync<CycleReviewRow>(
    `SELECT id, user_id, cycle_id, overall_rating, focus, next_action, note, created_at, updated_at
       FROM cycle_reviews
      WHERE user_id = ? AND cycle_id = ?
      LIMIT 1;`,
    userId,
    cycleId,
  );

  return row ? mapCycleReview(row) : null;
}

function mapCycleReview(row: CycleReviewRow): CycleReview {
  return {
    id: row.id,
    userId: row.user_id,
    cycleId: row.cycle_id,
    overallRating: asRating(row.overall_rating),
    focus: asFocus(row.focus),
    nextAction: asAction(row.next_action),
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asRating(value: number | null): CheckInRating | undefined {
  return value !== null && value >= 1 && value <= 5 ? (value as CheckInRating) : undefined;
}

function asFocus(value: string | null): CycleReviewFocus | undefined {
  return value && cycleReviewFocuses.includes(value as CycleReviewFocus)
    ? (value as CycleReviewFocus)
    : undefined;
}

function asAction(value: string | null): CycleReviewAction | undefined {
  return value && cycleReviewActions.includes(value as CycleReviewAction)
    ? (value as CycleReviewAction)
    : undefined;
}

const cycleReviewFocuses: readonly CycleReviewFocus[] = [
  'same-course',
  'more-strength',
  'more-conditioning',
  'more-mobility',
  'improve-consistency',
  'recover-better',
];

const cycleReviewActions: readonly CycleReviewAction[] = [
  'repeat',
  'progress',
  'adjust',
  'change-exercises',
  'change-program',
  'build-new',
];
