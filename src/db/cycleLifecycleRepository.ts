import type { SQLiteDatabase } from 'expo-sqlite';
import type { CycleLifecycleEvent } from '../domain/localPersistence';
import { lifecycleDate, summarizeLifecycle } from '../domain/cycleLifecycle';
import { parseDateKey } from '../domain/calendar';

interface EventRow {
  id: string;
  user_id: string;
  cycle_id: string;
  kind: CycleLifecycleEvent['kind'];
  effective_date: string;
  time_zone: string;
  previous_event_id: string | null;
  operation_id: string;
  recorded_at: string;
}
export async function getCycleLifecycleEvents(
  db: SQLiteDatabase,
  userId: string,
  cycleId: string,
): Promise<CycleLifecycleEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    'SELECT * FROM cycle_lifecycle_events WHERE user_id=? AND cycle_id=?;',
    userId,
    cycleId,
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    cycleId: row.cycle_id,
    kind: row.kind,
    effectiveDate: row.effective_date,
    timeZone: row.time_zone,
    previousEventId: row.previous_event_id,
    operationId: row.operation_id,
    recordedAt: row.recorded_at,
  }));
}

export async function appendCycleLifecycleEvent(
  db: SQLiteDatabase,
  event: CycleLifecycleEvent,
): Promise<CycleLifecycleEvent> {
  let result = event;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await appendCycleLifecycleEventInTransaction(tx, event);
  });
  return result;
}

/** Caller already owns an exclusive transaction; no nested transaction. */
export async function appendCycleLifecycleEventInTransaction(
  db: SQLiteDatabase,
  event: CycleLifecycleEvent,
): Promise<CycleLifecycleEvent> {
  for (const value of [event.id, event.userId, event.cycleId, event.operationId])
    if (!value.trim() || value.length > 1024 || /[\u0000-\u001f]/.test(value))
      throw new Error('A valid cycle operation is required.');
  if (!['pause', 'resume', 'review-date'].includes(event.kind))
    throw new Error('Choose a supported cycle action.');
  if (!/^\d{4}-\d\d-\d\dT/.test(event.recordedAt) || !Number.isFinite(Date.parse(event.recordedAt)))
    throw new Error('Use a valid recorded timestamp.');
  if (!event.timeZone || event.timeZone.length > 100) throw new Error('Use a supported time zone.');
  parseDateKey(event.effectiveDate);
  const today = lifecycleDate(event.recordedAt, event.timeZone);
  const existing = await db.getFirstAsync<EventRow>(
    'SELECT * FROM cycle_lifecycle_events WHERE user_id=? AND operation_id=?;',
    event.userId,
    event.operationId,
  );
  if (existing) {
    const expected: EventRow = {
      id: event.id,
      user_id: event.userId,
      cycle_id: event.cycleId,
      kind: event.kind,
      effective_date: event.effectiveDate,
      time_zone: event.timeZone,
      previous_event_id: event.previousEventId,
      operation_id: event.operationId,
      recorded_at: event.recordedAt,
    };
    if (
      Object.keys(expected).some(
        (key) => existing[key as keyof EventRow] !== expected[key as keyof EventRow],
      )
    )
      throw new Error('This operation was already used for different details.');
    return event;
  }
  const cycle = await db.getFirstAsync<{ status: string; started_at: string }>(
    'SELECT status,started_at FROM training_cycles WHERE id=? AND user_id=?;',
    event.cycleId,
    event.userId,
  );
  if (!cycle) throw new Error('This cycle is no longer available for this person.');
  if (event.effectiveDate < lifecycleDate(cycle.started_at, event.timeZone))
    throw new Error('The date cannot precede the cycle start.');
  if (event.kind !== 'review-date' && event.effectiveDate !== today)
    throw new Error('Pause and resume record today’s confirmed action.');
  if (event.kind === 'review-date' && event.effectiveDate < today)
    throw new Error('Choose today or a future review date.');
  const summary = summarizeLifecycle(
    await getCycleLifecycleEvents(db, event.userId, event.cycleId),
  );
  if ((summary.latest?.id ?? null) !== event.previousEventId)
    throw new Error('Cycle history changed. Reload before confirming.');
  if (
    summary.latest &&
    (summary.latest.timeZone !== event.timeZone ||
      Date.parse(event.recordedAt) < Date.parse(summary.latest.recordedAt))
  )
    throw new Error('The cycle time anchor changed. Reload before confirming.');
  const lastTransition = summary.ordered.filter((entry) => entry.kind !== 'review-date').at(-1);
  if (event.kind === 'pause' && (cycle.status !== 'active' || lastTransition?.kind === 'pause'))
    throw new Error('Only an active cycle can be paused.');
  if (event.kind === 'resume') {
    if (cycle.status !== 'paused') throw new Error('Only a paused cycle can be resumed.');
    if (lastTransition?.kind === 'resume' || (!lastTransition && summary.latest))
      throw new Error('Pause timing is unknown; this history needs review before resuming.');
    const active = await db.getFirstAsync(
      "SELECT id FROM training_cycles WHERE user_id=? AND status='active' AND id!=? LIMIT 1;",
      event.userId,
      event.cycleId,
    );
    if (active)
      throw new Error('Another cycle is active. Pause it explicitly before resuming this cycle.');
  }
  if (event.kind === 'review-date' && !['active', 'paused', 'complete'].includes(cycle.status))
    throw new Error('This cycle cannot receive a review date.');
  if (event.kind === 'review-date' && cycle.status === 'paused' && !lastTransition)
    throw new Error('Resume this legacy paused cycle first; its pause start is unknown.');
  await db.runAsync(
    'INSERT INTO cycle_lifecycle_events (id,user_id,cycle_id,kind,effective_date,time_zone,previous_event_id,operation_id,recorded_at) VALUES (?,?,?,?,?,?,?,?,?);',
    event.id,
    event.userId,
    event.cycleId,
    event.kind,
    event.effectiveDate,
    event.timeZone,
    event.previousEventId,
    event.operationId,
    event.recordedAt,
  );
  if (event.kind !== 'review-date') {
    const change = await db.runAsync(
      'UPDATE training_cycles SET status=? WHERE id=? AND user_id=? AND status=?;',
      event.kind === 'pause' ? 'paused' : 'active',
      event.cycleId,
      event.userId,
      cycle.status,
    );
    if (change.changes !== 1)
      throw new Error('The cycle changed before this action could be saved.');
  }
  return event;
}

/** Records only actual active→paused changes caused by a newly saved cycle. */
export async function pauseOtherCyclesInTransaction(
  db: SQLiteDatabase,
  userId: string,
  newCycleId: string,
  recordedAt = new Date().toISOString(),
): Promise<void> {
  const active = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM training_cycles WHERE user_id=? AND status='active' AND id!=?;",
    userId,
    newCycleId,
  );
  for (const cycle of active) {
    const summary = summarizeLifecycle(await getCycleLifecycleEvents(db, userId, cycle.id));
    const timeZone = summary.latest?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    await appendCycleLifecycleEventInTransaction(db, {
      id: `lifecycle-start-${newCycleId}-${cycle.id}`,
      userId,
      cycleId: cycle.id,
      kind: 'pause',
      effectiveDate: lifecycleDate(recordedAt, timeZone),
      timeZone,
      previousEventId: summary.latest?.id ?? null,
      operationId: `start-cycle-${newCycleId}-${cycle.id}`,
      recordedAt,
    });
  }
}
