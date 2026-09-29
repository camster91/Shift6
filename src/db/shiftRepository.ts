import type { SQLiteDatabase } from 'expo-sqlite';

import {
  normalizeObservation,
  validateMeasurementProtocol,
  type MeasurementProtocol,
  type Shift,
  type ShiftObservation,
} from '../domain/shift';

export interface CreateShiftOptions {
  templateVersion: number;
  isPrimary?: boolean;
  createdAt: string;
  baselineObservation?: ShiftObservation;
}

export interface AppendObservationOptions {
  recordedAt: string;
  workoutSessionId?: string;
}

interface CycleRow {
  id: string;
  user_id: string;
  program_version_id: string;
}

interface ProtocolRow {
  snapshot_json: string;
}

interface ObservationRow {
  id: string;
  shift_id: string;
  user_id: string;
  protocol_id: string;
  protocol_version: number;
  measured_at: string;
  recorded_at: string;
  source: string;
  value_json: string;
  unit: string;
  workout_session_id: string | null;
  corrects_observation_id: string | null;
}

type ShiftSyncEntityType = 'shift' | 'shift-protocol' | 'shift-observation' | 'shift-goal-revision';

export async function createShift(
  database: SQLiteDatabase,
  shift: Shift,
  options: CreateShiftOptions,
): Promise<void> {
  assertTimestamp(options.createdAt, 'Shift creation time');
  assertShiftShape(shift);
  if (!Number.isInteger(options.templateVersion) || options.templateVersion < 1) {
    throw new Error('Shift template version must be a positive integer.');
  }

  const baselineObservation = options.baselineObservation;
  if (shift.baseline.state === 'measured') {
    if (!baselineObservation || baselineObservation.id !== shift.baseline.observationId) {
      throw new Error('A measured baseline requires its matching observation.');
    }
  } else if (baselineObservation) {
    throw new Error('A baseline observation is only valid for a measured baseline.');
  }

  const isPrimary = options.isPrimary ?? true;
  const expectedStoredShift = {
    id: shift.id,
    user_id: shift.userId,
    cycle_id: shift.cycleId,
    program_version_id: shift.programVersionId,
    template_id: shift.templateId,
    template_version: options.templateVersion,
    block_objective: shift.blockObjective,
    longer_term_aspiration: shift.longerTermAspiration ?? null,
    active_protocol_id: shift.protocol.id,
    active_protocol_version: shift.protocol.version,
    target_json: JSON.stringify(shift.target),
    baseline_state: shift.baseline.state,
    baseline_observation_id:
      shift.baseline.state === 'measured' ? shift.baseline.observationId : null,
    review_state: shift.reviewState,
    next_choice: shift.nextChoice,
    is_primary: isPrimary ? 1 : 0,
    created_at: options.createdAt,
  };

  await database.withTransactionAsync(async () => {
    const existing = await database.getFirstAsync<typeof expectedStoredShift>(
      `SELECT id, user_id, cycle_id, program_version_id, template_id, template_version,
              block_objective, longer_term_aspiration, active_protocol_id, active_protocol_version,
              target_json, baseline_state, baseline_observation_id, review_state, next_choice,
              is_primary, created_at
         FROM shifts
        WHERE id = ?
        LIMIT 1;`,
      shift.id,
    );
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(expectedStoredShift)) {
        throw new Error('Shift ID already exists with different contents.');
      }
      return;
    }

    const cycle = await database.getFirstAsync<CycleRow>(
      `SELECT id, user_id, program_version_id
         FROM training_cycles
        WHERE id = ?
        LIMIT 1;`,
      shift.cycleId,
    );
    if (!cycle) throw new Error('The linked training cycle does not exist.');
    if (cycle.user_id !== shift.userId) throw new Error('Shift and cycle ownership must agree.');
    if (cycle.program_version_id !== shift.programVersionId) {
      throw new Error('Shift and cycle program versions must agree.');
    }

    if (isPrimary) {
      const competing = await database.getFirstAsync<{ id: string }>(
        'SELECT id FROM shifts WHERE user_id = ? AND is_primary = 1 LIMIT 1;',
        shift.userId,
      );
      if (competing) throw new Error('This user already has a primary Shift.');
    }

    await database.runAsync(
      `INSERT INTO shifts
        (id, user_id, cycle_id, program_version_id, template_id, template_version,
         block_objective, longer_term_aspiration, active_protocol_id, active_protocol_version,
         target_json, baseline_state, baseline_observation_id, review_state, next_choice,
         is_primary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      shift.id,
      shift.userId,
      shift.cycleId,
      shift.programVersionId,
      shift.templateId,
      options.templateVersion,
      shift.blockObjective,
      shift.longerTermAspiration ?? null,
      shift.protocol.id,
      shift.protocol.version,
      JSON.stringify(shift.target),
      shift.baseline.state === 'measured' ? 'missing' : shift.baseline.state,
      null,
      shift.reviewState,
      shift.nextChoice,
      isPrimary ? 1 : 0,
      options.createdAt,
    );

    await database.runAsync(
      `INSERT INTO shift_protocols
        (shift_id, user_id, protocol_id, protocol_version, snapshot_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      shift.id,
      shift.userId,
      shift.protocol.id,
      shift.protocol.version,
      JSON.stringify(shift.protocol),
      options.createdAt,
    );

    await queueImmutableMutation(
      database,
      'shift-protocol',
      protocolEntityId(shift.id, shift.protocol.id, shift.protocol.version),
      {
        userId: shift.userId,
        shiftId: shift.id,
        protocol: shift.protocol,
        createdAt: options.createdAt,
      },
      options.createdAt,
    );

    if (baselineObservation) {
      await appendShiftObservationInTransaction(database, shift.id, baselineObservation, {
        recordedAt: options.createdAt,
      });
      await database.runAsync(
        `UPDATE shifts
            SET baseline_state = 'measured', baseline_observation_id = ?
          WHERE id = ? AND user_id = ?;`,
        baselineObservation.id,
        shift.id,
        shift.userId,
      );
    }

    const revisionId = initialRevisionId(shift.id);
    await database.runAsync(
      `INSERT INTO shift_goal_revisions
        (id, shift_id, user_id, previous_revision_id, protocol_id, protocol_version,
         target_json, block_objective, reason, recorded_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'initial', ?);`,
      revisionId,
      shift.id,
      shift.userId,
      shift.protocol.id,
      shift.protocol.version,
      JSON.stringify(shift.target),
      shift.blockObjective,
      options.createdAt,
    );

    await queueImmutableMutation(
      database,
      'shift-goal-revision',
      revisionId,
      {
        id: revisionId,
        userId: shift.userId,
        shiftId: shift.id,
        previousRevisionId: null,
        protocolId: shift.protocol.id,
        protocolVersion: shift.protocol.version,
        target: shift.target,
        blockObjective: shift.blockObjective,
        reason: 'initial',
        recordedAt: options.createdAt,
      },
      options.createdAt,
    );

    await queueImmutableMutation(
      database,
      'shift',
      shift.id,
      {
        userId: shift.userId,
        shift: {
          ...shift,
          templateVersion: options.templateVersion,
          isPrimary,
          createdAt: options.createdAt,
        },
      },
      options.createdAt,
    );
  });
}

