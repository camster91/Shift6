import type { SQLiteDatabase } from 'expo-sqlite';
import { runtimeConfig } from '../config/env';
import {
  normalizeObservation,
  validateMeasurementProtocol,
  type MeasurementProtocol,
  type Shift,
  type ShiftObservation,
  type Baseline,
  type ShiftNextChoice,
  type ShiftReviewState,
} from '../domain/shift';

interface GoalRow {
  id: string;
  user_id: string;
  cycle_id: string;
  program_version_id: string;
  block_objective: string;
  target_json: string;
  baseline_state: Baseline['state'];
  baseline_observation_id: string | null;
  review_state: ShiftReviewState;
  next_choice: ShiftNextChoice;
  active_protocol_id: string;
  active_protocol_version: number;
}
const text = (value: string, label: string) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 240)
    throw new Error(`${label} is required and must be at most 240 characters.`);
  return value.trim();
};
const stamp = (value: string) => {
  if (!Number.isFinite(Date.parse(value))) throw new Error('A valid measurement date is required.');
  return new Date(value).toISOString();
};
function guestOnly() {
  if (runtimeConfig.releaseMode !== 'guest-only')
    throw new Error('Personal goals are local-only in this release.');
}
function protocolErrors(p: MeasurementProtocol): string[] {
  const specs: Record<string, [string, string]> = {
    reps: ['reps', 'higher'],
    'load-for-reps': ['kg', 'higher'],
    'hold-duration': ['seconds', 'higher'],
    'fixed-distance-time': ['seconds', 'lower'],
    distance: ['meters', 'higher'],
    completion: ['completed', 'complete'],
  };
  const spec = specs[p.metric];
  if (!spec || p.canonicalUnit !== spec[0] || p.direction !== spec[1])
    return ['Unsupported measurement protocol.'];
  return validateMeasurementProtocol(p);
}
/** Expo's isolated transactions open a new native connection. The build flag
 * enables foreign keys on that connection before BEGIN; changing the pragma
 * inside a transaction would silently have no effect. */
async function personalTransaction(
  db: SQLiteDatabase,
  operation: (tx: SQLiteDatabase) => Promise<void>,
) {
  return db.withExclusiveTransactionAsync(async (tx) => {
    const flags = await tx.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
    if (flags?.foreign_keys !== 1)
      throw new Error('This build cannot save goals safely. Update the native app and try again.');
    await operation(tx);
  });
}
async function ownedRow(db: SQLiteDatabase, owner: string, id: string): Promise<GoalRow> {
  const row = await db.getFirstAsync<GoalRow>(
    "SELECT * FROM shifts WHERE id = ? AND user_id = ? AND template_id='personal-entry-v1';",
    id,
    owner,
  );
  if (!row) throw new Error('This goal is not available for the current user.');
  const cycle = await db.getFirstAsync<{ program_version_id: string }>(
    'SELECT program_version_id FROM training_cycles WHERE id = ? AND user_id = ?;',
    row.cycle_id,
    owner,
  );
  if (!cycle || cycle.program_version_id !== row.program_version_id)
    throw new Error('The goal and training plan no longer match.');
  return row;
}
async function readGoal(db: SQLiteDatabase, row: GoalRow): Promise<Shift> {
  const stored = await db.getFirstAsync<{ snapshot_json: string }>(
    'SELECT snapshot_json FROM shift_protocols WHERE shift_id = ? AND user_id = ? AND protocol_id = ? AND protocol_version = ?;',
    row.id,
    row.user_id,
    row.active_protocol_id,
    row.active_protocol_version,
  );
  if (!stored) throw new Error('The saved measurement setup is unavailable.');
  const protocol = JSON.parse(stored.snapshot_json) as MeasurementProtocol;
  if (protocolErrors(protocol).length) throw new Error('The saved measurement setup is invalid.');
  return {
    id: row.id,
    userId: row.user_id,
    cycleId: row.cycle_id,
    programVersionId: row.program_version_id,
    templateId: 'personal-entry-v1',
    blockObjective: row.block_objective,
    protocol,
    target: JSON.parse(row.target_json),
    baseline:
      row.baseline_state === 'measured'
        ? { state: 'measured', observationId: row.baseline_observation_id! }
        : { state: row.baseline_state },
    reviewState: row.review_state,
    nextChoice: row.next_choice,
  };
}
async function event(
  db: SQLiteDatabase,
  owner: string,
  goal: string,
  id: string,
  kind: string,
  payload: unknown,
  at: string,
) {
  text(id, 'Operation ID');
  const encoded = JSON.stringify(payload);
  const existing = await db.getFirstAsync<{
    user_id: string;
    shift_id: string;
    kind: string;
    payload_json: string;
  }>('SELECT * FROM personal_goal_events WHERE id = ?;', id);
  if (existing) {
    if (
      existing.user_id !== owner ||
      existing.shift_id !== goal ||
      existing.kind !== kind ||
      existing.payload_json !== encoded
    )
      throw new Error('This operation ID has conflicting contents.');
    return false;
  }
  await db.runAsync(
    'INSERT INTO personal_goal_events (id,user_id,shift_id,kind,payload_json,recorded_at) VALUES (?,?,?,?,?,?);',
    id,
    owner,
    goal,
    kind,
    encoded,
    stamp(at),
  );
  return true;
}

