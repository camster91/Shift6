import type { CycleModel, ProgressionStrategy, SetTarget, WorkoutReadiness } from './types';

export interface ReadinessInput {
  energy: 1 | 2 | 3 | 4 | 5;
  soreness: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  timeAvailableMinutes: number;
  discomfort: boolean;
}

export type ReadinessAction =
  'normal-plan' | 'lighter-volume' | 'technique-recovery' | 'hold-progression';

export interface ReadinessDecision {
  label: 'normal plan' | 'consider lighter volume' | 'consider technique/recovery session';
  action: ReadinessAction;
  reason: string;
}

export interface SetPerformance {
  completed: boolean;
  load?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  rpe?: number;
  rir?: number;
  discomfortFlag?: boolean;
  formQuality?: 'good' | 'uncertain' | 'poor';
}

export interface ProgressionInput {
  strategy: ProgressionStrategy;
  currentTarget: SetTarget;
  completedSets: readonly SetPerformance[];
  readiness: ReadinessInput;
  loadIncrement?: number;
  durationIncrementSeconds?: number;
  distanceIncrementMeters?: number;
  totalRepTarget?: number;
  skillReady?: boolean;
}

export type ProgressionAction =
  | 'hold'
  | 'increase-load'
  | 'increase-reps'
  | 'increase-volume'
  | 'increase-time'
  | 'increase-distance'
  | 'increase-density'
  | 'progress-skill'
  | 'review';

export interface ProgressionDecision {
  action: ProgressionAction;
  nextTarget: SetTarget;
  reason: string;
  requiresUserConfirmation: boolean;
  setCountDelta?: number;
  densitySecondsDelta?: number;
}

export interface SessionPerformance {
  id: string;
  planned: boolean;
  completed: boolean;
  targetAttempted: boolean;
  progressed: boolean;
  discomfortFlag?: boolean;
  scheduleOrEquipmentChanged?: boolean;
}

export type PlateauStatus = 'insufficient-data' | 'no-plateau' | 'plateau';

export interface PlateauResult {
  status: PlateauStatus;
  comparableSessionCount: number;
  adherenceRate: number;
  reason: string;
}

export interface CycleReviewSession {
  completed: boolean;
  completedAt?: string;
  cycleWeek?: number;
  durationMinutes?: number;
  cardioMinutes?: number;
  progressionEvents?: number;
  regressions?: number;
  personalRecordIds?: string[];
  sets?: readonly SetPerformance[];
  effort?: number;
  discomfortFlag?: boolean;
  readiness?: WorkoutReadiness;
}

export interface ReadinessCounts {
  ready: number;
  limited: number;
  rest: number;
}

export interface CycleReviewFacts {
  plannedWorkoutCount: number;
  completedWorkoutCount: number;
  completionRate: number;
  progressionEvents: number;
  regressions: number;
  personalRecordIds: string[];
  totalTrainingVolume: number;
  cardioMinutes: number;
  averageReportedEffort?: number;
  averageSessionDurationMinutes?: number;
  discomfortFlags: number;
  readinessCounts: ReadinessCounts;
  completedTrainingDays: number;
  activeWeeks: number;
}

export interface CycleProgressSummary {
  facts: CycleReviewFacts;
  loggedSetCount: number;
}

export interface WeekSixGuidance {
  label: string;
  description: string;
  isReducedVolume: boolean;
}

export function evaluateReadiness(input: ReadinessInput): ReadinessDecision {
  if (input.discomfort) {
    return {
      label: 'consider technique/recovery session',
      action: 'hold-progression',
      reason: 'Discomfort was reported, so normal progression is paused for the affected movement.',
    };
  }

  if (input.energy <= 2 || input.soreness >= 4 || input.sleepQuality <= 2) {
    return {
      label: 'consider lighter volume',
      action: 'lighter-volume',
      reason: 'Energy, soreness, or sleep suggests keeping the session easier today.',
    };
  }

  return {
    label: 'normal plan',
    action: 'normal-plan',
    reason: 'No readiness flag requires a change to the planned session.',
  };
}