export async function appendShiftObservation(
  database: SQLiteDatabase,
  shiftId: string,
  observation: ShiftObservation,
  options: AppendObservationOptions,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await appendShiftObservationInTransaction(database, shiftId, observation, options);
  });
}

async function appendShiftObservationInTransaction(
  database: SQLiteDatabase,
  shiftId: string,
  observation: ShiftObservation,
  options: AppendObservationOptions,
): Promise<void> {
  assertTimestamp(options.recordedAt, 'Observation record time');
  if (observation.shiftId !== shiftId) throw new Error('Observation Shift ID does not match.');

  const shift = await database.getFirstAsync<{ id: string; user_id: string; cycle_id: string }>(
    'SELECT id, user_id, cycle_id FROM shifts WHERE id = ? LIMIT 1;',
    shiftId,
  );
  if (!shift) throw new Error('The Shift does not exist.');

  const protocolRow = await database.getFirstAsync<ProtocolRow>(
    `SELECT snapshot_json
       FROM shift_protocols
      WHERE shift_id = ? AND protocol_id = ? AND protocol_version = ?
      LIMIT 1;`,
    shiftId,
    observation.protocolId,
    observation.protocolVersion,
  );
  if (!protocolRow) throw new Error('The observation protocol is not registered for this Shift.');

  const protocol = parseProtocol(protocolRow.snapshot_json);
  if (!normalizeObservation(protocol, observation)) {
    throw new Error('The observation is not valid for its measurement protocol.');
  }

  if (observation.correctsObservationId) {
    const parent = await database.getFirstAsync<{
      protocol_id: string;
      protocol_version: number;
    }>(
      `SELECT protocol_id, protocol_version
         FROM shift_observations
        WHERE shift_id = ? AND id = ?
        LIMIT 1;`,
      shiftId,
      observation.correctsObservationId,
    );
    if (!parent) throw new Error('The corrected observation does not exist.');
    if (
      parent.protocol_id !== observation.protocolId ||
      parent.protocol_version !== observation.protocolVersion
    ) {
      throw new Error('A correction must use the same measurement protocol as its parent.');
    }
    const sibling = await database.getFirstAsync<{ id: string }>(
      `SELECT id FROM shift_observations
        WHERE shift_id = ? AND corrects_observation_id = ? AND id <> ?
        LIMIT 1;`,
      shiftId,
      observation.correctsObservationId,
      observation.id,
    );
    if (sibling) throw new Error('This observation already has a different correction.');
  }

  if (observation.source === 'qualifying-workout') {
    if (!options.workoutSessionId) {
      throw new Error('A qualifying workout observation requires a workout session.');
    }
    const session = await database.getFirstAsync<{ id: string }>(
      `SELECT workout_sessions.id
         FROM workout_sessions
         INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
        WHERE workout_sessions.id = ?
          AND training_cycles.id = ?
          AND training_cycles.user_id = ?
        LIMIT 1;`,
      options.workoutSessionId,
      shift.cycle_id,
      shift.user_id,
    );
    if (!session) throw new Error('The qualifying workout is not owned by this Shift cycle.');
  }

  const existing = await database.getFirstAsync<ObservationRow>(
    `SELECT id, shift_id, user_id, protocol_id, protocol_version, measured_at, recorded_at,
            source, value_json, unit, workout_session_id, corrects_observation_id
       FROM shift_observations
      WHERE id = ?
      LIMIT 1;`,
    observation.id,
  );

  const expected = {
    id: observation.id,
    shift_id: shiftId,
    user_id: shift.user_id,
    protocol_id: observation.protocolId,
    protocol_version: observation.protocolVersion,
    measured_at: observation.measuredAt,
    recorded_at: options.recordedAt,
    source: observation.source,
    value_json: JSON.stringify(observation.value),
    unit: observation.unit,
    workout_session_id: options.workoutSessionId ?? null,
    corrects_observation_id: observation.correctsObservationId ?? null,
  };

  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(expected)) {
      throw new Error('Observation ID already exists with different contents.');
    }
  } else {
    await database.runAsync(
      `INSERT INTO shift_observations
        (id, shift_id, user_id, protocol_id, protocol_version, measured_at, recorded_at,
         source, value_json, unit, workout_session_id, corrects_observation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      expected.id,
      expected.shift_id,
      expected.user_id,
      expected.protocol_id,
      expected.protocol_version,
      expected.measured_at,
      expected.recorded_at,
      expected.source,
      expected.value_json,
      expected.unit,
      expected.workout_session_id,
      expected.corrects_observation_id,
    );
  }

  await queueImmutableMutation(
    database,
    'shift-observation',
    observation.id,
    {
      id: observation.id,
      userId: shift.user_id,
      shiftId,
      protocolId: observation.protocolId,
      protocolVersion: observation.protocolVersion,
      measuredAt: observation.measuredAt,
      recordedAt: options.recordedAt,
      source: observation.source,
      value: observation.value,
      unit: observation.unit,
      workoutSessionId: options.workoutSessionId ?? null,
      correctsObservationId: observation.correctsObservationId ?? null,
    },
    options.recordedAt,
  );
}

function assertShiftShape(shift: Shift): void {
  if (
    !shift.id.trim() ||
    !shift.userId.trim() ||
    !shift.cycleId.trim() ||
    !shift.programVersionId.trim() ||
    !shift.templateId.trim() ||
    !shift.blockObjective.trim()
  ) {
    throw new Error('Shift identity, ownership, template and objective are required.');
  }
  if (validateMeasurementProtocol(shift.protocol).length > 0) {
    throw new Error('Shift measurement protocol is invalid.');
  }
  if (
    shift.protocol.metric === 'completion'
      ? shift.target !== true
      : typeof shift.target !== 'number' || !Number.isFinite(shift.target) || shift.target < 0
  ) {
    throw new Error('Shift target is invalid.');
  }
}

function parseProtocol(value: string): MeasurementProtocol {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('Stored Shift protocol is invalid JSON.');
  }
  const protocol = parsed as MeasurementProtocol;
  if (validateMeasurementProtocol(protocol).length > 0) {
    throw new Error('Stored Shift protocol is invalid.');
  }
  return protocol;
}

function assertTimestamp(value: string, label: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid timestamp.`);
}