export async function getPersonalGoal(
  db: SQLiteDatabase,
  owner: string,
  cycle: string,
): Promise<Shift | null> {
  const row = await db.getFirstAsync<GoalRow>(
    'SELECT * FROM shifts WHERE user_id = ? AND cycle_id = ? AND template_id = ?;',
    owner,
    cycle,
    'personal-entry-v1',
  );
  return row ? readGoal(db, await ownedRow(db, owner, row.id)) : null;
}

/** User-declared target and context, not an approved public training template. */
export async function createPersonalGoal(
  db: SQLiteDatabase,
  owner: string,
  cycleId: string,
  goal: {
    id: string;
    objective: string;
    protocol: MeasurementProtocol;
    target: number | true;
    replacePrimary: boolean;
  },
  at: string,
): Promise<void> {
  guestOnly();
  text(owner, 'Owner');
  text(goal.id, 'Goal ID');
  text(goal.objective, 'Objective');
  if (protocolErrors(goal.protocol).length || goal.protocol.version !== 1)
    throw new Error('The measurement setup is invalid.');
  if (
    goal.protocol.metric === 'completion'
      ? goal.target !== true
      : typeof goal.target !== 'number' ||
        !Number.isFinite(goal.target) ||
        goal.target <= 0 ||
        (goal.protocol.metric === 'reps' && !Number.isInteger(goal.target))
  )
    throw new Error('Enter a valid positive target.');
  await personalTransaction(db, async (tx) => {
    const cycle = await tx.getFirstAsync<{ program_version_id: string; status: string }>(
      'SELECT program_version_id,status FROM training_cycles WHERE id = ? AND user_id = ?;',
      cycleId,
      owner,
    );
    if (!cycle || cycle.status !== 'active')
      throw new Error('Start an owned training plan before creating a goal.');
    const existing = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM shifts WHERE cycle_id = ?;',
      cycleId,
    );
    const payload = {
      objective: goal.objective,
      protocol: goal.protocol,
      target: goal.target,
      cycleId,
      replacePrimary: goal.replacePrimary,
    };
    if (existing) {
      if (existing.id !== goal.id) throw new Error('This training plan already has a goal.');
      await ownedRow(tx, owner, goal.id);
      const creation = await tx.getFirstAsync<{ id: string }>(
        'SELECT id FROM personal_goal_events WHERE id=?;',
        `create:${goal.id}`,
      );
      if (!creation) throw new Error('The goal creation record is unavailable.');
      await event(tx, owner, goal.id, `create:${goal.id}`, 'created', payload, at);
      return;
    }
    const primary = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM shifts WHERE user_id = ? AND is_primary = 1;',
      owner,
    );
    if (primary && !goal.replacePrimary)
      throw new Error('Confirm replacing your current goal; its history will be retained.');
    if (primary)
      await tx.runAsync(
        'UPDATE shifts SET is_primary = 0 WHERE id = ? AND user_id = ?;',
        primary.id,
        owner,
      );
    await tx.runAsync(
      `INSERT INTO shifts (id,user_id,cycle_id,program_version_id,template_id,template_version,block_objective,active_protocol_id,active_protocol_version,target_json,baseline_state,review_state,next_choice,is_primary,created_at) VALUES (?,?,?,?,?,1,?,?,1,?,'deferred','missing','undecided',1,?);`,
      goal.id,
      owner,
      cycleId,
      cycle.program_version_id,
      'personal-entry-v1',
      goal.objective,
      goal.protocol.id,
      JSON.stringify(goal.target),
      stamp(at),
    );
    await tx.runAsync(
      'INSERT INTO shift_protocols (shift_id,user_id,protocol_id,protocol_version,snapshot_json,created_at) VALUES (?,?,?,1,?,?);',
      goal.id,
      owner,
      goal.protocol.id,
      JSON.stringify(goal.protocol),
      stamp(at),
    );
    await event(tx, owner, goal.id, `create:${goal.id}`, 'created', payload, at);
    await tx.runAsync(
      'DELETE FROM personal_goal_drafts WHERE user_id = ? AND cycle_id = ?;',
      owner,
      cycleId,
    );
  });
}

