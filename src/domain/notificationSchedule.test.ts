import { demoCycle, demoProgramVersion } from './fixtures/home';
import { buildWorkoutReminderSchedule, preferredTrainingTimeClock } from './notificationSchedule';

describe('workout reminder schedule', () => {
  const cycle = { ...demoCycle, startedAt: new Date(2026, 8, 14, 12).toISOString() };

  it('keeps private plan names, dates, weeks and durations out of visible reminder text', () => {
    const version = {
      ...demoProgramVersion,
      workouts: demoProgramVersion.workouts.map((workout) => ({
        ...workout,
        title: 'Private injury recovery for Alex',
        estimatedDurationMinutes: 47,
      })),
    };
    const reminders = buildWorkoutReminderSchedule({
      userId: 'guest-user',
      preferences: { workoutReminders: true },
      cycle,
      programVersion: version,
      preferredTrainingTime: 'morning',
      now: new Date(2026, 8, 14, 7, 30),
    });
    expect(reminders.length).toBeGreaterThan(0);
    for (const reminder of reminders) {
      expect(reminder.title).toBe('SHIFT6 reminder');
      expect(reminder.body).toBe('Open SHIFT6 when you are ready.');
    }
  });

  it('creates stable one-shot reminders for upcoming workouts in the preferred window', () => {
    const reminders = buildWorkoutReminderSchedule({
      userId: 'guest-user',
      preferences: { workoutReminders: true },
      cycle,
      programVersion: demoProgramVersion,
      preferredTrainingTime: 'morning',
      now: new Date(2026, 8, 14, 7, 30),
      lookaheadDays: 7,
    });

    expect(reminders.map((reminder) => reminder.workoutId)).toEqual([
      'workout-barbell-30-strength-a',
      'workout-barbell-30-cardio-a',
      'workout-barbell-30-strength-b',
      'workout-barbell-30-cardio-b',
      'workout-barbell-30-strength-c',
    ]);
    expect(new Date(reminders[0]!.scheduledFor).getHours()).toBe(
      preferredTrainingTimeClock.morning.hour,
    );
    expect(reminders[0]).toMatchObject({
      id: expect.stringContaining('shift6:workout-reminder:guest-user:'),
      kind: 'workout-reminder',
      cycleId: demoCycle.id,
      cycleWeek: 1,
      deepLink: '/workout?workoutId=workout-barbell-30-strength-a',
    });
  });

  it('skips a reminder whose preferred time has already passed today', () => {
    const reminders = buildWorkoutReminderSchedule({
      userId: 'guest-user',
      preferences: { workoutReminders: true },
      cycle,
      programVersion: demoProgramVersion,
      preferredTrainingTime: 'evening',
      now: new Date(2026, 8, 14, 19, 0),
      lookaheadDays: 7,
    });

    expect(reminders.map((reminder) => reminder.workoutId)).toEqual([
      'workout-barbell-30-cardio-a',
      'workout-barbell-30-strength-b',
      'workout-barbell-30-cardio-b',
      'workout-barbell-30-strength-c',
    ]);
  });

  it('fails closed for disabled, inactive, or mismatched cycle inputs', () => {
    expect(
      buildWorkoutReminderSchedule({
        userId: 'guest-user',
        preferences: { workoutReminders: false },
        cycle,
        programVersion: demoProgramVersion,
        preferredTrainingTime: 'morning',
        now: new Date(2026, 8, 14, 7, 30),
      }),
    ).toEqual([]);

    expect(
      buildWorkoutReminderSchedule({
        userId: 'guest-user',
        preferences: { workoutReminders: true },
        cycle: { ...cycle, status: 'complete' },
        programVersion: demoProgramVersion,
        preferredTrainingTime: 'morning',
        now: new Date(2026, 8, 14, 7, 30),
      }),
    ).toEqual([]);

    expect(() =>
      buildWorkoutReminderSchedule({
        userId: 'guest-user',
        preferences: { workoutReminders: true },
        cycle: { ...cycle, programVersionId: 'different-version' },
        programVersion: demoProgramVersion,
        preferredTrainingTime: 'morning',
        now: new Date(2026, 8, 14, 7, 30),
      }),
    ).toThrow('must match the active cycle');
  });
});
import { buildCycleSchedule, formatDateKey } from './calendar';
import type { WorkoutScheduleOverride } from './types';