function protocolEntityId(shiftId: string, protocolId: string, version: number): string {
  return `${shiftId}:${protocolId}:${version}`;
}

function initialRevisionId(shiftId: string): string {
  return `${shiftId}:revision:initial`;
}

async function queueImmutableMutation(
  database: SQLiteDatabase,
  entityType: ShiftSyncEntityType,
  entityId: string,
  payload: Record<string, unknown>,
  createdAt: string,
): Promise<void> {
  const idempotencyKey = `${entityType}:${entityId}`;
  const order = {
    shift: '0',
    'shift-protocol': '1',
    'shift-observation': '2',
    'shift-goal-revision': '3',
  } satisfies Record<ShiftSyncEntityType, string>;
  const id = `outbox-shift-${order[entityType]}-${entityId}`;
  const payloadJson = JSON.stringify(payload);

  const existing = await database.getFirstAsync<{ payload_json: string }>(
    'SELECT payload_json FROM sync_outbox WHERE idempotency_key = ? LIMIT 1;',
    idempotencyKey,
  );
  if (existing) {
    if (existing.payload_json !== payloadJson) {
      throw new Error(`Sync mutation ${idempotencyKey} already exists with different contents.`);
    }
    return;
  }

  await database.runAsync(
    `INSERT INTO sync_outbox
      (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    id,
    idempotencyKey,
    entityType,
    entityId,
    payloadJson,
    createdAt,
  );
}