export async function getPersonalObservations(
  db: SQLiteDatabase,
  owner: string,
  id: string,
): Promise<ShiftObservation[]> {
  await ownedRow(db, owner, id);
  const rows = await db.getAllAsync<{
    id: string;
    protocol_id: string;
    protocol_version: number;
    measured_at: string;
    source: ShiftObservation['source'];
    value_json: string;
    unit: ShiftObservation['unit'];
    corrects_observation_id: string | null;
  }>(
    'SELECT * FROM shift_observations WHERE shift_id = ? AND user_id = ? ORDER BY measured_at, rowid;',
    id,
    owner,
  );
  return rows.map((r) => ({
    id: r.id,
    shiftId: id,
    protocolId: r.protocol_id,
    protocolVersion: r.protocol_version,
    measuredAt: r.measured_at,
    source: r.source,
    value: JSON.parse(r.value_json),
    unit: r.unit,
    ...(r.corrects_observation_id ? { correctsObservationId: r.corrects_observation_id } : {}),
  }));
}

export async function appendPersonalObservation(
  db: SQLiteDatabase,
  owner: string,
  observation: ShiftObservation,
  baseline: boolean,
  at: string,
): Promise<void> {
  guestOnly();
  text(observation.id, 'Measurement ID');
  stamp(observation.measuredAt);
  stamp(at);
  if (observation.source !== 'assessment' && observation.source !== 'historical-entry')
    throw new Error('This release records self-entered measurements only.');
  if (Date.parse(observation.measuredAt) > Date.parse(at))
    throw new Error('A measurement cannot be in the future.');
  await personalTransaction(db, async (tx) => {
    const row = await ownedRow(tx, owner, observation.shiftId);
    const goal = await readGoal(tx, row);
    if (!normalizeObservation(goal.protocol, observation))
      throw new Error('Value, unit and setup must match this goal.');
    const payload = { observation, baseline };
    const existing = await tx.getFirstAsync<{ id: string; user_id: string; shift_id: string }>(
      'SELECT id,user_id,shift_id FROM shift_observations WHERE id = ?;',
      observation.id,
    );
    if (existing) {
      if (existing.user_id !== owner || existing.shift_id !== goal.id)
        throw new Error('This measurement ID conflicts with another record.');
      const ledger = await tx.getFirstAsync<{ id: string }>(
        'SELECT id FROM personal_goal_events WHERE id=?;',
        `measurement:${observation.id}`,
      );
      if (!ledger) throw new Error('The original measurement record is unavailable.');
      await event(tx, owner, goal.id, `measurement:${observation.id}`, 'measurement', payload, at);
      return;
    }
    if (observation.correctsObservationId) {
      const parent = await tx.getFirstAsync<{
        protocol_id: string;
        protocol_version: number;
        measured_at: string;
      }>(
        'SELECT * FROM shift_observations WHERE id = ? AND shift_id = ? AND user_id = ?;',
        observation.correctsObservationId,
        goal.id,
        owner,
      );
      if (
        !parent ||
        parent.protocol_id !== observation.protocolId ||
        parent.protocol_version !== observation.protocolVersion ||
        parent.measured_at !== observation.measuredAt
      )
        throw new Error('Corrections must reference the original measurement and setup.');
      const child = await tx.getFirstAsync<{ id: string }>(
        'SELECT id FROM shift_observations WHERE corrects_observation_id = ?;',
        observation.correctsObservationId,
      );
      if (child)
        throw new Error('This measurement was already corrected; correct the latest entry.');
    }
    await tx.runAsync(
      'INSERT INTO shift_observations (id,shift_id,user_id,protocol_id,protocol_version,measured_at,recorded_at,source,value_json,unit,corrects_observation_id) VALUES (?,?,?,?,?,?,?,?,?,?,?);',
      observation.id,
      goal.id,
      owner,
      observation.protocolId,
      observation.protocolVersion,
      stamp(observation.measuredAt),
      stamp(at),
      observation.source,
      JSON.stringify(observation.value),
      observation.unit,
      observation.correctsObservationId ?? null,
    );
    if (baseline)
      await tx.runAsync(
        "UPDATE shifts SET baseline_state='measured',baseline_observation_id=? WHERE id=? AND user_id=?;",
        observation.id,
        goal.id,
        owner,
      );
    await event(tx, owner, goal.id, `measurement:${observation.id}`, 'measurement', payload, at);
  });
}

