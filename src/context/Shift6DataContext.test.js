/**
 * armorDataContext.test.js — Unit tests for the logWorkout state machine.
 *
 * Why this matters: logWorkout controls when the user's week advances,
 * when their cycle rolls over, and when their 1RMs auto-progress. A bug
 * here silently corrupts the user's progress tracking. The pure
 * computeNextStateAfterWorkout function is extracted from the provider
 * specifically so we can test it without React.
 */
import { describe, it, expect } from 'vitest';
import { computeNextStateAfterWorkout } from './Shift6DataContext';

// Minimal stand-in for the DEFAULT_DATA shape. Only the fields that
// logWorkout actually reads are populated.
function makeState(overrides = {}) {
  return {
    userProfile: {
      displayName: 'Test',
      estimated1RMs: {
        barbell_squat: 200,
        bench_press: 150,
        deadlift: 250,
      },
    },
    activeModifiers: {
      mvdMode: false,
      highFatigue: false,
      travelMode: false,
      heavyMeal: false,
      timeCrunch: false,
    },
    currentCycle: {
      week: 1,
      day: 1,
      totalCyclesCompleted: 0,
      completedDaysThisWeek: [],
      lastWorkoutDate: null,
      todaysTrack: null,
    },
    workoutHistory: [],
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      mvdDates: [],
      freezesAvailable: 1,
    },
    ...overrides,
  };
}

describe('computeNextStateAfterWorkout', () => {
  it('advances day 1 → 2 on first workout', () => {
    const prev = makeState();
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.currentCycle.day).toBe(2);
    expect(next.currentCycle.week).toBe(1);
    expect(next.currentCycle.totalCyclesCompleted).toBe(0);
    expect(next.currentCycle.completedDaysThisWeek).toEqual([1]);
    expect(next.workoutHistory).toHaveLength(1);
  });

  it('advances day 5 → 1 and bumps to week 2', () => {
    const prev = makeState({
      currentCycle: {
        week: 1,
        day: 5,
        totalCyclesCompleted: 0,
        completedDaysThisWeek: [1, 2, 3, 4],
        lastWorkoutDate: '2026-06-15',
        todaysTrack: null,
      },
    });
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.currentCycle.day).toBe(1);
    expect(next.currentCycle.week).toBe(2);
    expect(next.currentCycle.totalCyclesCompleted).toBe(0);
    // After rollover, completedDays should be reset
    expect(next.currentCycle.completedDaysThisWeek).toEqual([]);
    // 1RMs should NOT be rolled over at week boundary (only at cycle boundary)
    expect(next.userProfile.estimated1RMs).toEqual(prev.userProfile.estimated1RMs);
  });

  it('rolls over 1RMs when completing week 6 of cycle 1', () => {
    const prev = makeState({
      currentCycle: {
        week: 6,
        day: 5,
        totalCyclesCompleted: 0,
        completedDaysThisWeek: [1, 2, 3, 4],
        lastWorkoutDate: '2026-06-15',
        todaysTrack: null,
      },
      userProfile: {
        estimated1RMs: {
          barbell_squat: 200,    // lower body → +10
          bench_press: 150,      // upper body → +5
          deadlift: 250,         // lower body → +10
        },
      },
    });
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.currentCycle.week).toBe(1);
    expect(next.currentCycle.totalCyclesCompleted).toBe(1);
    expect(next.userProfile.estimated1RMs.barbell_squat).toBe(210);
    expect(next.userProfile.estimated1RMs.bench_press).toBe(155);
    expect(next.userProfile.estimated1RMs.deadlift).toBe(260);
  });

  it('does not advance day when workout is completed: false', () => {
    const prev = makeState({ currentCycle: { ...makeState().currentCycle, day: 3 } });
    const next = computeNextStateAfterWorkout(prev, { completed: false }, '2026-06-17');
    expect(next.currentCycle.day).toBe(3);
    expect(next.currentCycle.week).toBe(1);
    // Still logs the workout to history (so the streak doesn't reset
    // and the dashboard shows it)
    expect(next.workoutHistory).toHaveLength(1);
  });

  it('does not advance day when travelMode is active', () => {
    const prev = makeState({
      activeModifiers: { mvdMode: false, highFatigue: false, travelMode: true, heavyMeal: false, timeCrunch: false },
      currentCycle: { ...makeState().currentCycle, day: 2 },
    });
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    // Travel mode freezes progression — day stays at 2
    expect(next.currentCycle.day).toBe(2);
    expect(next.currentCycle.week).toBe(1);
    // The workout is still recorded (history grows)
    expect(next.workoutHistory).toHaveLength(1);
  });

  it('does not roll over 1RMs at week boundary mid-cycle', () => {
    // Week 1 → 2 transition: 1RMs unchanged (only cycle rollover changes them)
    const prev = makeState({
      currentCycle: {
        week: 1, day: 5, totalCyclesCompleted: 0,
        completedDaysThisWeek: [1, 2, 3, 4], lastWorkoutDate: '2026-06-15', todaysTrack: null,
      },
      userProfile: { estimated1RMs: { barbell_squat: 225 } },
    });
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.userProfile.estimated1RMs.barbell_squat).toBe(225);
    expect(next.currentCycle.week).toBe(2);
  });

  it('clears the per-workout track override after logging', () => {
    const prev = makeState({ currentCycle: { ...makeState().currentCycle, todaysTrack: 'home_gym' } });
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.currentCycle.todaysTrack).toBeNull();
  });

  it('does not double-count when same day is logged twice', () => {
    // The same user opens the app, logs a workout, hits Complete Set
    // accidentally a second time. The day shouldn't advance twice.
    const after1st = computeNextStateAfterWorkout(makeState(), { completed: true }, '2026-06-17');
    const after2nd = computeNextStateAfterWorkout(after1st, { completed: true }, '2026-06-17');
    // After the second log, the day should be 3, not 4
    expect(after2nd.currentCycle.day).toBe(3);
    // The completed days list should still have just [1, 2]
    expect(after2nd.currentCycle.completedDaysThisWeek).toEqual([1, 2]);
  });

  it('preserves other top-level state fields', () => {
    const prev = makeState({
      preferences: { equipmentTrack: 'home_gym', unit: 'kg' },
    });
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.preferences).toEqual({ equipmentTrack: 'home_gym', unit: 'kg' });
  });

  it('uses provided date when workoutData.date is set, else falls back to todayStr', () => {
    const prev = makeState();
    const next = computeNextStateAfterWorkout(prev, { completed: true, date: '2025-01-01' }, '2026-06-17');
    expect(next.workoutHistory[0].date).toBe('2025-01-01');
  });

  it('falls back to todayStr when workoutData has no date', () => {
    const prev = makeState();
    const next = computeNextStateAfterWorkout(prev, { completed: true }, '2026-06-17');
    expect(next.workoutHistory[0].date).toBe('2026-06-17');
  });

  it('truncates workout notes to 500 characters', () => {
    const longNote = 'a'.repeat(1000);
    const prev = makeState();
    const workoutData = {
      completed: true,
      exercises: [
        {
          id: 'squat',
          sets: [{ reps: 5, weight: 100, notes: longNote }],
          failedSets: [{ reps: 2, weight: 100, notes: longNote }],
        },
      ],
    };
    const next = computeNextStateAfterWorkout(prev, workoutData, '2026-06-17');
    const savedEx = next.workoutHistory[0].exercises[0];
    expect(savedEx.sets[0].notes).toHaveLength(500);
    expect(savedEx.failedSets[0].notes).toHaveLength(500);
    expect(savedEx.sets[0].notes).toBe('a'.repeat(500));
  });
});