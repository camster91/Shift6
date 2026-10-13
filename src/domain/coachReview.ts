import { addDaysToDateKey, parseDateKey } from './calendar';
import { lifecycleDate } from './cycleLifecycle';
import { stableSnapshotJSON } from './programPersistence';
import { evaluateShift, type Shift, type ShiftObservation, type ShiftProgress } from './shift';
import type { TrainingCycle, WorkoutSession } from './types';
import type { CoachNavigationCapability } from './coachCapabilities';

export interface CoachReviewWindow {
  startDate: string;
  endDate: string;
  timeZone: string;
}
export interface CoachReviewInput {
  ownerId: string;
  cycle: TrainingCycle;
  programVersionId: string;
  now: string;
  window: CoachReviewWindow;
  /** Canonical owned-cycle records; no synthetic planned sessions or inferred sets. */
  sessions: readonly WorkoutSession[];
  goal: Shift | null;
  observations: readonly ShiftObservation[];
}
export type CoachReviewChoice = 'keep-plan' | 'review-availability' | 'open-goal-review';
export interface CoachReviewQuestion {
  id: 'missing-baseline' | 'time-limited-stop';
  text: string;
  answers: readonly string[];
}
export interface CoachReviewResponse {
  questionId: CoachReviewQuestion['id'];
  answer: string;
}
type GoalComparison = Pick<
  ShiftProgress,
  | 'baseline'
  | 'latest'
  | 'change'
  | 'absoluteChange'
  | 'percentChange'
  | 'attainment'
  | 'baselineAlreadyMet'
  | 'excludedObservationIds'
>;
export interface CoachReviewSnapshot {
  ownerId: string;
  cycleId: string;
  programVersionId: string;
  preparedAt: string;
  window: CoachReviewWindow;
  /** Exact canonical evidence key, not a lossy hash; local only, never provider context. */
  evidenceFingerprint: string;
  training: {
    complete: number;
    partial: number;
    skipped: number;
    inProgress: number;
    otherRecords: number;
    sourceSessionIds: string[];
    plannedCoverage: 'unavailable';
    adherence: null;
  };
  goal: {
    state:
      | 'no-goal'
      | 'missing-baseline'
      | 'deferred-baseline'
      | 'not-yet-able'
      | 'protocol-mismatch'
      | 'insufficient-data'
      | 'comparable';
    comparisonBasis: 'explicit-baseline-to-latest';
    comparison: GoalComparison | null;
  };
  reportedDiscomfort: boolean;
  question: CoachReviewQuestion | null;
}
export interface CoachReviewPreview {
  ownerId: string;
  cycleId: string;
  programVersionId: string;
  preparedAt: string;
  window: CoachReviewWindow;
  evidenceFingerprint: string;
  choice: CoachReviewChoice;
  response: CoachReviewResponse | null;
  effect: 'keep-current-plan' | 'open-existing-workflow';
}

function identifier(value: string) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 1024 ||
    /[\u0000-\u001f]/.test(value)
  )
    throw new Error('Use a valid owned review binding.');
}
function instant(value: string) {
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw new Error('Use a canonical UTC review time.');
}
function boundedUnique<T extends { id: string }>(records: readonly T[]) {
  if (records.length > 1000)
    throw new Error('This review needs a bounded canonical record packet.');
  const ids = new Set<string>();
  for (const record of records) {
    identifier(record.id);
    if (ids.has(record.id)) throw new Error('Duplicate review evidence is ambiguous.');
    ids.add(record.id);
  }
}

