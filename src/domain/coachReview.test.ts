import { demoCycle } from './fixtures/home';
import type { Shift, ShiftObservation } from './shift';
import type { WorkoutSession } from './types';
import {
  prepareCoachReview,
  previewCoachReviewChoice,
  confirmCoachReviewChoice,
  type CoachReviewInput,
} from './coachReview';

const now = '2026-10-13T16:00:00.000Z';
const cycle = { ...demoCycle, userId: 'guest-user' };
const session = (
  id: string,
  status: WorkoutSession['status'],
  startedAt = '2026-10-12T12:00:00.000Z',
): WorkoutSession => ({
  id,
  status,
  startedAt,
  cycleId: cycle.id,
  cycleWeek: 1,
  workoutId: 'private-workout',
  programVersionId: cycle.programVersionId,
  workoutFocus: 'mixed',
  isOffline: true,
  ...(status === 'complete' ? { completedAt: '2026-10-12T13:00:00.000Z' } : {}),
});
const goal: Shift = {
  id: 'personal-goal',
  userId: cycle.userId,
  cycleId: cycle.id,
  programVersionId: cycle.programVersionId,
  templateId: 'personal-entry-v1',
  blockObjective: 'Synthetic measured goal',
  target: 110,
  protocol: {
    id: 'protocol',
    version: 1,
    exerciseId: 'private-movement',
    variantId: 'same-variant',
    assistance: 'none',
    equipmentSetup: 'same setup',
    metric: 'load-for-reps',
    canonicalUnit: 'kg',
    direction: 'higher',
    repCount: 5,
  },
  baseline: { state: 'measured', observationId: 'baseline' },
  reviewState: 'missing',
  nextChoice: 'undecided',
};
const observation = (id: string, value: number, measuredAt: string): ShiftObservation => ({
  id,
  value,
  measuredAt,
  shiftId: goal.id,
  protocolId: goal.protocol.id,
  protocolVersion: 1,
  unit: 'kg',
  source: 'assessment',
});
const baseline = observation('baseline', 90, '2026-10-01T12:00:00.000Z');
const latest = observation('latest', 100, '2026-10-12T12:00:00.000Z');
const input = (overrides: Partial<CoachReviewInput> = {}): CoachReviewInput => ({
  ownerId: cycle.userId,
  cycle,
  programVersionId: cycle.programVersionId,
  now,
  window: { startDate: '2026-10-07', endDate: '2026-10-13', timeZone: 'America/Toronto' },
  sessions: [],
  goal: null,
  observations: [],
  ...overrides,
});

test('dated counts separate real complete/partial/skipped/in-progress records and never invent adherence', () => {
  const snapshot = prepareCoachReview(
    input({
      sessions: [
        session('complete', 'complete'),
        session('partial', 'partial'),
        session('skipped', 'skipped'),
        session('live', 'in-progress'),
        session('planned', 'planned'),
        session('abandoned', 'abandoned'),
        session('outside', 'complete', '2026-10-06T12:00:00.000Z'),
      ],
    }),
  );
  expect(snapshot.training).toMatchObject({
    complete: 1,
    partial: 1,
    skipped: 1,
    inProgress: 1,
    otherRecords: 2,
    adherence: null,
    plannedCoverage: 'unavailable',
  });
  expect(snapshot.training.sourceSessionIds).not.toContain('outside');
  expect(snapshot.goal.state).toBe('no-goal');
  expect(snapshot.question).toBeNull();
});

test('occurrence dates use the explicit zone across DST, not the later completion date or host zone', () => {
  const snapshot = prepareCoachReview(
    input({
      now: '2026-11-07T12:00:00.000Z',
      window: { startDate: '2026-11-01', endDate: '2026-11-07', timeZone: 'America/Toronto' },
      sessions: [
        {
          ...session('october-local', 'complete', '2026-11-01T03:30:00.000Z'),
          completedAt: '2026-11-02T12:00:00.000Z',
        },
        session('november-local', 'partial', '2026-11-01T04:30:00.000Z'),
      ],
    }),
  );
  expect(snapshot.training.complete).toBe(0);
  expect(snapshot.training.partial).toBe(1);
  expect(snapshot.training.sourceSessionIds).toEqual(['november-local']);
});

