/**
 * armorEngine.test.js — Smoke tests for the pure-function workout math.
 * These are the easiest tests to write (no React, no DOM) and the
 * highest-value ones: the periodization numbers directly drive the
 * weights the user is told to lift.
 *
 * If these break, the user's working weight is wrong. Treat regressions
 * here as blocking.
 */
import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  workingWeight,
  plateRound,
  getWeekConfig,
  calculatePrimaryLift,
  calculateAccessory,
  applyTimeCrunch,
  getTodaysWorkout,
  getDailyHabits,
  get10MinWorkout,
  checkDayAdvance,
  rolloverProgression,
  getProgressionIncrement,
  PERIODIZATION,
  SPLIT_DAYS,
  MODIFIERS,
  MVD_PROTOCOL,
  VO2MAX_PROTOCOL,
  TRAVEL_SUBSTITUTIONS,
  DAILY_HABITS,
  EQUIPMENT_TRACKS,
  EXERCISE_TRACK,
  EXERCISE_DISPLAY_NAMES,
} from './armorEngine';

describe('estimate1RM (Epley)', () => {
  it('returns 0 for non-positive input', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(100, -1)).toBe(0);
  });
  it('returns weight unchanged for 1 rep', () => {
    expect(estimate1RM(225, 1)).toBe(225);
  });
  it('rounds the Epley formula', () => {
    // 200 * (1 + 0.0333 * 5) = 200 * 1.1665 = 233.3 → 233
    expect(estimate1RM(200, 5)).toBe(233);
  });
});

describe('workingWeight (reverse Epley)', () => {
  it('returns 0 for non-positive input', () => {
    expect(workingWeight(0, 5)).toBe(0);
    expect(workingWeight(225, 0)).toBe(0);
  });
  it('rounds back close to 1RM at 1 rep', () => {
    // 225 / (1 + 0.0333 * 1) = 225 / 1.0333 ≈ 217.7 → 218
    expect(workingWeight(225, 1)).toBe(218);
  });
});

describe('plateRound', () => {
  it('rounds to the nearest increment', () => {
    expect(plateRound(202, 5)).toBe(200);
    expect(plateRound(203, 5)).toBe(205);
    expect(plateRound(135, 2.5)).toBe(135);
  });
  it('defaults to 5 lb increments', () => {
    expect(plateRound(137, 5)).toBe(135);
  });
});

describe('getWeekConfig', () => {
  it('returns the matching week', () => {
    expect(getWeekConfig(1).phase).toBe('Base');
    expect(getWeekConfig(4).phase).toBe('Heavy');
    expect(getWeekConfig(6).phase).toBe('Deload');
  });
  it('falls back to week 1 for invalid input', () => {
    expect(getWeekConfig(0).phase).toBe('Base');
    expect(getWeekConfig(99).phase).toBe('Base');
  });
  it('every week has sets, reps, and pct range', () => {
    PERIODIZATION.forEach((w) => {
      expect(w.sets).toBeGreaterThan(0);
      expect(w.reps).toBeGreaterThan(0);
      expect(w.pctLow).toBeLessThan(w.pctHigh);
      expect(w.pctLow).toBeGreaterThan(0);
      expect(w.pctHigh).toBeLessThanOrEqual(1);
    });
  });
});

describe('calculatePrimaryLift', () => {
  it('uses the midpoint of pct range and rounds to plate', () => {
    // Week 1: 0.65-0.70 → midpoint 0.675; 225 * 0.675 = 151.875 → 152, rounded to 150
    const r = calculatePrimaryLift(225, 1, {});
    expect(r.weight % 5).toBe(0);
    expect(r.weight).toBeGreaterThan(140);
    expect(r.weight).toBeLessThan(160);
  });
  it('caps at 60% under high CNS fatigue', () => {
    const r = calculatePrimaryLift(225, 1, { highFatigue: true });
    // 60% of 225 = 135
    expect(r.weight).toBe(135);
  });
  it('shifts to hypertrophy reps under CNS fatigue', () => {
    const r = calculatePrimaryLift(225, 4, { highFatigue: true });
    // Week 4 is 3 reps, fatigue bumps to 10
    expect(r.reps).toBe(10);
  });
  it('adds a heavy single in week 5', () => {
    const r = calculatePrimaryLift(225, 5, {});
    expect(r.heavySingle).toBeDefined();
    // 95% of 225 = 213.75 → 214, rounded to 215
    expect(r.heavySingle).toBe(215);
  });
  it('skips the heavy single under fatigue', () => {
    const r = calculatePrimaryLift(225, 5, { highFatigue: true });
    expect(r.heavySingle).toBeUndefined();
  });
});

