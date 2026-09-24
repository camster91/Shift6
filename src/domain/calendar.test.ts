import { demoCycle, demoProgramVersion } from './fixtures/home';
import {
  addDaysToDateKey,
  buildCycleSchedule,
  buildCurrentCycleWeekSchedule,
  buildWorkoutScheduleOverrideId,
  canMoveScheduleOccurrence,
  formatDateKey,
  getPlannedWorkoutDateKey,
  parseDateKey,
} from './calendar';

describe('calendar domain', () => {
  it('uses local date keys and keeps date arithmetic stable across DST boundaries', () => {
    expect(formatDateKey(new Date(2026, 2, 8, 23, 30))).toBe('2026-03-08');
    expect(addDaysToDateKey('2026-03-08', 1)).toBe('2026-03-09');
    expect(formatDateKey(parseDateKey('2026-11-01'))).toBe('2026-11-01');
  });

  it('builds six-week occurrences from the cycle start and marks moved sessions', () => {
    const movedWorkout = demoProgramVersion.workouts[0]!;
    const originalDate = getPlannedWorkoutDateKey(demoCycle, 1, movedWorkout);
    const schedule = buildCycleSchedule(
      demoCycle,
      demoProgramVersion,
      [
        {
          id: buildWorkoutScheduleOverrideId(demoCycle.id, 1, movedWorkout.id),
          userId: demoCycle.userId,
          cycleId: demoCycle.id,
          cycleWeek: 1,
          workoutId: movedWorkout.id,
          originalDate,
          scheduledDate: addDaysToDateKey(originalDate, 2),
          createdAt: '2026-09-13T12:00:00.000Z',
          updatedAt: '2026-09-13T12:00:00.000Z',
        },
      ],
      [],
      parseDateKey('2026-09-14'),
    );

    expect(schedule).toHaveLength(30);
    expect(
      schedule.find((item) => item.workout.id === movedWorkout.id && item.cycleWeek === 1),
    ).toMatchObject({
      originalDate,
      scheduledDate: addDaysToDateKey(originalDate, 2),
      isMoved: true,
      status: 'upcoming',
    });
    expect(
      schedule.find((item) => item.workout.id === movedWorkout.id && item.cycleWeek === 2)
        ?.scheduledDate,
    ).toBe(addDaysToDateKey(originalDate, 7));
  });

  it('prefers terminal session outcomes and does not infer a missed workout after a skip', () => {
    const workout = demoProgramVersion.workouts[0]!;
    const schedule = buildCycleSchedule(
      demoCycle,
      demoProgramVersion,
      [],
      [
        { cycleWeek: 1, workoutId: workout.id, status: 'skipped' },
        { cycleWeek: 1, workoutId: workout.id, status: 'complete' },
      ],
      parseDateKey('2026-09-30'),
    );

    expect(
      schedule.find((item) => item.workout.id === workout.id && item.cycleWeek === 1)?.status,
    ).toBe('complete');
  });

  it('projects the active cycle week back into the home schedule after a move', () => {
    const workout = demoProgramVersion.workouts[0]!;
    const originalDate = getPlannedWorkoutDateKey(demoCycle, 1, workout);
    const schedule = buildCurrentCycleWeekSchedule(
      demoCycle,
      demoProgramVersion,
      [
        {
          id: buildWorkoutScheduleOverrideId(demoCycle.id, 1, workout.id),
          userId: demoCycle.userId,
          cycleId: demoCycle.id,
          cycleWeek: 1,
          workoutId: workout.id,
          originalDate,
          scheduledDate: addDaysToDateKey(originalDate, 1),
          createdAt: '2026-09-13T12:00:00.000Z',
          updatedAt: '2026-09-13T12:00:00.000Z',
        },
      ],
      [],
      parseDateKey('2026-09-14'),
    );

    expect(schedule.find((entry) => entry.workoutId === workout.id)).toMatchObject({
      date: addDaysToDateKey(originalDate, 1),
      title: workout.title,
      status: 'current',
    });
  });

  it('bounds one-day moves to the same cycle week and never moves before today', () => {
    const workout = demoProgramVersion.workouts[0]!;
    const occurrence = buildCycleSchedule(
      demoCycle,
      demoProgramVersion,
      [],
      [],
      parseDateKey('2026-09-14'),
    ).find((item) => item.workout.id === workout.id && item.cycleWeek === 1)!;

    expect(canMoveScheduleOccurrence(occurrence, '2026-09-14', 1)).toBe(true);
    expect(canMoveScheduleOccurrence(occurrence, '2026-09-14', -1)).toBe(false);
    expect(canMoveScheduleOccurrence(occurrence, '2026-09-14', 2)).toBe(false);
  });
});