test.each([
  { startDate: '2026-10-01', endDate: '2026-10-13', timeZone: 'America/Toronto' },
  { startDate: '2026-10-13', endDate: '2026-10-12', timeZone: 'America/Toronto' },
  { startDate: '2026-10-08', endDate: '2026-10-14', timeZone: 'America/Toronto' },
  { startDate: '2026-10-07', endDate: '2026-10-13', timeZone: 'Unknown/Zone' },
])('invalid, future or unbounded window refuses evidence (%j)', (window) => {
  expect(() => prepareCoachReview(input({ window }))).toThrow();
});

test('foreign/duplicate/future session evidence and foreign goal observations fail closed', () => {
  expect(() => prepareCoachReview(input({ ownerId: 'another-owner' }))).toThrow();
  expect(() => prepareCoachReview(input({ programVersionId: 'another-version' }))).toThrow();
  expect(() =>
    prepareCoachReview(input({ sessions: [{ ...session('x', 'complete'), cycleId: 'foreign' }] })),
  ).toThrow();
  expect(() =>
    prepareCoachReview(input({ sessions: [session('x', 'complete'), session('x', 'complete')] })),
  ).toThrow();
  expect(() =>
    prepareCoachReview(input({ sessions: [session('x', 'partial', '2026-10-14T12:00:00.000Z')] })),
  ).toThrow();
  expect(() =>
    prepareCoachReview(input({ goal, observations: [{ ...baseline, shiftId: 'foreign' }] })),
  ).toThrow();
  expect(() =>
    prepareCoachReview(
      input({
        sessions: Array.from({ length: 1001 }, (_, index) => session(String(index), 'partial')),
      }),
    ),
  ).toThrow();
});

test.each(['missing', 'deferred', 'not-yet-able'] as const)(
  'explicit %s baseline is not promoted to an inferred improvement',
  (state) => {
    const snapshot = prepareCoachReview(
      input({ goal: { ...goal, baseline: { state } }, observations: [latest] }),
    );
    expect(snapshot.goal.comparison?.baseline).toBeNull();
    expect(snapshot.goal.comparison?.absoluteChange).toBeNull();
    expect(snapshot.goal.comparison?.change).not.toBe('improved');
    expect(snapshot.question?.id ?? null).toBe(state === 'missing' ? 'missing-baseline' : null);
  },
);

test('changed measurement protocol excludes the old baseline and refuses a gain claim', () => {
  const changed = {
    ...goal,
    protocol: { ...goal.protocol, version: 2, variantId: 'different-variant' },
  };
  const snapshot = prepareCoachReview(
    input({ goal: changed, observations: [baseline, { ...latest, protocolVersion: 2 }] }),
  );
  expect(snapshot.goal.state).toBe('protocol-mismatch');
  expect(snapshot.goal.comparison).toMatchObject({
    baseline: null,
    change: 'not-comparable',
    absoluteChange: null,
  });
  expect(snapshot.goal.comparison?.excludedObservationIds).toContain('baseline');
});

test('corrections use the canonical evaluator and original measured date without altering source observations', () => {
  const correction = { ...observation('correction', 95, now), correctsObservationId: latest.id };
  const source = input({ goal, observations: [correction, baseline, latest] });
  const before = structuredClone(source);
  const snapshot = prepareCoachReview(source);
  expect(snapshot.goal.state).toBe('comparable');
  expect(snapshot.goal.comparison).toMatchObject({
    change: 'improved',
    absoluteChange: 5,
    latest: { observationId: 'correction', measuredAt: latest.measuredAt, canonicalValue: 95 },
  });
  expect(snapshot.goal.comparisonBasis).toBe('explicit-baseline-to-latest');
  expect(source).toEqual(before);
  expect(
    prepareCoachReview(input({ goal, observations: [latest, baseline, correction] }))
      .evidenceFingerprint,
  ).toBe(snapshot.evidenceFingerprint);
});

test('early attainment remains measured goal evidence, never block completion or a promised seven-day gain', () => {
  const snapshot = prepareCoachReview(
    input({ goal: { ...goal, target: 80 }, observations: [baseline] }),
  );
  expect(snapshot.goal.comparison).toMatchObject({
    baselineAlreadyMet: true,
    attainment: 'met',
    absoluteChange: null,
  });
  expect(snapshot.training.complete).toBe(0);
});

