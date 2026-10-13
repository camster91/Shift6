import type { CycleReview, Program, ProgramVersion, TrainingCycle } from './types';
import type { Shift, ShiftReviewState } from './shift';
import { validateMeasurementProtocol } from './shift';
import type { CoachReviewGoalWitness } from './coachReviewGoalWitness';
import { lifecycleDate } from './cycleLifecycle';
import { stableSnapshotJSON } from './programPersistence';

export const cycleHandoverSections = { cycleHandovers: 'cycle_handovers' } as const;
export interface HandoverSession {
  id: string;
  cycle_week: number;
  workout_id: string;
  program_version_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
}
/** Stable code-unit ordering is independent of a phone's locale. */
export function sortHandoverSessions<T extends { id: string }>(sessions: readonly T[]): T[] {
  return [...sessions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
export interface HandoverSource {
  cycle: TrainingCycle;
  program: Program;
  version: ProgramVersion;
  goal: Shift | null;
  goalWitness: CoachReviewGoalWitness;
  primaryGoalId: string | null;
  activeCycleIds: string[];
  sessions: HandoverSession[];
  latestGoalRevisionId: string | null;
  latestReflectionId: string | null;
}
export interface CycleHandoverRequest {
  format: 'local-cycle-handover-v1';
  operationId: string;
  userId: string;
  preparedAt: string;
  source: HandoverSource;
  choice: 'continue-goal' | 'without-goal';
  personalReviewState: Extract<ShiftReviewState, 'completed' | 'declined' | 'postponed'>;
  reflection: CycleReview;
  destination: {
    cycleId: string;
    programId: string;
    versionId: string;
    goalId: string | null;
    startedAt: string;
    startDate: string;
    timeZone: string;
  };
}
export interface CycleHandoverReceipt {
  request: CycleHandoverRequest;
  confirmedAt: string;
}
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
    throw new Error('Invalid handover fields.');
}
function id(value: unknown): asserts value is string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 1024 ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new Error('Invalid handover identifier.');
}
function timestamp(value: unknown): asserts value is string {
  id(value);
  if (new Date(value).toISOString() !== value) throw new Error('Invalid handover timestamp.');
}
/** Canonical local request bytes are the exact-retry identity, never provider context. */
export function parseCycleHandoverRequest(serialized: string): CycleHandoverRequest {
  if (new TextEncoder().encode(serialized).byteLength > 1024 * 1024)
    throw new Error('Handover exceeds 1 MiB.');
  const value: unknown = JSON.parse(serialized);
  fields(value, [
    'format',
    'operationId',
    'userId',
    'preparedAt',
    'source',
    'choice',
    'personalReviewState',
    'reflection',
    'destination',
  ]);
  if (
    value.format !== 'local-cycle-handover-v1' ||
    !['continue-goal', 'without-goal'].includes(String(value.choice)) ||
    !['completed', 'declined', 'postponed'].includes(String(value.personalReviewState))
  )
    throw new Error('Invalid handover choice.');
  id(value.operationId);
  id(value.userId);
  timestamp(value.preparedAt);
  fields(value.source, [
    'cycle',
    'program',
    'version',
    'goal',
    'goalWitness',
    'primaryGoalId',
    'activeCycleIds',
    'sessions',
    'latestGoalRevisionId',
    'latestReflectionId',
  ]);
  fields(value.destination, [
    'cycleId',
    'programId',
    'versionId',
    'goalId',
    'startedAt',
    'startDate',
    'timeZone',
  ]);
  fields(value.source.cycle, [
    'id',
    'userId',
    'programVersionId',
    'status',
    'currentWeek',
    'startedAt',
    'weeks',
  ]);
  fields(
    value.source.program,
    [
      'id',
      'slug',
      'title',
      'description',
      'goals',
      'targetUser',
      'experience',
      'daysPerWeek',
      'sessionLengthMinutes',
      'requiredEquipmentIds',
      'optionalEquipmentIds',
      'progressionStrategy',
      'currentVersionId',
      'isTemplate',
      'ownerId',
    ],
    ['sourceProgramId'],
  );
  fields(value.source.version, [
    'id',
    'programId',
    'version',
    'status',
    'cycleModel',
    'workouts',
    'progressionRuleIds',
    'createdAt',
  ]);
  fields(
    value.reflection,
    ['id', 'userId', 'cycleId', 'nextAction', 'createdAt', 'updatedAt'],
    ['overallRating', 'focus', 'note'],
  );
  const request = value as unknown as CycleHandoverRequest;
  const { source, destination } = request;
  for (const item of [
    destination.cycleId,
    destination.programId,
    destination.versionId,
    destination.timeZone,
    source.cycle?.id,
    source.version?.id,
    source.program?.id,
  ])
    id(item);
  timestamp(source.cycle.startedAt);
  if (
    !Number.isInteger(source.cycle.currentWeek) ||
    source.cycle.currentWeek < 1 ||
    source.cycle.currentWeek > 6 ||
    !Array.isArray(source.cycle.weeks) ||
    source.cycle.weeks.length !== 6
  )
    throw new Error('Invalid handover cycle position.');
  for (const week of source.cycle.weeks) {
    fields(week, [
      'weekNumber',
      'label',
      'phase',
      'status',
      'completedWorkoutCount',
      'plannedWorkoutCount',
    ]);
    if (
      !Number.isInteger(week.weekNumber) ||
      week.weekNumber < 1 ||
      week.weekNumber > 6 ||
      !Number.isInteger(week.completedWorkoutCount) ||
      week.completedWorkoutCount < 0 ||
      !Number.isInteger(week.plannedWorkoutCount) ||
      week.plannedWorkoutCount < 0
    )
      throw new Error('Invalid handover week.');
  }
  timestamp(destination.startedAt);
  if (
    destination.startedAt !== request.preparedAt ||
    lifecycleDate(destination.startedAt, destination.timeZone) !== destination.startDate
  )
    throw new Error('Handover date/timezone binding changed.');
  if (
    source.cycle.userId !== request.userId ||
    source.program.ownerId !== request.userId ||
    source.program.isTemplate ||
    source.cycle.programVersionId !== source.version.id ||
    source.version.programId !== source.program.id ||
    !['active', 'paused', 'complete'].includes(source.cycle.status)
  )
    throw new Error('Handover source ownership changed.');
  for (const item of [source.primaryGoalId, source.latestGoalRevisionId, source.latestReflectionId])
    if (item !== null) id(item);
  if (
    !Array.isArray(source.activeCycleIds) ||
    source.activeCycleIds.length > 1 ||
    source.activeCycleIds.some((item) => item !== source.cycle.id)
  )
    throw new Error('Another active cycle needs explicit review.');
  if (source.primaryGoalId !== null && source.primaryGoalId !== source.goal?.id)
    throw new Error('Another primary goal needs explicit review.');
  if (!Array.isArray(source.sessions) || source.sessions.length > 1000)
    throw new Error('Handover session evidence exceeds bounds.');
  const seen = new Set<string>();
  for (const session of source.sessions) {
    fields(session, [
      'id',
      'cycle_week',
      'workout_id',
      'program_version_id',
      'status',
      'started_at',
      'completed_at',
    ]);
    id(session.id);
    id(session.workout_id);
    id(session.program_version_id);
    timestamp(session.started_at);
    if (session.completed_at !== null) timestamp(session.completed_at);
    if (
      Date.parse(session.started_at) > Date.parse(request.preparedAt) ||
      (session.completed_at !== null &&
        Date.parse(session.completed_at) > Date.parse(request.preparedAt))
    )
      throw new Error('Source session clocks need review before handover.');
    if (
      seen.has(session.id) ||
      !Number.isInteger(session.cycle_week) ||
      session.cycle_week < 1 ||
      session.cycle_week > 6 ||
      !['complete', 'partial', 'skipped'].includes(session.status)
    )
      throw new Error('Finish or save pending sessions before handover.');
    seen.add(session.id);
  }
  if (source.goal) {
    const goal = source.goal;
    fields(goal, [
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
    ]);
    fields(
      goal.protocol,
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
      goal.protocol.metric === 'load-for-reps'
        ? ['repCount']
        : goal.protocol.metric === 'fixed-distance-time'
          ? ['fixedDistanceMeters']
          : [],
    );
    const metrics: Record<string, [string, string]> = {
      reps: ['reps', 'higher'],
      'load-for-reps': ['kg', 'higher'],
      'hold-duration': ['seconds', 'higher'],
      'fixed-distance-time': ['seconds', 'lower'],
      distance: ['meters', 'higher'],
      completion: ['completed', 'complete'],
    };
    const spec = Object.hasOwn(metrics, goal.protocol.metric)
      ? metrics[goal.protocol.metric]
      : undefined;
    if (!spec || goal.protocol.canonicalUnit !== spec[0] || goal.protocol.direction !== spec[1])
      throw new Error('Invalid handover measurement protocol.');
    fields(
      goal.baseline,
      goal.baseline.state === 'measured' ? ['state', 'observationId'] : ['state'],
    );
    if (
      goal.userId !== request.userId ||
      goal.cycleId !== source.cycle.id ||
      goal.programVersionId !== source.version.id ||
      validateMeasurementProtocol(goal.protocol).length ||
      !(
        goal.target === true ||
        (typeof goal.target === 'number' && Number.isFinite(goal.target) && goal.target > 0)
      )
    )
      throw new Error('Handover goal/protocol binding changed.');
    if (
      !source.goalWitness ||
      source.goalWitness.state !== 'event-history' ||
      source.goalWitness.goalId !== goal.id ||
      !source.goalWitness.eventIds.length
    )
      throw new Error('Canonical goal creation history needs review before handover.');
  } else if (source.goalWitness !== null || source.latestGoalRevisionId !== null)
    throw new Error('Unexpected goal history.');
  if (request.choice === 'continue-goal') {
    if (!source.goal || destination.goalId === null)
      throw new Error('Choose a source and destination goal.');
    id(destination.goalId);
    if (destination.goalId === source.goal.id)
      throw new Error('A new block needs a new goal identity.');
  } else if (destination.goalId !== null)
    throw new Error('Goal-free handover cannot create a goal.');
  if (
    destination.cycleId === source.cycle.id ||
    destination.programId === source.program.id ||
    destination.versionId === source.version.id
  )
    throw new Error('A new block needs new cycle and plan identities.');
  if (
    request.reflection.userId !== request.userId ||
    request.reflection.cycleId !== source.cycle.id ||
    request.reflection.nextAction !== 'repeat' ||
    (source.latestReflectionId !== null && request.reflection.id !== source.latestReflectionId)
  )
    throw new Error('Handover reflection binding changed.');
  if (request.reflection.note !== undefined && typeof request.reflection.note !== 'string')
    throw new Error('Invalid reflection note.');
  if (
    request.reflection.overallRating !== undefined &&
    (!Number.isInteger(request.reflection.overallRating) ||
      request.reflection.overallRating < 1 ||
      request.reflection.overallRating > 5)
  )
    throw new Error('Invalid reflection rating.');
  if (
    request.reflection.focus !== undefined &&
    ![
      'same-course',
      'more-strength',
      'more-conditioning',
      'more-mobility',
      'improve-consistency',
      'recover-better',
    ].includes(request.reflection.focus)
  )
    throw new Error('Invalid reflection focus.');
  id(request.reflection.id);
  timestamp(request.reflection.createdAt);
  timestamp(request.reflection.updatedAt);
  if (
    request.reflection.createdAt > request.preparedAt ||
    request.reflection.updatedAt !== request.preparedAt ||
    (request.reflection.note?.length ?? 0) > 2000
  )
    throw new Error('Invalid handover reflection.');
  return request;
}
/** Adoption remaps explicit ownership only; every historical ID stays stable. */
export function remapCycleHandoverRequest(serialized: string, userId: string): string {
  id(userId);
  const request = parseCycleHandoverRequest(serialized);
  request.userId = userId;
  request.source.cycle.userId = userId;
  request.source.program.ownerId = userId;
  if (request.source.goal) request.source.goal.userId = userId;
  request.reflection.userId = userId;
  return stableSnapshotJSON(parseCycleHandoverRequest(stableSnapshotJSON(request)));
}
