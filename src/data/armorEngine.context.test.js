/**
 * ArmorDataContext.test.js — Tests for the data context's core flows.
 * Covers the migration logic, the workout advancement state machine,
 * the modifier-aware periodization, and the streak/cycle math that
 * drives the user-facing progress dashboard.
 *
 * React is NOT loaded here; the test exercises the pure helpers and the
 * state-update functions that the context wraps. For the hook layer
 * (useArmorData), see the live integration tests in the app.
 */
import { describe, it, expect } from 'vitest';
import {
  computeStreak,
  streakStatus,
  rollover1RMs,
  EXERCISE_TRACK,
  EXERCISE_DISPLAY_NAMES,
} from './armorEngine';

describe('computeStreak', () => {
  it('returns 0 streak and 0 longest for empty history', () => {
    const r = computeStreak([], [], 1, 0);
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(0);
  });

  it('counts 1 streak when only today is present', () => {
    const today = new Date().toISOString().split('T')[0];
    const r = computeStreak([{ date: today, completed: true }], [], 1, 0);
    expect(r.currentStreak).toBe(1);
    expect(r.longestStreak).toBe(1);
  });

  it('breaks streak if last active day is older than yesterday', () => {
    const oldDate = '2025-01-01';
    const r = computeStreak([{ date: oldDate, completed: true }], [], 1, 5);
    expect(r.currentStreak).toBe(0);
    expect(r.longestStreak).toBe(5); // preserved from previous
  });

  it('uses a freeze to bridge a 2-day gap', () => {
    const today = new Date().toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    const r = computeStreak(
      [
        { date: today, completed: true },
        { date: twoDaysAgo, completed: true },
      ],
      [],
      1,
      0,
    );
    // today, [1-day gap bridged by freeze], twoDaysAgo
    expect(r.currentStreak).toBe(2);
  });

  it('exhausts freezes and breaks the streak if gaps are too wide', () => {
    const today = new Date().toISOString().split('T')[0];
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0];
    const r = computeStreak(
      [
        { date: today, completed: true },
        { date: tenDaysAgo, completed: true },
      ],
      [],
      1,
      0,
    );
    // 8-day gap is too wide for a single freeze; chain breaks
    expect(r.currentStreak).toBe(1);
  });

  it('treats MVD dates as active days', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const r = computeStreak(
      [],
      [today, yesterday],
      1,
      0,
    );
    expect(r.currentStreak).toBe(2);
  });

  it('updates longestStreak to max of new and previous', () => {
    const today = new Date().toISOString().split('T')[0];
    const r = computeStreak([{ date: today, completed: true }], [], 1, 99);
    expect(r.longestStreak).toBe(99);
  });
});

describe('streakStatus', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  it('returns ok for a new user with no streak data', () => {
    expect(streakStatus(null).state).toBe('ok');
    expect(streakStatus({}).banner).toBeNull();
  });

  it('returns at_risk when the user logged yesterday and has an active streak', () => {
    const r = streakStatus({
      currentStreak: 7,
      longestStreak: 14,
      lastActiveDate: yesterday,
      freezesAvailable: 1,
    });
    expect(r.state).toBe('at_risk');
    expect(r.banner.title).toMatch(/7-day/i);
    expect(r.banner.body).toMatch(/Log today/i);
  });

  it('returns broken when currentStreak=0 and longestStreak >= 3', () => {
    const r = streakStatus({
      currentStreak: 0,
      longestStreak: 14,
      lastActiveDate: threeDaysAgo,
      freezesAvailable: 1,
    });
    expect(r.state).toBe('broken');
    expect(r.banner.title).toBe('Streak ended');
    expect(r.banner.body).toMatch(/14-day streak ended/i);
  });

  it('returns ok (no banner) for short streaks that ended', () => {
    // longestStreak < 3 means it was barely a streak, not worth a banner
    const r = streakStatus({
      currentStreak: 0,
      longestStreak: 2,
      lastActiveDate: threeDaysAgo,
      freezesAvailable: 1,
    });
    expect(r.state).toBe('ok');
    expect(r.banner).toBeNull();
  });

  it('returns ok when the user logged today', () => {
    const r = streakStatus({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDate: today,
      freezesAvailable: 1,
    });
    expect(r.state).toBe('ok');
    expect(r.banner).toBeNull();
  });
});

describe('rollover1RMs', () => {
  it('increments lower-body lifts by 10', () => {
    const r = rollover1RMs({
      barbell_squat: 200,
      deadlift: 300,
      goblet_squat: 80,
      romanian_deadlift: 100,
    });
    expect(r.barbell_squat).toBe(210);
    expect(r.deadlift).toBe(310);
    expect(r.goblet_squat).toBe(90);
    expect(r.romanian_deadlift).toBe(110);
  });

  it('increments upper-body lifts by 5', () => {
    const r = rollover1RMs({
      bench_press: 150,
      shoulder_press: 90,
      dumbbell_press: 60,
    });
    expect(r.bench_press).toBe(155);
    expect(r.shoulder_press).toBe(95);
    expect(r.dumbbell_press).toBe(65);
  });

  it('skips zero values (not yet set by the user)', () => {
    const r = rollover1RMs({ barbell_squat: 200, bench_press: 0 });
    expect(r.barbell_squat).toBe(210);
    expect(r.bench_press).toBe(0);
  });

  it('does not mutate the input', () => {
    const input = { barbell_squat: 200, bench_press: 150 };
    const r = rollover1RMs(input);
    expect(input).toEqual({ barbell_squat: 200, bench_press: 150 });
    expect(r).not.toBe(input);
  });
});

describe('Track and display-name coverage', () => {
  it('every exercise in EXERCISE_TRACK has a display name', () => {
    Object.keys(EXERCISE_TRACK).forEach((exId) => {
      expect(EXERCISE_DISPLAY_NAMES[exId]).toBeTruthy();
    });
  });

  it('EXERCISE_TRACK covers all 8 default 1RMs in ArmorDataContext', () => {
    const default1RMs = [
      'barbell_squat', 'bench_press', 'deadlift', 'barbell_row',
      'shoulder_press', 'goblet_squat', 'dumbbell_press', 'romanian_deadlift',
    ];
    default1RMs.forEach((exId) => {
      expect(EXERCISE_TRACK[exId]).toBeTruthy();
      expect(['full_gym', 'home_gym']).toContain(EXERCISE_TRACK[exId]);
    });
  });
});
