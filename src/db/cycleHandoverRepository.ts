import type { SQLiteDatabase } from 'expo-sqlite';
import { runtimeConfig } from '../config/env';
import { getOwnedTrainingCycle } from './cycleHistoryRepository';
import { getUserProgramVersion, saveProgramVersionInTransaction } from './programRepository';
import {
  getPersonalGoal,
  getPersonalObservations,
  createPersonalGoalInTransaction,
  savePersonalReviewInTransaction,
} from './personalGoalRepository';
import { getCycleReview, saveCycleReviewInTransaction } from './cycleReviewRepository';
import { saveTrainingCycleWithScheduleInTransaction } from './cycleRepository';
import { createNextCycleCopy } from '../domain/programBuilder';
import { createTrainingCycle } from '../domain/cycle';
import { stableSnapshotJSON } from '../domain/programPersistence';
import {
  corroborateReviewGoal,
  type ReviewGoalEvent,
  type ReviewTargetRevision,
} from '../domain/coachReviewGoalWitness';
import { lifecycleDate } from '../domain/cycleLifecycle';
import {
  parseCycleHandoverRequest,
  sortHandoverSessions,
  type CycleHandoverRequest,
  type CycleHandoverReceipt,
  type HandoverSource,
  type HandoverSession,
} from '../domain/cycleHandover';

/** Recover only the receipt bound to this owned source or destination cycle. */
export async function getCycleHandoverReceipt(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
): Promise<CycleHandoverReceipt | null> {
  guestOnly();
  const cycle = await getOwnedTrainingCycle(db, owner, cycleId);
  if (!cycle) return null;
  const row = await db.getFirstAsync<{
    id: string;
    user_id: string;
    source_cycle_id: string;
    destination_cycle_id: string;
    source_program_version_id: string;
    destination_program_version_id: string;
    source_goal_id: string | null;
    destination_goal_id: string | null;
    request_json: string;
    confirmed_at: string;
  }>(
    'SELECT * FROM cycle_handovers WHERE user_id=? AND (source_cycle_id=? OR destination_cycle_id=?) ORDER BY confirmed_at DESC LIMIT 1;',
    owner,
    cycleId,
    cycleId,
  );
  if (!row) return null;
  const request = parseCycleHandoverRequest(row.request_json);
  if (
    row.user_id !== owner ||
    request.userId !== owner ||
    row.id !== request.operationId ||
    row.source_cycle_id !== request.source.cycle.id ||
    row.destination_cycle_id !== request.destination.cycleId ||
    row.source_program_version_id !== request.source.version.id ||
    row.destination_program_version_id !== request.destination.versionId ||
    row.source_goal_id !== (request.source.goal?.id ?? null) ||
    row.destination_goal_id !== request.destination.goalId ||
    (cycleId !== row.source_cycle_id && cycleId !== row.destination_cycle_id) ||
    new Date(row.confirmed_at).toISOString() !== row.confirmed_at ||
    Date.parse(row.confirmed_at) < Date.parse(request.preparedAt)
  )
    throw new Error('Saved handover does not match its owned cycle record.');
  const source = await getOwnedTrainingCycle(db, owner, row.source_cycle_id);
  const destination = await getOwnedTrainingCycle(db, owner, row.destination_cycle_id);
  if (
    !source ||
    !destination ||
    source.programVersionId !== row.source_program_version_id ||
    destination.programVersionId !== row.destination_program_version_id
  )
    throw new Error('Saved handover cycles are unavailable.');
  return { request, confirmedAt: row.confirmed_at };
}

