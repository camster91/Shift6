import { demoProgramVersion, demoSchedule } from './fixtures/home';
import { buildWeeklySchedule, getDayOfWeek, getTodayWorkout } from './home';

describe('home domain selectors', () => {
  it('normalizes Sunday to the seventh training day', () => {
    expect(getDayOfWeek(new Date(2026, 8, 13, 12))).toBe(7);
    expect(getDayOfWeek(new Date(2026, 8, 14, 12))).toBe(1);
  });

  it('selects the workout assigned to the current day', () => {
    expect(getTodayWorkout(demoProgramVersion, new Date(2026, 8, 14, 12))?.title).toBe(
      'Strength A',
    );
    expect(getTodayWorkout(demoProgramVersion, new Date(2026, 8, 15, 12))?.title).toBe('Cardio A');
  });

  it('builds a snapshot-backed schedule and preserves fallback recovery labels', () => {
    const schedule = buildWeeklySchedule(
      demoProgramVersion,
      new Set(['workout-barbell-30-strength-a']),
      new Date(2026, 8, 14, 12),
      demoSchedule,
    );

    expect(schedule[0]).toMatchObject({
      title: 'Strength A',
      workoutId: 'workout-barbell-30-strength-a',
      status: 'complete',
    });
    expect(schedule[5]).toMatchObject({ title: 'Active', category: 'recovery', status: 'rest' });
    expect(schedule[6]).toMatchObject({ title: 'Rest', category: 'rest', status: 'rest' });
  });
});