describe('calculateAccessory', () => {
  it('uses 60% of 1RM by default', () => {
    const r = calculateAccessory(100, {});
    expect(r.weight).toBe(60); // 60% of 100
    expect(r.sets).toBe(3);
    expect(r.reps).toBe(12);
  });
  it('drops to 50% under fatigue', () => {
    const r = calculateAccessory(100, { highFatigue: true });
    expect(r.weight).toBe(50);
  });
});

describe('applyTimeCrunch', () => {
  it('strips accessories from strength day', () => {
    const day = SPLIT_DAYS.full_gym[0];
    const r = applyTimeCrunch(day);
    expect(r.accessories).toEqual([]);
    expect(r.timeCrunch).toBe(true);
  });
  it('cuts VO2 max to 2 rounds', () => {
    const day = SPLIT_DAYS.full_gym[1]; // VO2 max day
    const r = applyTimeCrunch(day);
    expect(r.vo2maxRounds).toBe(2);
  });
});

describe('getTodaysWorkout', () => {
  const baseRMs = { barbell_squat: 225, bench_press: 185, deadlift: 275 };

  it('returns MVD protocol when modifier is set', () => {
    const r = getTodaysWorkout('full_gym', 1, 1, { mvdMode: true }, baseRMs);
    expect(r.type).toBe('mvd');
    expect(r.primaryLift.sets).toBe(5);
    expect(r.primaryLift.reps).toBe(20);
  });
  it('returns the matching day from the split', () => {
    const r = getTodaysWorkout('full_gym', 1, 1, {}, baseRMs);
    expect(r.day).toBe(1);
    expect(r.primaryLift.exerciseId).toBe('barbell_squat');
  });
  it('substitutes primary lift under travel mode', () => {
    const r = getTodaysWorkout('full_gym', 1, 1, { travelMode: true }, baseRMs);
    expect(r.primaryLift.exerciseId).toBe('squats');
    expect(r.primaryLift.weight).toBe(0);
  });
  it('falls back to full_gym if track is unknown', () => {
    const r = getTodaysWorkout('nonexistent', 1, 1, {}, baseRMs);
    expect(r.day).toBe(1);
  });
  it('cycles days with modulo', () => {
    const r = getTodaysWorkout('full_gym', 6, 1, {}, baseRMs);
    // Day 6 modulo 5 = 1
    expect(r.day).toBe(1);
  });
  it('skips accessories that have no 1RM set', () => {
    const r = getTodaysWorkout('full_gym', 1, 1, {}, {});
    // Day 1 accessories: leg_press, leg_curls, calf_raises
    r.accessories.forEach((a) => {
      expect(a.weight).toBe(0);
    });
  });
});

describe('getDailyHabits', () => {
  it('extends dinner walk to 20min under heavy meal', () => {
    const r = getDailyHabits({ heavyMeal: true });
    const dinner = r.find((h) => h.id === 'dinner_walk');
    expect(dinner.duration).toBe(20);
  });
  it('leaves dinner walk at 10min by default', () => {
    const r = getDailyHabits({});
    const dinner = r.find((h) => h.id === 'dinner_walk');
    expect(dinner.duration).toBe(10);
  });
});

describe('get10MinWorkout', () => {
  it('uses goblet squat for home_gym', () => {
    const r = get10MinWorkout('home_gym');
    expect(r.primaryLift.exerciseId).toBe('goblet_squat');
  });
  it('uses barbell squat for full_gym', () => {
    const r = get10MinWorkout('full_gym');
    expect(r.primaryLift.exerciseId).toBe('barbell_squat');
  });
  it('includes 2 accessories', () => {
    const r = get10MinWorkout('full_gym');
    expect(r.accessories.length).toBe(2);
  });
});