function guestOnly() {
  if (runtimeConfig.releaseMode !== 'guest-only')
    throw new Error('Cycle handover is local-only in this release.');
}
async function ready(tx: SQLiteDatabase) {
  const flags = await tx.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
  if (flags?.foreign_keys !== 1) throw new Error('Handover requires verified foreign keys.');
}
async function sourceSnapshot(
  tx: SQLiteDatabase,
  owner: string,
  cycleId: string,
  now: string,
): Promise<HandoverSource> {
  const cycle = await getOwnedTrainingCycle(tx, owner, cycleId);
  if (!cycle) throw new Error('The owned handover cycle is unavailable.');
  const snapshot = await getUserProgramVersion(tx, owner, cycle.programVersionId);
  if (!snapshot) throw new Error('The saved private handover plan is unavailable.');
  const goal = await getPersonalGoal(tx, owner, cycleId);
  const events = goal
    ? await tx.getAllAsync<ReviewGoalEvent>(
        'SELECT * FROM personal_goal_events WHERE user_id=? AND shift_id=? ORDER BY rowid LIMIT 1001;',
        owner,
        goal.id,
      )
    : [];
  const revisions = goal
    ? await tx.getAllAsync<ReviewTargetRevision>(
        'SELECT * FROM shift_goal_revisions WHERE user_id=? AND shift_id=? ORDER BY rowid LIMIT 1001;',
        owner,
        goal.id,
      )
    : [];
  const observations = goal ? await getPersonalObservations(tx, owner, goal.id) : [];
  const goalWitness = goal
    ? corroborateReviewGoal(goal, events, revisions, now, undefined, observations)
    : null;
  const primary = await tx.getFirstAsync<{ id: string }>(
    'SELECT id FROM shifts WHERE user_id=? AND is_primary=1;',
    owner,
  );
  const active = await tx.getAllAsync<{ id: string }>(
    "SELECT id FROM training_cycles WHERE user_id=? AND status='active' ORDER BY id;",
    owner,
  );
  const pending = await tx.getFirstAsync(
    "SELECT s.id FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id WHERE c.user_id=? AND s.status='in-progress' LIMIT 1;",
    owner,
  );
  if (pending) throw new Error('Finish or save pending sessions before handover.');
  const sessions = await tx.getAllAsync<HandoverSession>(
    'SELECT id,cycle_week,workout_id,program_version_id,status,started_at,completed_at FROM workout_sessions WHERE cycle_id=? ORDER BY id LIMIT 1001;',
    cycle.id,
  );
  const reflection = await getCycleReview(tx, owner, cycle.id);
  return {
    cycle,
    program: snapshot.program,
    version: snapshot.version,
    goal,
    goalWitness,
    primaryGoalId: primary?.id ?? null,
    activeCycleIds: active.map((row) => row.id),
    sessions: sortHandoverSessions(sessions),
    latestGoalRevisionId: revisions.at(-1)?.id ?? null,
    latestReflectionId: reflection?.id ?? null,
  };
}
export async function prepareCycleHandover(
  db: SQLiteDatabase,
  owner: string,
  sourceCycleId: string,
  options: Omit<CycleHandoverRequest, 'format' | 'userId' | 'source'>,
): Promise<CycleHandoverRequest> {
  guestOnly();
  let request!: CycleHandoverRequest;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await ready(tx);
    const source = await sourceSnapshot(tx, owner, sourceCycleId, options.preparedAt);
    request = parseCycleHandoverRequest(
      stableSnapshotJSON({ ...options, format: 'local-cycle-handover-v1', userId: owner, source }),
    );
  });
  return request;
}
/** Inactive until a separately reviewed UI offers this exact frozen confirmation. */
export async function confirmCycleHandover(
  db: SQLiteDatabase,
  owner: string,
  preview: CycleHandoverRequest,
  guards: { isOwnerCurrent: () => boolean; isContextCurrent?: () => boolean },
  confirmedAt = new Date().toISOString(),
): Promise<CycleHandoverReceipt> {
  guestOnly();
  if (typeof guards?.isOwnerCurrent !== 'function')
    throw new Error('A trusted current-owner guard is required.');
  const assertOwnerCurrent = () => {
    if (!guards.isOwnerCurrent()) throw new Error('The current handover owner changed.');
  };
  const isCurrent = () => guards.isOwnerCurrent() && (guards.isContextCurrent?.() ?? true);
  assertOwnerCurrent();
  const request = parseCycleHandoverRequest(stableSnapshotJSON(preview));
  if (request.userId !== owner) throw new Error('Handover ownership changed.');
  const requestJSON = stableSnapshotJSON(request);
  let result!: CycleHandoverReceipt;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await ready(tx);
    assertOwnerCurrent();
    // An exact committed retry is read-only, even when its former source has changed.
    const receipt = await tx.getFirstAsync<{ request_json: string; confirmed_at: string }>(
      'SELECT request_json,confirmed_at FROM cycle_handovers WHERE user_id=? AND id=?;',
      request.userId,
      request.operationId,
    );
    assertOwnerCurrent();
    if (receipt) {
      if (stableSnapshotJSON(parseCycleHandoverRequest(receipt.request_json)) !== requestJSON)
        throw new Error('This handover operation was already used for different details.');
      result = {
        request: parseCycleHandoverRequest(receipt.request_json),
        confirmedAt: receipt.confirmed_at,
      };
      assertOwnerCurrent();
      return;
    }
    if (
      new Date(confirmedAt).toISOString() !== confirmedAt ||
      !isCurrent() ||
      Date.parse(confirmedAt) < Date.parse(request.preparedAt) ||
      lifecycleDate(confirmedAt, request.destination.timeZone) !== request.destination.startDate
    )
      throw new Error('Handover context or date changed. Review again.');
    const fresh = await sourceSnapshot(tx, request.userId, request.source.cycle.id, confirmedAt);
    if (stableSnapshotJSON(fresh) !== stableSnapshotJSON(request.source))
      throw new Error('Source plan, goal or saved records changed. Review handover again.');
    const destinations: Array<[string, string]> = [
      ['training_cycles', request.destination.cycleId],
      ['user_programs', request.destination.programId],
      ['user_program_versions', request.destination.versionId],
      ...(request.destination.goalId
        ? [['shifts', request.destination.goalId] as [string, string]]
        : []),
    ];
    for (const [table, id] of destinations)
      if (await tx.getFirstAsync(`SELECT id FROM ${table} WHERE id=?;`, id))
        throw new Error('A destination identity is already used.');
    const copy = createNextCycleCopy({
      sourceProgram: request.source.program,
      sourceVersion: request.source.version,
      userId: request.userId,
      newProgramId: request.destination.programId,
      newVersionId: request.destination.versionId,
      createdAt: request.destination.startedAt,
    });
    const cycle = createTrainingCycle({
      id: request.destination.cycleId,
      userId: request.userId,
      programVersion: copy.version,
      startedAt: request.destination.startedAt,
    });
    if (request.source.goal)
      await savePersonalReviewInTransaction(
        tx,
        request.userId,
        request.source.goal.id,
        request.personalReviewState,
        request.choice === 'continue-goal' ? 'repeat' : 'undecided',
        `${request.operationId}-goal-review`,
        confirmedAt,
      );
    await saveCycleReviewInTransaction(tx, request.reflection);
    await saveProgramVersionInTransaction(tx, request.userId, copy.program, copy.version);
    await saveTrainingCycleWithScheduleInTransaction(
      tx,
      cycle,
      copy.version,
      request.destination.timeZone,
      request.destination.startDate,
      isCurrent,
    );
    if (request.choice === 'continue-goal' && request.source.goal)
      await createPersonalGoalInTransaction(
        tx,
        request.userId,
        cycle.id,
        {
          id: request.destination.goalId!,
          objective: request.source.goal.blockObjective,
          protocol: request.source.goal.protocol,
          target: request.source.goal.target,
          replacePrimary: true,
        },
        confirmedAt,
      );
    else if (request.source.primaryGoalId) {
      const changed = await tx.runAsync(
        'UPDATE shifts SET is_primary=0 WHERE id=? AND user_id=? AND is_primary=1;',
        request.source.primaryGoalId,
        request.userId,
      );
      if (changed.changes !== 1) throw new Error('The primary goal changed before handover.');
    }
    if (!isCurrent()) throw new Error('Handover context changed before commit.');
    await tx.runAsync(
      'INSERT INTO cycle_handovers (id,user_id,source_cycle_id,destination_cycle_id,source_program_version_id,destination_program_version_id,source_goal_id,destination_goal_id,confirmed_at,request_json) VALUES (?,?,?,?,?,?,?,?,?,?);',
      request.operationId,
      request.userId,
      request.source.cycle.id,
      cycle.id,
      request.source.version.id,
      copy.version.id,
      request.source.goal?.id ?? null,
      request.destination.goalId,
      confirmedAt,
      requestJSON,
    );
    const saved = await tx.getFirstAsync<{ request_json: string; confirmed_at: string }>(
      'SELECT request_json,confirmed_at FROM cycle_handovers WHERE id=? AND user_id=?;',
      request.operationId,
      request.userId,
    );
    if (
      !saved ||
      saved.request_json !== requestJSON ||
      saved.confirmed_at !== confirmedAt ||
      !isCurrent()
    )
      throw new Error('Handover readback failed.');
    result = { request, confirmedAt };
  });
  assertOwnerCurrent();
  return result;
}
