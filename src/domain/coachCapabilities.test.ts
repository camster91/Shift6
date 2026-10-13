import { selectCoachWorkout, availableCoachCapabilities } from './coachCapabilities';
import { demoProgramVersion } from './fixtures/home';
import { createTrainingCycle } from './cycle';
import type { WorkoutScheduleOverride } from './types';
const version = {
  ...demoProgramVersion,
  workouts: [
    { ...demoProgramVersion.workouts[0]!, id: 'first', dayOfWeek: 1 },
    { ...demoProgramVersion.workouts[0]!, id: 'second', dayOfWeek: 2 },
  ],
};
const cycle = createTrainingCycle({
  id: 'cycle',
  userId: 'owner',
  programVersion: version,
  startedAt: '2026-10-12T12:00:00.000Z',
});
const now = new Date('2026-10-13T12:00:00.000Z');
test('today uses the saved cycle schedule rather than the first workout', () => {
  expect(selectCoachWorkout(cycle, version, [], [], now)?.workout.id).toBe('second');
});
test('resumable attempt wins even when the same occurrence has a prior partial attempt', () => {
  expect(
    selectCoachWorkout(
      cycle,
      version,
      [],
      [
        { cycleWeek: 1, workoutId: 'first', status: 'partial' },
        { cycleWeek: 1, workoutId: 'first', status: 'in-progress' },
      ],
      now,
    ),
  ).toMatchObject({ workout: { id: 'first' }, basis: 'resumable' });
});
test('saved rescheduling is respected with no weekday fallback', () => {
  const override = {
    id: 'move',
    userId: 'owner',
    cycleId: 'cycle',
    cycleWeek: 1,
    workoutId: 'second',
    originalDate: '2026-10-13',
    scheduledDate: '2026-10-15',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  } satisfies WorkoutScheduleOverride;
  expect(selectCoachWorkout(cycle, version, [override], [], now)).toBeNull();
});
test('paused or mismatched versions do not offer a workout', () => {
  expect(selectCoachWorkout({ ...cycle, status: 'paused' }, version, [], [], now)).toBeNull();
  expect(
    selectCoachWorkout({ ...cycle, programVersionId: 'other' }, version, [], [], now),
  ).toBeNull();
});
test('completed or skipped occurrences are not presented as today training', () => {
  expect(
    selectCoachWorkout(
      cycle,
      version,
      [],
      [{ cycleWeek: 1, workoutId: 'second', status: 'complete' }],
      now,
    ),
  ).toBeNull();
});
test('pre-cycle controls expose setup and honest unavailable reasons without a fabricated cycle', () => {
  const actions = availableCoachCapabilities({
    hasProfile: false,
    hasCycle: false,
    selection: null,
    guidanceId: null,
  });
  expect(actions.find((action) => action.id === 'open-setup')).toMatchObject({
    label: 'Continue setup',
    available: true,
  });
  expect(actions.find((action) => action.id === 'build-private-plan')?.available).toBe(false);
  expect(actions.find((action) => action.id === 'open-workout-controls')).toMatchObject({
    available: false,
    reason: expect.stringContaining('No scheduled or resumable'),
  });
});
