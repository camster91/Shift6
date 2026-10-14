import {
  prepareCoachReview,
  confirmCoachReviewChoice,
  type CoachReviewInput,
  type CoachReviewPreview,
} from './coachReview';
import { stableSnapshotJSON } from './programPersistence';
import { validateMeasurementProtocol, type MeasurementProtocol } from './shift';
import type { CoachReviewGoalWitness } from './coachReviewGoalWitness';

export const coachReviewSections = { coachReviewJournal: 'coach_review_journal' } as const;
export type CoachReviewReceipt = ReturnType<typeof confirmCoachReviewChoice> & {
  goalWitness: CoachReviewGoalWitness;
};
export const MAX_REVIEW_RECEIPT_BYTES = 512 * 1024;

function fields(
  value: unknown,
  required: string[],
  optional: string[] = [],
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => ![...required, ...optional].includes(key))
  )
    throw new Error('Invalid dated review snapshot fields.');
}
function bounded(value: unknown, limit = 1024): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > limit ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new Error('Invalid dated review text.');
}
function list(value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > 1000)
    throw new Error('Dated review evidence exceeds its bounds.');
}
function integer(value: unknown, min = 0, max = 1000000) {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max)
    throw new Error('Invalid bounded review integer.');
}

/** Historical evidence is a review snapshot, never a replacement for canonical records. */
export function parseCoachReviewReceipt(serialized: string): {
  receipt: CoachReviewReceipt;
  evidence: CoachReviewInput;
} {
  if (new TextEncoder().encode(serialized).byteLength > MAX_REVIEW_RECEIPT_BYTES)
    throw new Error('Dated review receipt exceeds 512 KiB.');
  const value: unknown = JSON.parse(serialized);
  fields(value, [
    'ownerId',
    'cycleId',
    'programVersionId',
    'preparedAt',
    'window',
    'evidenceFingerprint',
    'choice',
    'response',
    'effect',
    'revalidatedAt',
    'confirmedAt',
    'status',
    'nextCapability',
    'requiresWorkflowConfirmation',
    'goalWitness',
  ]);
  for (const key of [
    'ownerId',
    'cycleId',
    'programVersionId',
    'preparedAt',
    'revalidatedAt',
    'confirmedAt',
  ])
    bounded(value[key]);
  bounded(value.evidenceFingerprint, MAX_REVIEW_RECEIPT_BYTES);
  fields(value.window, ['startDate', 'endDate', 'timeZone']);
  Object.values(value.window).forEach((item) => bounded(item));
  if (value.response !== null) {
    fields(value.response, ['questionId', 'answer']);
    bounded(value.response.questionId, 100);
    bounded(value.response.answer, 100);
  }
  const evidence: unknown = JSON.parse(value.evidenceFingerprint);
  fields(evidence, [
    'format',
    'ownerId',
    'cycle',
    'programVersionId',
    'window',
    'sessions',
    'goal',
    'observations',
  ]);
  if (
    evidence.format !== 'local-dated-review-v1' ||
    evidence.ownerId !== value.ownerId ||
    evidence.programVersionId !== value.programVersionId
  )
    throw new Error('Dated review evidence binding disagrees with its receipt.');
  fields(evidence.window, ['startDate', 'endDate', 'timeZone']);
  fields(evidence.cycle, [
    'id',
    'userId',
    'programVersionId',
    'status',
    'currentWeek',
    'startedAt',
    'weeks',
  ]);
  if (evidence.cycle.id !== value.cycleId) throw new Error('Dated review cycle changed.');
  list(evidence.cycle.weeks);
  for (const week of evidence.cycle.weeks) {
    fields(week, [
      'weekNumber',
      'label',
      'phase',
      'status',
      'completedWorkoutCount',
      'plannedWorkoutCount',
    ]);
    bounded(week.label);
    bounded(week.phase);
    integer(week.completedWorkoutCount);
    integer(week.plannedWorkoutCount);
    if (!['completed', 'current', 'upcoming', 'missed', 'partial'].includes(String(week.status)))
      throw new Error('Unsupported review week status.');
  }
  if (
    !['planned', 'active', 'complete', 'paused', 'cancelled'].includes(
      String(evidence.cycle.status),
    )
  )
    throw new Error('Unsupported review cycle status.');
  list(evidence.sessions);
  for (const session of evidence.sessions) {
    fields(
      session,
      ['id', 'cycleId', 'programVersionId', 'workoutId', 'cycleWeek', 'status', 'startedAt'],
      ['completedAt', 'completionReason', 'readiness'],
    );
    for (const key of ['id', 'cycleId', 'programVersionId', 'workoutId', 'status', 'startedAt'])
      bounded(session[key]);
    if (
      session.completionReason !== undefined &&
      !['all-targets', 'time-limited', 'readiness', 'discomfort', 'equipment', 'other'].includes(
        String(session.completionReason),
      )
    )
      throw new Error('Unsupported review stop reason.');
    if (
      session.readiness !== undefined &&
      !['ready', 'limited', 'rest'].includes(String(session.readiness))
    )
      throw new Error('Unsupported review readiness.');
  }
  if (evidence.goal !== null) {
    fields(
      evidence.goal,
      [
        'id',
        'userId',
        'cycleId',
        'programVersionId',
        'templateId',
        'blockObjective',
        'protocol',
        'target',
        'baseline',
        'reviewState',
        'nextChoice',
      ],
      ['longerTermAspiration'],
    );
    for (const key of [
      'id',
      'userId',
      'cycleId',
      'programVersionId',
      'templateId',
      'blockObjective',
    ])
      bounded(evidence.goal[key]);
    if (evidence.goal.longerTermAspiration !== undefined)
      bounded(evidence.goal.longerTermAspiration);
    fields(
      evidence.goal.protocol,
      [
        'id',
        'version',
        'exerciseId',
        'variantId',
        'assistance',
        'equipmentSetup',
        'metric',
        'canonicalUnit',
        'direction',
      ],
      ['repCount', 'fixedDistanceMeters'],
    );
    const protocol = evidence.goal.protocol;
    const specs: Record<string, string[]> = {
      reps: ['reps', 'higher'],
      'load-for-reps': ['kg', 'higher'],
      'hold-duration': ['seconds', 'higher'],
      'fixed-distance-time': ['seconds', 'lower'],
      distance: ['meters', 'higher'],
      completion: ['completed', 'complete'],
    };
    const spec = specs[String(protocol.metric)];
    if (!spec || spec[0] !== protocol.canonicalUnit || spec[1] !== protocol.direction)
      throw new Error('Unsupported review goal protocol.');
    for (const key of ['id', 'exerciseId', 'variantId', 'assistance', 'equipmentSetup'])
      bounded(protocol[key]);
    if (validateMeasurementProtocol(protocol as unknown as MeasurementProtocol).length)
      throw new Error('Invalid review measurement protocol.');
    if (
      protocol.metric === 'completion'
        ? evidence.goal.target !== true
        : typeof evidence.goal.target !== 'number' ||
          !Number.isFinite(evidence.goal.target) ||
          evidence.goal.target < 0
    )
      throw new Error('Invalid review goal target.');
    fields(
      evidence.goal.baseline,
      ['state'],
      evidence.goal.baseline &&
        (evidence.goal.baseline as Record<string, unknown>).state === 'measured'
        ? ['observationId']
        : [],
    );
    if (
      !['measured', 'missing', 'deferred', 'not-yet-able'].includes(
        String(evidence.goal.baseline.state),
      ) ||
      (evidence.goal.baseline.state === 'measured' &&
        typeof evidence.goal.baseline.observationId !== 'string')
    )
      throw new Error('Invalid explicit review baseline.');
    if (
      !['due', 'completed', 'declined', 'postponed', 'missing'].includes(
        String(evidence.goal.reviewState),
      ) ||
      !['maintain', 'repeat', 'modify', 'new-goal', 'break', 'undecided'].includes(
        String(evidence.goal.nextChoice),
      )
    )
      throw new Error('Invalid review goal state.');
  }
  list(evidence.observations);
  for (const observation of evidence.observations) {
    fields(
      observation,
      ['id', 'shiftId', 'protocolId', 'protocolVersion', 'measuredAt', 'source', 'value', 'unit'],
      ['correctsObservationId'],
    );
    for (const key of ['id', 'shiftId', 'protocolId', 'measuredAt']) bounded(observation[key]);
    if (observation.correctsObservationId !== undefined) bounded(observation.correctsObservationId);
    integer(observation.protocolVersion, 1);
    if (
      typeof observation.value !== 'boolean' &&
      (typeof observation.value !== 'number' ||
        !Number.isFinite(observation.value) ||
        observation.value < 0)
    )
      throw new Error('Invalid review observation value.');
    if (
      !['assessment', 'historical-entry', 'import', 'qualifying-workout'].includes(
        String(observation.source),
      ) ||
      !['reps', 'kg', 'lb', 'seconds', 'minutes', 'meters', 'km', 'miles', 'completed'].includes(
        String(observation.unit),
      )
    )
      throw new Error('Unsupported review observation provenance.');
  }
  if (value.goalWitness !== null) {
    fields(
      value.goalWitness,
      ['state', 'goalId'],
      value.goalWitness && (value.goalWitness as Record<string, unknown>).state === 'event-history'
        ? ['eventIds']
        : [],
    );
    bounded(value.goalWitness.goalId);
    if (value.goalWitness.state === 'event-history') {
      list(value.goalWitness.eventIds);
      value.goalWitness.eventIds.forEach((id) => bounded(id));
      if (
        !value.goalWitness.eventIds.length ||
        new Set(value.goalWitness.eventIds).size !== value.goalWitness.eventIds.length ||
        !evidence.goal ||
        evidence.goal.id !== value.goalWitness.goalId
      )
        throw new Error('Invalid goal review event witness.');
    } else if (value.goalWitness.state !== 'unavailable-legacy-history' || evidence.goal !== null)
      throw new Error('Unavailable goal history cannot establish a measured comparison.');
  } else if (evidence.goal !== null)
    throw new Error('A goal comparison requires canonical source witnesses.');
  if (stableSnapshotJSON(evidence) !== value.evidenceFingerprint)
    throw new Error('Dated review evidence must retain its canonical exact key.');
  const packet = {
    ...evidence,
    now: value.revalidatedAt,
    sessions: evidence.sessions.map((session) => ({
      ...(session as object),
      workoutFocus: 'mixed',
      isOffline: true,
    })),
  } as unknown as CoachReviewInput;
  const fresh = prepareCoachReview(packet);
  const receipt = {
    ...confirmCoachReviewChoice(
      value as unknown as CoachReviewPreview,
      fresh,
      String(value.confirmedAt),
      true,
    ),
    goalWitness: value.goalWitness as CoachReviewGoalWitness,
  };
  if (stableSnapshotJSON(receipt) !== stableSnapshotJSON(value))
    throw new Error('Dated review receipt disagrees with its deterministic preview.');
  return { receipt, evidence: packet };
}

/** Remap explicit owners only. IDs containing an earlier owner stay unchanged. */
export function remapCoachReviewReceipt(serialized: string, owner: string): string {
  bounded(owner);
  const { receipt } = parseCoachReviewReceipt(serialized);
  const evidence = JSON.parse(receipt.evidenceFingerprint);
  evidence.ownerId = owner;
  evidence.cycle.userId = owner;
  if (evidence.goal) evidence.goal.userId = owner;
  const normalized = stableSnapshotJSON({
    ...receipt,
    ownerId: owner,
    evidenceFingerprint: stableSnapshotJSON(evidence),
  });
  parseCoachReviewReceipt(normalized);
  return normalized;
}