describe('checkDayAdvance', () => {
  it('returns true when lastWorkoutDate is null', () => {
    expect(checkDayAdvance({}, '2026-06-16')).toBe(true);
  });
  it('returns true when lastWorkoutDate is different', () => {
    expect(
      checkDayAdvance({ currentCycle: { lastWorkoutDate: '2026-06-15' } }, '2026-06-16'),
    ).toBe(true);
  });
  it('returns false when lastWorkoutDate matches', () => {
    expect(
      checkDayAdvance({ currentCycle: { lastWorkoutDate: '2026-06-16' } }, '2026-06-16'),
    ).toBe(false);
  });
});

describe('rolloverProgression', () => {
  it('adds 10 lbs to lower-body lifts', () => {
    expect(rolloverProgression('barbell_squat', 225)).toBe(235);
    expect(rolloverProgression('deadlift', 300)).toBe(310);
  });
  it('adds 5 lbs to upper-body lifts', () => {
    expect(rolloverProgression('bench_press', 185)).toBe(190);
    expect(rolloverProgression('shoulder_press', 100)).toBe(105);
  });
  it('defaults to +5 for unknown exercises', () => {
    expect(rolloverProgression('mystery_lift', 100)).toBe(105);
  });
});

describe('getProgressionIncrement', () => {
  it('returns 10 for lower body', () => {
    expect(getProgressionIncrement('barbell_squat')).toBe(10);
  });
  it('returns 5 for upper body', () => {
    expect(getProgressionIncrement('bench_press')).toBe(5);
  });
  it('returns 5 default', () => {
    expect(getProgressionIncrement('unknown')).toBe(5);
  });
});

describe('Static data sanity', () => {
  it('every modifier has required fields', () => {
    Object.values(MODIFIERS).forEach((m) => {
      expect(m.id).toBeTruthy();
      expect(m.label).toBeTruthy();
      expect(m.affects).toBeTruthy();
    });
  });
  it('every daily habit has required fields', () => {
    DAILY_HABITS.forEach((h) => {
      expect(h.id).toBeTruthy();
      expect(h.label).toBeTruthy();
      expect(h.duration).toBeGreaterThan(0);
    });
  });
  it('every track has the required keys', () => {
    Object.values(EQUIPMENT_TRACKS).forEach((t) => {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.plateIncrement).toBeGreaterThan(0);
    });
  });
  it('every exercise in EXERCISE_TRACK maps to a real track', () => {
    Object.values(EXERCISE_TRACK).forEach((trackId) => {
      expect(EQUIPMENT_TRACKS[trackId]).toBeDefined();
    });
  });
  it('every exercise has a display name', () => {
    Object.keys(EXERCISE_TRACK).forEach((exId) => {
      expect(EXERCISE_DISPLAY_NAMES[exId]).toBeTruthy();
    });
  });
  it('VO2 max protocol is 4x4', () => {
    expect(VO2MAX_PROTOCOL.rounds).toBe(4);
    expect(VO2MAX_PROTOCOL.workSeconds).toBe(240);
    expect(VO2MAX_PROTOCOL.restSeconds).toBe(180);
  });
  it('MVD has pushups walk mobility', () => {
    expect(MVD_PROTOCOL.pushups.sets).toBe(5);
    expect(MVD_PROTOCOL.pushups.reps).toBe(20);
    expect(MVD_PROTOCOL.walk.duration).toBe(10);
    expect(MVD_PROTOCOL.mobility.duration).toBe(5);
  });
  it('travel substitutions cover all 5 primary lifts per track', () => {
    ['barbell_squat', 'bench_press', 'deadlift', 'goblet_squat', 'dumbbell_press', 'romanian_deadlift'].forEach((k) => {
      expect(TRAVEL_SUBSTITUTIONS[k]).toBeTruthy();
    });
  });
});