test.each(['declined', 'postponed'] as const)(
  'an explicitly %s goal review does not prompt another baseline test',
  (reviewState) => {
    const snapshot = prepareCoachReview(
      input({ goal: { ...goal, reviewState, baseline: { state: 'missing' } } }),
    );
    expect(snapshot.goal.state).toBe('missing-baseline');
    expect(snapshot.question).toBeNull();
  },
);

test('future observations do not establish current gains or enter the current evidence key', () => {
  const before = prepareCoachReview(input({ goal, observations: [baseline] }));
  const future = observation('future', 500, '2026-10-14T12:00:00.000Z');
  const withFuture = prepareCoachReview(input({ goal, observations: [baseline, future] }));
  expect(withFuture.goal.comparison?.latest?.observationId).toBe(baseline.id);
  expect(withFuture.goal.comparison?.absoluteChange).toBeNull();
  expect(withFuture.evidenceFingerprint).toBe(before.evidenceFingerprint);
});

test('one practical question is conditional and skippable; discomfort does not become optimization', () => {
  const timedStop = { ...session('stop', 'partial'), completionReason: 'time-limited' as const };
  const snapshot = prepareCoachReview(input({ sessions: [timedStop] }));
  expect(snapshot.question?.id).toBe('time-limited-stop');
  const preview = previewCoachReviewChoice(snapshot, 'keep-plan', {
    questionId: 'time-limited-stop',
    answer: 'skip',
  });
  expect(preview.effect).toBe('keep-current-plan');
  expect(preview.response?.answer).toBe('skip');
  expect(prepareCoachReview(input({ sessions: [session('poor', 'partial')] })).question).toBeNull();
  const discomfort = prepareCoachReview(
    input({
      sessions: [{ ...timedStop, completionReason: 'discomfort' }],
      goal: { ...goal, baseline: { state: 'missing' } },
    }),
  );
  expect(discomfort.reportedDiscomfort).toBe(true);
  expect(discomfort.question).toBeNull();
});

test('question answer is draft-only and confirmation produces a navigation intent, not an applied change', () => {
  const source = input({ goal: { ...goal, baseline: { state: 'missing' } } });
  const before = structuredClone(source);
  const snapshot = prepareCoachReview(source);
  const preview = previewCoachReviewChoice(snapshot, 'open-goal-review', {
    questionId: 'missing-baseline',
    answer: 'review-baseline',
  });
  const fresh = prepareCoachReview({ ...source, now: '2026-10-13T16:01:00.000Z' });
  const receipt = confirmCoachReviewChoice(preview, fresh, '2026-10-13T16:02:00.000Z', true);
  expect(receipt).toMatchObject({
    status: 'confirmed-intent',
    preparedAt: now,
    revalidatedAt: '2026-10-13T16:01:00.000Z',
    nextCapability: 'open-goal',
    requiresWorkflowConfirmation: true,
  });
  expect(source).toEqual(before);
  expect(
    confirmCoachReviewChoice(
      previewCoachReviewChoice(snapshot, 'keep-plan'),
      fresh,
      '2026-10-13T16:02:00.000Z',
      true,
    ),
  ).toMatchObject({ nextCapability: null, requiresWorkflowConfirmation: false });
  expect(() =>
    previewCoachReviewChoice(snapshot, 'keep-plan', {
      questionId: 'time-limited-stop',
      answer: 'skip',
    }),
  ).toThrow();
});

test('fresh evidence and exact ownership/version/window are required before confirmation', () => {
  const source = input({ sessions: [session('x', 'in-progress')] });
  const snapshot = prepareCoachReview(source);
  const preview = previewCoachReviewChoice(snapshot, 'review-availability');
  for (const changed of [
    { ...snapshot, ownerId: 'other' },
    { ...snapshot, cycleId: 'other' },
    { ...snapshot, programVersionId: 'other' },
    { ...snapshot, window: { ...snapshot.window, startDate: '2026-10-08' } },
    prepareCoachReview({ ...source, sessions: [session('x', 'partial')] }),
  ])
    expect(() => confirmCoachReviewChoice(preview, changed, now, true)).toThrow();
  expect(() => confirmCoachReviewChoice(preview, snapshot, now, false as true)).toThrow();
  expect(() =>
    confirmCoachReviewChoice(preview, snapshot, '2026-10-13T15:59:00.000Z', true),
  ).toThrow();
  expect(snapshot.evidenceFingerprint).not.toContain('note');
});