export function calculateNextTarget(input: ProgressionInput): ProgressionDecision {
  const target = cloneTarget(input.currentTarget);
  const readiness = evaluateReadiness(input.readiness);

  if (readiness.action !== 'normal-plan') {
    return holdDecision(target, readiness.reason);
  }

  if (input.completedSets.length === 0) {
    return holdDecision(target, 'There is not enough completed-set data to progress this target.');
  }

  if (input.completedSets.some((set) => set.discomfortFlag || set.formQuality === 'poor')) {
    return holdDecision(
      target,
      'A discomfort or form flag was recorded, so normal progression is paused for this movement.',
    );
  }

  const successful = input.completedSets.every(
    (set) => set.completed && set.formQuality !== 'poor',
  );
  if (!successful) {
    return holdDecision(
      target,
      'The prescribed work was not completed, so the current target stays in place.',
    );
  }

  switch (input.strategy) {
    case 'linear-load':
      return increaseLoad(
        target,
        input.loadIncrement ?? 0,
        'All prescribed work was completed with no safety flag.',
      );
    case 'double-progression':
      return doubleProgress(target, input);
    case 'rep-target':
      return repTargetProgress(target, input);
    case 'rpe-rir':
      return effortProgress(target, input);
    case 'volume':
      return {
        action: 'increase-volume',
        nextTarget: target,
        reason:
          'All prescribed work was completed; add one working set within the approved program bounds.',
        requiresUserConfirmation: true,
        setCountDelta: 1,
      };
    case 'density':
      return {
        action: 'increase-density',
        nextTarget: target,
        reason:
          'All prescribed work was completed; reduce the rest or improve work completed in the same time only within the approved bounds.',
        requiresUserConfirmation: true,
        densitySecondsDelta: -(input.durationIncrementSeconds ?? 10),
      };
    case 'time':
      return increaseTime(target, input.durationIncrementSeconds ?? 0);
    case 'distance':
      return increaseDistance(target, input.distanceIncrementMeters ?? 0);
    case 'cardio':
      return target.durationSeconds !== undefined
        ? increaseTime(target, input.durationIncrementSeconds ?? 0)
        : increaseDistance(target, input.distanceIncrementMeters ?? 0);
    case 'skill':
      return input.skillReady
        ? {
            action: 'progress-skill',
            nextTarget: target,
            reason:
              'The movement was completed with the required form; review the next skill variation.',
            requiresUserConfirmation: true,
          }
        : holdDecision(
            target,
            'Keep the current skill variation until form is consistently ready to progress.',
          );
    default:
      return holdDecision(target, 'This progression strategy has no deterministic rule yet.');
  }
}

export function detectPlateau(
  sessions: readonly SessionPerformance[],
  minimumComparableSessions = 3,
  minimumAdherence = 0.8,
): PlateauResult {
  const comparableSessions = sessions.filter(
    (session) => !session.scheduleOrEquipmentChanged && !session.discomfortFlag,
  );
  const plannedSessions = sessions.filter((session) => session.planned);
  const completedPlannedSessions = plannedSessions.filter((session) => session.completed);
  const adherenceRate =
    plannedSessions.length === 0 ? 0 : completedPlannedSessions.length / plannedSessions.length;

  if (comparableSessions.length < minimumComparableSessions || adherenceRate < minimumAdherence) {
    return {
      status: 'insufficient-data',
      comparableSessionCount: comparableSessions.length,
      adherenceRate,
      reason: 'There are not enough comparable, adequately completed sessions to call a plateau.',
    };
  }

  const allTargetsAttempted = comparableSessions.every((session) => session.targetAttempted);
  const noProgress = comparableSessions.every((session) => !session.progressed);
  if (allTargetsAttempted && noProgress) {
    return {
      status: 'plateau',
      comparableSessionCount: comparableSessions.length,
      adherenceRate,
      reason:
        'Comparable targets were attempted across multiple adequately completed sessions without progress.',
    };
  }

  return {
    status: 'no-plateau',
    comparableSessionCount: comparableSessions.length,
    adherenceRate,
    reason: 'The available sessions include progress or do not yet meet the plateau conditions.',
  };
}