test('a Wednesday-starting cycle reminders use saved calendar day slots, not Monday weekday matching', () => {
  const cycle = { ...demoCycle, startedAt: new Date(2026, 9, 14, 12).toISOString() };
  const now = new Date(2026, 9, 14, 7);
  const reminders = buildWorkoutReminderSchedule({
    userId: 'guest-user',
    preferences: { workoutReminders: true },
    cycle,
    programVersion: demoProgramVersion,
    preferredTrainingTime: 'morning',
    now,
  });
  expect(formatDateKey(new Date(reminders[0]!.scheduledFor))).toBe('2026-10-14');
  expect(reminders[0]!.workoutId).toBe(demoProgramVersion.workouts[0]!.id);
  const calendar = buildCycleSchedule(cycle, demoProgramVersion, [], [], now).filter(
    (o) => o.cycleWeek === 1,
  );
  expect(reminders.map((r) => [r.workoutId, formatDateKey(new Date(r.scheduledFor))])).toEqual(
    calendar.map((o) => [o.workout.id, o.scheduledDate]),
  );
});
test('saved moves determine reminder dates, foreign-owner overrides cannot move them', () => {
  const cycle = { ...demoCycle, startedAt: new Date(2026, 9, 14, 12).toISOString() };
  const workout = demoProgramVersion.workouts[0]!;
  const override: WorkoutScheduleOverride = {
    id: 'move',
    userId: 'guest-user',
    cycleId: cycle.id,
    cycleWeek: 1,
    workoutId: workout.id,
    originalDate: '2026-10-14',
    scheduledDate: '2026-10-15',
    createdAt: cycle.startedAt,
    updatedAt: cycle.startedAt,
  };
  const input = {
    userId: 'guest-user',
    preferences: { workoutReminders: true },
    cycle,
    programVersion: demoProgramVersion,
    preferredTrainingTime: 'morning' as const,
    now: new Date(2026, 9, 14, 7),
  };
  expect(
    formatDateKey(
      new Date(
        buildWorkoutReminderSchedule({ ...input, overrides: [override] }).find(
          (r) => r.workoutId === workout.id,
        )!.scheduledFor,
      ),
    ),
  ).toBe('2026-10-15');
  expect(
    formatDateKey(
      new Date(
        buildWorkoutReminderSchedule({
          ...input,
          overrides: [{ ...override, userId: 'other' }],
        }).find((r) => r.workoutId === workout.id)!.scheduledFor,
      ),
    ),
  ).toBe('2026-10-14');
});
test.each(['complete', 'partial', 'skipped', 'in-progress'] as const)(
  'does not remind an occurrence already %s',
  (status) => {
    const cycle = { ...demoCycle, startedAt: new Date(2026, 9, 14, 12).toISOString() };
    const workout = demoProgramVersion.workouts[0]!;
    const reminders = buildWorkoutReminderSchedule({
      userId: 'guest-user',
      preferences: { workoutReminders: true },
      cycle,
      programVersion: demoProgramVersion,
      preferredTrainingTime: 'morning',
      now: new Date(2026, 9, 14, 7),
      sessions: [{ cycleWeek: 1, workoutId: workout.id, status }],
    });
    expect(reminders.some((r) => r.workoutId === workout.id)).toBe(false);
  },
);
test('a missed calendar week does not invent next-week reminders from a frozen prescribed week', () => {
  const cycle = { ...demoCycle, startedAt: new Date(2026, 9, 1, 12).toISOString() };
  expect(
    buildWorkoutReminderSchedule({
      userId: 'guest-user',
      preferences: { workoutReminders: true },
      cycle,
      programVersion: demoProgramVersion,
      preferredTrainingTime: 'morning',
      now: new Date(2026, 9, 14, 7),
    }),
  ).toEqual([]);
});
test('local DST transition preserves calendar dates and preferred clock time without increasing targets', () => {
  const cycle = { ...demoCycle, startedAt: new Date(2026, 9, 31, 12).toISOString() };
  const original = JSON.stringify(demoProgramVersion);
  const reminders = buildWorkoutReminderSchedule({
    userId: 'guest-user',
    preferences: { workoutReminders: true },
    cycle,
    programVersion: demoProgramVersion,
    preferredTrainingTime: 'morning',
    now: new Date(2026, 9, 31, 7),
  });
  expect(reminders.every((r) => new Date(r.scheduledFor).getHours() === 8)).toBe(true);
  expect(reminders.map((r) => formatDateKey(new Date(r.scheduledFor)))).toEqual([
    '2026-10-31',
    '2026-11-01',
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
  ]);
  expect(JSON.stringify(demoProgramVersion)).toBe(original);
});
