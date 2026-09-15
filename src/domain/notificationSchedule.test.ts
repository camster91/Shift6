import { demoCycle, demoProgramVersion } from './fixtures/home';
import { buildWorkoutReminderSchedule, preferredTrainingTimeClock } from './notificationSchedule';

describe('workout reminder schedule', () => {
  const cycle = {
    id: demoCycle.id,
    programVersionId: demoCycle.programVersionId,
    currentWeek: demoCycle.currentWeek,
    status: demoCycle.status,
  } as const;

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