export async function setPersonalBaselineState(
  db: SQLiteDatabase,
  owner: string,
  id: string,
  state: 'deferred' | 'not-yet-able',
  operation: string,
  at: string,
) {
  guestOnly();
  await personalTransaction(db, async (tx) => {
    await ownedRow(tx, owner, id);
    if (await event(tx, owner, id, operation, 'baseline-state', { state }, at))
      await tx.runAsync(
        'UPDATE shifts SET baseline_state=?,baseline_observation_id=NULL WHERE id=? AND user_id=?;',
        state,
        id,
        owner,
      );
  });
}

export async function revisePersonalTarget(
  db: SQLiteDatabase,
  owner: string,
  id: string,
  target: number | true,
  reason: string,
  operation: string,
  at: string,
) {
  guestOnly();
  text(reason, 'Reason');
  await personalTransaction(db, async (tx) => {
    const goal = await readGoal(tx, await ownedRow(tx, owner, id));
    if (
      goal.protocol.metric === 'completion'
        ? target !== true
        : typeof target !== 'number' ||
          !Number.isFinite(target) ||
          target <= 0 ||
          (goal.protocol.metric === 'reps' && !Number.isInteger(target))
    )
      throw new Error('Enter a valid positive target.');
    if (!(await event(tx, owner, id, operation, 'target-revision', { target, reason }, at))) return;
    const previous = await tx.getFirstAsync<{ id: string }>(
      'SELECT id FROM shift_goal_revisions WHERE shift_id=? AND user_id=? ORDER BY rowid DESC LIMIT 1;',
      id,
      owner,
    );
    await tx.runAsync(
      'INSERT INTO shift_goal_revisions (id,shift_id,user_id,previous_revision_id,protocol_id,protocol_version,target_json,block_objective,reason,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?);',
      operation,
      id,
      owner,
      previous?.id ?? null,
      goal.protocol.id,
      goal.protocol.version,
      JSON.stringify(target),
      goal.blockObjective,
      reason,
      stamp(at),
    );
    await tx.runAsync(
      'UPDATE shifts SET target_json=? WHERE id=? AND user_id=?;',
      JSON.stringify(target),
      id,
      owner,
    );
  });
}

export async function savePersonalReview(
  db: SQLiteDatabase,
  owner: string,
  id: string,
  state: ShiftReviewState,
  choice: ShiftNextChoice,
  operation: string,
  at: string,
) {
  guestOnly();
  if (
    !['completed', 'declined', 'postponed'].includes(state) ||
    !['maintain', 'repeat', 'modify', 'new-goal', 'break', 'undecided'].includes(choice)
  )
    throw new Error('Choose a valid review and next step.');
  await personalTransaction(db, async (tx) => {
    const goal = await readGoal(tx, await ownedRow(tx, owner, id));
    if (
      await event(
        tx,
        owner,
        id,
        operation,
        'review',
        { state, choice, target: goal.target, baseline: goal.baseline, protocol: goal.protocol },
        at,
      )
    )
      await tx.runAsync(
        'UPDATE shifts SET review_state=?,next_choice=? WHERE id=? AND user_id=?;',
        state,
        choice,
        id,
        owner,
      );
  });
}

export async function savePersonalGoalDraft(
  db: SQLiteDatabase,
  owner: string,
  cycle: string,
  fields: Record<string, string>,
) {
  guestOnly();
  const owned = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM training_cycles WHERE id=? AND user_id=?;',
    cycle,
    owner,
  );
  if (!owned) throw new Error('The training plan is unavailable.');
  await db.runAsync(
    'INSERT INTO personal_goal_drafts (user_id,cycle_id,fields_json) VALUES (?,?,?) ON CONFLICT(user_id,cycle_id) DO UPDATE SET fields_json=excluded.fields_json;',
    owner,
    cycle,
    JSON.stringify(fields),
  );
}
export async function getPersonalGoalDraft(
  db: SQLiteDatabase,
  owner: string,
  cycle: string,
): Promise<Record<string, string> | null> {
  const row = await db.getFirstAsync<{ fields_json: string }>(
    'SELECT fields_json FROM personal_goal_drafts WHERE user_id=? AND cycle_id=?;',
    owner,
    cycle,
  );
  if (!row) return null;
  try {
    const value = JSON.parse(row.fields_json);
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.values(value).every((v) => typeof v === 'string' && v.length <= 240)
      ? value
      : null;
  } catch {
    return null;
  }
}