export function buildCycleReviewFacts(
  plannedWorkoutCount: number,
  sessions: readonly CycleReviewSession[],
): CycleReviewFacts {
  const completedSessions = sessions.filter((session) => session.completed);
  const efforts = completedSessions
    .map((session) => session.effort)
    .filter((effort): effort is number => effort !== undefined);
  const durations = completedSessions
    .map((session) => session.durationMinutes)
    .filter((duration): duration is number => duration !== undefined);
  const personalRecordIds = [
    ...new Set(completedSessions.flatMap((session) => session.personalRecordIds ?? [])),
  ];
  const readinessCounts = sessions.reduce<ReadinessCounts>(
    (counts, session) => {
      if (session.readiness) counts[session.readiness] += 1;
      return counts;
    },
    { ready: 0, limited: 0, rest: 0 },
  );
  const completedTrainingDays = new Set(
    completedSessions.flatMap((session) => {
      const timestamp = session.completedAt ? Date.parse(session.completedAt) : Number.NaN;
      return Number.isFinite(timestamp) ? [new Date(timestamp).toISOString().slice(0, 10)] : [];
    }),
  ).size;
  const activeWeeks = new Set(
    completedSessions.flatMap((session) =>
      session.cycleWeek !== undefined && session.cycleWeek > 0 ? [session.cycleWeek] : [],
    ),
  ).size;
  const totalTrainingVolume = completedSessions.reduce(
    (total, session) =>
      total +
      (session.sets ?? []).reduce(
        (setTotal, set) => setTotal + (set.load ?? 0) * (set.reps ?? 0),
        0,
      ),
    0,
  );

  return {
    plannedWorkoutCount,
    completedWorkoutCount: completedSessions.length,
    completionRate: plannedWorkoutCount === 0 ? 0 : completedSessions.length / plannedWorkoutCount,
    progressionEvents: completedSessions.reduce(
      (total, session) => total + (session.progressionEvents ?? 0),
      0,
    ),
    regressions: completedSessions.reduce(
      (total, session) => total + (session.regressions ?? 0),
      0,
    ),
    personalRecordIds,
    totalTrainingVolume,
    cardioMinutes: completedSessions.reduce(
      (total, session) => total + (session.cardioMinutes ?? 0),
      0,
    ),
    averageReportedEffort: average(efforts),
    averageSessionDurationMinutes: average(durations),
    discomfortFlags: sessions.filter((session) => session.discomfortFlag).length,
    readinessCounts,
    completedTrainingDays,
    activeWeeks,
  };
}

export function buildCycleProgressSummary(
  plannedWorkoutCount: number,
  sessions: readonly CycleReviewSession[],
): CycleProgressSummary {
  return {
    facts: buildCycleReviewFacts(plannedWorkoutCount, sessions),
    loggedSetCount: sessions.reduce((total, session) => total + (session.sets?.length ?? 0), 0),
  };
}

export function getWeekSixGuidance(meaning: CycleModel['weekSixMeaning']): WeekSixGuidance {
  switch (meaning) {
    case 'evaluation':
      return {
        label: 'Evaluation week',
        description:
          'Use submaximal performance checks and review the block without forcing a max test.',
        isReducedVolume: false,
      };
    case 'consolidation':
      return {
        label: 'Consolidation week',
        description: 'Repeat useful work, keep technique crisp, and prepare the cycle review.',
        isReducedVolume: false,
      };
    case 'reduced-volume':
      return {
        label: 'Reduced-volume week',
        description:
          'Reduce planned volume according to the program while keeping movement practice.',
        isReducedVolume: true,
      };
    case 'rep-pr':
      return {
        label: 'Rep PR week',
        description: 'Offer controlled rep milestones without requiring a one-rep-max test.',
        isReducedVolume: false,
      };
    case 'technique':
      return {
        label: 'Technique week',
        description: 'Prioritize repeatable form, stable tempo, and useful written feedback.',
        isReducedVolume: false,
      };
    case 'normal-training':
      return {
        label: 'Normal training week',
        description: 'Continue the program as written, then review the full six-week record.',
        isReducedVolume: false,
      };
  }
}