/** Pure read-only view. The repository must load a consistent owned snapshot. */
export function prepareCoachReview(input: CoachReviewInput): CoachReviewSnapshot {
  const { ownerId, cycle, programVersionId, now, window, sessions, goal, observations } = input;
  [ownerId, cycle.id, cycle.userId, programVersionId].forEach(identifier);
  instant(now);
  instant(cycle.startedAt);
  if (
    cycle.userId !== ownerId ||
    cycle.programVersionId !== programVersionId ||
    cycle.startedAt > now
  )
    throw new Error('Review owner, cycle and source version must agree.');
  if (
    cycle.weeks.length < 1 ||
    cycle.weeks.length > 6 ||
    new Set(cycle.weeks.map((week) => week.weekNumber)).size !== cycle.weeks.length ||
    cycle.weeks.some(
      (week) => !Number.isInteger(week.weekNumber) || week.weekNumber < 1 || week.weekNumber > 6,
    ) ||
    !cycle.weeks.some((week) => week.weekNumber === cycle.currentWeek)
  )
    throw new Error('Review cycle weeks must be bounded and unambiguous.');
  identifier(window.timeZone);
  parseDateKey(window.startDate);
  parseDateKey(window.endDate);
  const today = lifecycleDate(now, window.timeZone);
  if (
    window.startDate > window.endDate ||
    window.endDate > today ||
    window.endDate > addDaysToDateKey(window.startDate, 6)
  )
    throw new Error('Choose an explicit review window of at most seven elapsed local dates.');
  boundedUnique(sessions);
  boundedUnique(observations);
  for (const session of sessions) {
    [session.workoutId, session.programVersionId].forEach(identifier);
    instant(session.startedAt);
    if (session.completedAt) instant(session.completedAt);
    if (
      session.cycleId !== cycle.id ||
      !Number.isInteger(session.cycleWeek) ||
      !cycle.weeks.some((week) => week.weekNumber === session.cycleWeek) ||
      (session.completedAt && session.completedAt < session.startedAt) ||
      !['planned', 'in-progress', 'complete', 'partial', 'skipped', 'abandoned'].includes(
        session.status,
      )
    )
      throw new Error('Session evidence does not belong to this review cycle.');
    if (
      session.status !== 'planned' &&
      (session.startedAt > now || (session.completedAt && session.completedAt > now))
    )
      throw new Error('Future session records cannot establish current review evidence.');
  }
  const selected = sessions
    .filter((session) => {
      if (session.startedAt > now) return false;
      const date = lifecycleDate(session.startedAt, window.timeZone);
      return date >= window.startDate && date <= window.endDate;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  const training: CoachReviewSnapshot['training'] = {
    complete: selected.filter((session) => session.status === 'complete').length,
    partial: selected.filter((session) => session.status === 'partial').length,
    skipped: selected.filter((session) => session.status === 'skipped').length,
    inProgress: selected.filter((session) => session.status === 'in-progress').length,
    otherRecords: selected.filter((session) => ['planned', 'abandoned'].includes(session.status))
      .length,
    sourceSessionIds: selected.map((session) => session.id),
    plannedCoverage: 'unavailable',
    adherence: null,
  };
  for (const observation of observations) {
    if (!goal || observation.shiftId !== goal.id)
      throw new Error('Goal evidence belongs to another goal.');
    instant(observation.measuredAt);
  }
  const measured = observations
    .filter((observation) => observation.measuredAt <= now)
    .sort((a, b) => a.id.localeCompare(b.id));
  let goalEvidence: CoachReviewSnapshot['goal'] = {
    state: 'no-goal',
    comparisonBasis: 'explicit-baseline-to-latest',
    comparison: null,
  };
  if (goal) {
    const progress = evaluateShift(goal, cycle, measured);
    const {
      baseline,
      latest,
      change,
      absoluteChange,
      percentChange,
      attainment,
      baselineAlreadyMet,
      excludedObservationIds,
    } = progress;
    const baselineId = goal.baseline.state === 'measured' ? goal.baseline.observationId : null;
    const baselineRecord = baselineId
      ? measured.find((observation) => observation.id === baselineId)
      : undefined;
    const state: CoachReviewSnapshot['goal']['state'] =
      goal.baseline.state === 'deferred'
        ? 'deferred-baseline'
        : goal.baseline.state === 'not-yet-able'
          ? 'not-yet-able'
          : goal.baseline.state === 'missing'
            ? 'missing-baseline'
            : !baseline &&
                baselineRecord &&
                (baselineRecord.protocolId !== goal.protocol.id ||
                  baselineRecord.protocolVersion !== goal.protocol.version)
              ? 'protocol-mismatch'
              : !baseline
                ? 'missing-baseline'
                : !latest ||
                    latest.observationId === baseline.observationId ||
                    ['not-comparable', 'not-tested', 'insufficient-data'].includes(change)
                  ? 'insufficient-data'
                  : 'comparable';
    goalEvidence = {
      state,
      comparisonBasis: 'explicit-baseline-to-latest',
      comparison: {
        baseline,
        latest,
        change,
        absoluteChange,
        percentChange,
        attainment,
        baselineAlreadyMet,
        excludedObservationIds,
      },
    };
  }
  const reportedDiscomfort = selected.some((session) => session.completionReason === 'discomfort');
  const question: CoachReviewQuestion | null = reportedDiscomfort
    ? null
    : goalEvidence.state === 'missing-baseline' &&
        goal?.reviewState !== 'declined' &&
        goal?.reviewState !== 'postponed'
      ? {
          id: 'missing-baseline',
          text: 'Would you like to review your goal baseline, or leave it for later?',
          answers: ['review-baseline', 'leave-for-later', 'skip'],
        }
      : selected.some(
            (session) =>
              session.status === 'partial' && session.completionReason === 'time-limited',
          )
        ? {
            id: 'time-limited-stop',
            text: 'Would you like to review your available training time?',
            answers: ['review-availability', 'keep-plan', 'skip'],
          }
        : null;
  const evidenceFingerprint = stableSnapshotJSON({
    format: 'local-dated-review-v1',
    ownerId,
    cycle,
    programVersionId,
    window,
    sessions: sessions
      .map(
        ({
          id,
          cycleId,
          programVersionId,
          workoutId,
          cycleWeek,
          status,
          startedAt,
          completedAt,
          completionReason,
          readiness,
        }) => ({
          id,
          cycleId,
          programVersionId,
          workoutId,
          cycleWeek,
          status,
          startedAt,
          completedAt,
          completionReason,
          readiness,
        }),
      )
      .sort((a, b) => a.id.localeCompare(b.id)),
    goal,
    observations: measured,
  });
  return {
    ownerId,
    cycleId: cycle.id,
    programVersionId,
    preparedAt: now,
    window: { ...window },
    evidenceFingerprint,
    training,
    goal: goalEvidence,
    reportedDiscomfort,
    question,
  };
}

function validResponse(review: CoachReviewSnapshot, response: CoachReviewResponse | null) {
  if (
    response &&
    (!review.question ||
      response.questionId !== review.question.id ||
      !review.question.answers.includes(response.answer))
  )
    throw new Error('The optional question changed. Review it again or skip.');
}
function validChoice(choice: CoachReviewChoice) {
  if (!['keep-plan', 'review-availability', 'open-goal-review'].includes(choice))
    throw new Error('That review choice is not supported.');
}
/** Answers/skip are review draft context only: no memory, baseline or plan update. */
export function previewCoachReviewChoice(
  review: CoachReviewSnapshot,
  choice: CoachReviewChoice,
  response: CoachReviewResponse | null = null,
): CoachReviewPreview {
  validChoice(choice);
  validResponse(review, response);
  return {
    ownerId: review.ownerId,
    cycleId: review.cycleId,
    programVersionId: review.programVersionId,
    preparedAt: review.preparedAt,
    window: { ...review.window },
    evidenceFingerprint: review.evidenceFingerprint,
    choice,
    response: response ? { ...response } : null,
    effect: choice === 'keep-plan' ? 'keep-current-plan' : 'open-existing-workflow',
  };
}
/** Revalidate against a fresh canonical read before a future exclusive journal write. */
export function confirmCoachReviewChoice(
  preview: CoachReviewPreview,
  fresh: CoachReviewSnapshot,
  confirmedAt: string,
  confirmed: true,
) {
  if (confirmed !== true) throw new Error('Confirm the visible review choice first.');
  instant(confirmedAt);
  if (
    confirmedAt < preview.preparedAt ||
    confirmedAt < fresh.preparedAt ||
    preview.ownerId !== fresh.ownerId ||
    preview.cycleId !== fresh.cycleId ||
    preview.programVersionId !== fresh.programVersionId ||
    preview.evidenceFingerprint !== fresh.evidenceFingerprint ||
    stableSnapshotJSON(preview.window) !== stableSnapshotJSON(fresh.window)
  )
    throw new Error('Review evidence or ownership changed. Refresh before confirming.');
  validChoice(preview.choice);
  validResponse(fresh, preview.response);
  const nextCapability: CoachNavigationCapability | null =
    preview.choice === 'review-availability'
      ? 'open-setup'
      : preview.choice === 'open-goal-review'
        ? 'open-goal'
        : null;
  return {
    ...previewCoachReviewChoice(fresh, preview.choice, preview.response),
    preparedAt: preview.preparedAt,
    revalidatedAt: fresh.preparedAt,
    confirmedAt,
    status: 'confirmed-intent' as const,
    nextCapability,
    requiresWorkflowConfirmation: nextCapability !== null,
  };
}