function doubleProgress(target: SetTarget, input: ProgressionInput): ProgressionDecision {
  if (typeof target.reps !== 'object' || target.reps === undefined) {
    return increaseLoad(
      target,
      input.loadIncrement ?? 0,
      'All prescribed reps were completed; use the next approved load increment.',
    );
  }

  const repRange = target.reps;

  const reachedTop = input.completedSets.every(
    (set) => set.reps !== undefined && set.reps >= repRange.max,
  );
  if (reachedTop) {
    return increaseLoad(
      target,
      input.loadIncrement ?? 0,
      'All working sets reached the top of the rep range with no safety flag.',
    );
  }

  const nextMin = Math.min(repRange.max, repRange.min + 1);
  return {
    action: 'increase-reps',
    nextTarget: { ...target, reps: { min: nextMin, max: repRange.max } },
    reason:
      'The work was completed below the top of the range; add one rep before increasing load.',
    requiresUserConfirmation: false,
  };
}

function repTargetProgress(target: SetTarget, input: ProgressionInput): ProgressionDecision {
  const totalReps = input.completedSets.reduce((total, set) => total + (set.reps ?? 0), 0);
  if (input.totalRepTarget !== undefined && totalReps >= input.totalRepTarget) {
    return increaseLoad(
      target,
      input.loadIncrement ?? 0,
      'The total rep target was reached at the current load.',
    );
  }

  return holdDecision(target, 'Keep the load until the approved total-rep target is reached.');
}

function effortProgress(target: SetTarget, input: ProgressionInput): ProgressionDecision {
  const rpes = input.completedSets
    .map((set) => set.rpe)
    .filter((rpe): rpe is number => rpe !== undefined);
  const rirs = input.completedSets
    .map((set) => set.rir)
    .filter((rir): rir is number => rir !== undefined);
  const targetRpe = target.rpe;
  const targetRir = target.rir;
  const effortSupportsProgress =
    (targetRpe !== undefined && rpes.length > 0 && average(rpes)! <= targetRpe + 0.5) ||
    (targetRir !== undefined && rirs.length > 0 && average(rirs)! >= targetRir);

  return effortSupportsProgress
    ? increaseLoad(
        target,
        input.loadIncrement ?? 0,
        'Completed work stayed within the approved RPE/RIR reserve.',
      )
    : holdDecision(
        target,
        'Keep the target until effort data supports progression within the planned reserve.',
      );
}

function increaseLoad(target: SetTarget, increment: number, reason: string): ProgressionDecision {
  const currentLoad = target.load?.value;
  if (currentLoad === undefined || increment <= 0) {
    return holdDecision(
      target,
      'A starting load and a positive approved increment are required before increasing load.',
    );
  }

  return {
    action: 'increase-load',
    nextTarget: { ...target, load: { ...target.load!, value: currentLoad + increment } },
    reason,
    requiresUserConfirmation: false,
  };
}

function increaseTime(target: SetTarget, increment: number): ProgressionDecision {
  if (target.durationSeconds === undefined || increment <= 0) {
    return holdDecision(
      target,
      'A duration target and a positive approved increment are required before progressing time.',
    );
  }

  return {
    action: 'increase-time',
    nextTarget: { ...target, durationSeconds: target.durationSeconds + increment },
    reason:
      'The prescribed duration was completed; increase time conservatively within the program bounds.',
    requiresUserConfirmation: false,
  };
}

function increaseDistance(target: SetTarget, increment: number): ProgressionDecision {
  if (target.distanceMeters === undefined || increment <= 0) {
    return holdDecision(
      target,
      'A distance target and a positive approved increment are required before progressing distance.',
    );
  }

  return {
    action: 'increase-distance',
    nextTarget: { ...target, distanceMeters: target.distanceMeters + increment },
    reason:
      'The prescribed distance was completed; increase distance conservatively within the program bounds.',
    requiresUserConfirmation: false,
  };
}

function holdDecision(target: SetTarget, reason: string): ProgressionDecision {
  return {
    action: 'hold',
    nextTarget: target,
    reason,
    requiresUserConfirmation: false,
  };
}

function cloneTarget(target: SetTarget): SetTarget {
  return {
    ...target,
    reps: typeof target.reps === 'object' ? { ...target.reps } : target.reps,
    load: target.load ? { ...target.load } : undefined,
  };
}

function average(values: readonly number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((total, value) => total + value, 0) / values.length;
}
