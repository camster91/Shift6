/**
 * Armor Engine — Core workout math, periodization, plate math, contingencies.
 * Pure functions. No UI, no state, no side effects.
 */

// ── CONSTANTS ──────────────────────────────────────────────

export const EQUIPMENT_TRACKS = {
  full_gym: {
    id: 'full_gym',
    label: 'Full Gym',
    sublabel: 'Barbell Focus',
    icon: '🏋️',
    plateIncrement: 2.5, // standard barbell plates — smallest increment is 5 lbs total (2.5/side)
  },
  home_gym: {
    id: 'home_gym',
    label: 'Home Gym',
    sublabel: 'Dumbbell / Kettlebell',
    icon: '🏠',
    plateIncrement: 2.5, // dumbbell jumps
  },
};

// ── THE 5-DAY SPLIT (per track) ─────────────────────────────

export const SPLIT_DAYS = {
  full_gym: [
    { day: 1, name: 'Heavy Squats', primary: 'barbell_squat', bodyPart: 'Legs', type: 'strength', accessories: ['leg_press', 'leg_curls', 'calf_raises'] },
    { day: 2, name: 'VO2 Max + Pull', primary: null, bodyPart: 'Full Body', type: 'vo2max', accessories: ['pullups', 'dumbbell_row', 'face_pull'] },
    { day: 3, name: 'Heavy Bench', primary: 'bench_press', bodyPart: 'Chest', type: 'strength', accessories: ['incline_bench', 'lateral_raise', 'tricep_pushdown'] },
    { day: 4, name: 'VO2 Max + Core', primary: null, bodyPart: 'Full Body', type: 'vo2max', accessories: ['plank', 'hanging_leg_raise', 'cable_crunch'] },
    { day: 5, name: 'Heavy Deads/Rows', primary: 'deadlift', bodyPart: 'Back', type: 'strength', accessories: ['rows', 'bicep_curl', 'hammer_curl'] },
  ],
  home_gym: [
    { day: 1, name: 'Heavy Goblet Squats', primary: 'goblet_squat', bodyPart: 'Legs', type: 'strength', accessories: ['lunges', 'glute_bridge', 'calf_raises'] },
    { day: 2, name: 'VO2 Max + Pull', primary: null, bodyPart: 'Full Body', type: 'vo2max', accessories: ['pullups', 'dumbbell_row', 'face_pull'] },
    { day: 3, name: 'Heavy DB Bench', primary: 'dumbbell_press', bodyPart: 'Chest', type: 'strength', accessories: ['pushups', 'lateral_raise', 'tricep_dips'] },
    { day: 4, name: 'VO2 Max + Core', primary: null, bodyPart: 'Full Body', type: 'vo2max', accessories: ['plank', 'leg_raises', 'russian_twists'] },
    { day: 5, name: 'Heavy DB RDLs', primary: 'romanian_deadlift', bodyPart: 'Back', type: 'strength', accessories: ['rows', 'bicep_curl', 'hammer_curl'] },
  ],
};

// ── THE 6-WEEK PERIODIZATION TABLE ──────────────────────────

export const PERIODIZATION = [
  { week: 1, phase: 'Base', sets: 3, reps: 8, pctLow: 0.65, pctHigh: 0.70 },
  { week: 2, phase: 'Volume', sets: 4, reps: 8, pctLow: 0.70, pctHigh: 0.75 },
  { week: 3, phase: 'Transition', sets: 4, reps: 5, pctLow: 0.78, pctHigh: 0.82 },
  { week: 4, phase: 'Heavy', sets: 4, reps: 3, pctLow: 0.83, pctHigh: 0.87 },
  { week: 5, phase: 'Peak', sets: 3, reps: 2, pctLow: 0.88, pctHigh: 0.95, hasHeavySingle: true },
  { week: 6, phase: 'Deload', sets: 3, reps: 5, pctLow: 0.58, pctHigh: 0.62 },
];

// ── EXERCISE CATEGORIES FOR PLATE MATH ──────────────────────

const UPPER_BODY = ['bench_press', 'incline_bench', 'dumbbell_press', 'shoulder_press', 'arnold_press', 'pushups', 'diamond_pushups'];
const LOWER_BODY = ['barbell_squat', 'goblet_squat', 'deadlift', 'romanian_deadlift', 'hip_thrusts', 'leg_press'];

export function getProgressionIncrement(exerciseId) {
  if (LOWER_BODY.includes(exerciseId)) return 10; // +10 lbs per cycle
  if (UPPER_BODY.includes(exerciseId)) return 5;  // +5 lbs per cycle
  return 5; // default
}

// ── DAILY HABIT STACK ───────────────────────────────────────

export const DAILY_HABITS = [
  { id: 'balance_drill', label: 'Single-Leg Stands', duration: 3, unit: 'min', pillar: 5, anchor: 'Morning coffee / brushing teeth', desc: 'Eyes closed, 2-3 min per leg' },
  { id: 'lunch_walk', label: 'Lunch Walk', duration: 10, unit: 'min', pillar: 2, anchor: 'After lunch', desc: 'Brisk walk to blunt glucose spike' },
  { id: 'dinner_walk', label: 'Post-Dinner Walk', duration: 10, unit: 'min', pillar: 2, anchor: 'After dinner', modifiableBy: 'heavyMeal', modifiedDuration: 20 },
  { id: 'rug_routine', label: 'Evening Floor Work', duration: 5, unit: 'min', pillar: 4, anchor: 'Evening wind-down', desc: 'Hips, hamstrings, thoracic spine' },
];

// ── CONTINGENCY MODIFIERS ───────────────────────────────────

export const MODIFIERS = {
  mvdMode: {
    id: 'mvdMode',
    label: 'Minimum Viable Day',
    icon: '🛡️',
    description: '100 push-ups accumulated, 15-min walk, 5-min mobility',
    affects: 'workout',
  },
  highFatigue: {
    id: 'highFatigue',
    label: 'High CNS Fatigue',
    icon: '😴',
    description: 'Drops primary compound to 60% 1RM, hypertrophy focus',
    affects: 'primaryLift',
    intensityMultiplier: 0.60,
    repChange: 'hypertrophy', // go to 10-12 rep range
  },
  heavyMeal: {
    id: 'heavyMeal',
    label: 'Heavy Meal',
    icon: '🍝',
    description: 'Extends post-dinner walk to 20 minutes',
    affects: 'dinnerWalk',
    dinnerWalkExtension: 20,
  },
  travelMode: {
    id: 'travelMode',
    label: 'Travel / Vacation',
    icon: '✈️',
    description: 'Freezes progression, bodyweight substitutions',
    affects: 'progression',
    freezeProgression: true,
  },
};

// ── MVD (Minimum Viable Day) PROTOCOL ───────────────────────

export const MVD_PROTOCOL = {
  pushups: { total: 100, label: 'Push-Ups', accumulateThrough: 'day' },
  walk: { duration: 15, unit: 'min', label: 'Walk' },
  mobility: { duration: 5, unit: 'min', label: 'Mobility Work' },
};

// ── TRAVEL MODE SUBSTITUTIONS ───────────────────────────────

export const TRAVEL_SUBSTITUTIONS = {
  barbell_squat: 'squats',
  bench_press: 'pushups',
  deadlift: 'lunges',
  barbell: 'dumbbells',
  goblet_squat: 'squats',
  dumbbell_press: 'pushups',
  romanian_deadlift: 'glute_bridge',
};

// ── CORE MATH FUNCTIONS ─────────────────────────────────────

/**
 * Epley Formula: estimate 1RM from weight × reps.
 * 1RM = Weight × (1 + 0.0333 × Reps)
 */
export function estimate1RM(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + 0.0333 * reps));
}

/**
 * Reverse Epley: given 1RM and target reps, calculate working weight.
 */
export function workingWeight(oneRM, reps) {
  if (reps <= 0 || oneRM <= 0) return 0;
  return Math.round(oneRM / (1 + 0.0333 * reps));
}

/**
 * Plate-math rounding: round to nearest plate increment.
 * Standard barbell: 2.5 lbs per side = 5 lbs total smallest increment.
 * Dumbbells: usually 2.5 or 5 lb jumps.
 */
export function plateRound(weight, increment = 5) {
  return Math.round(weight / increment) * increment;
}

/**
 * Get periodization data for a specific week.
 */
export function getWeekConfig(weekNumber) {
  return PERIODIZATION.find(w => w.week === weekNumber) || PERIODIZATION[0];
}

/**
 * Calculate working sets for a primary lift given 1RM, week, and modifiers.
 */
export function calculatePrimaryLift(oneRM, weekNumber, modifiers = {}) {
  const week = getWeekConfig(weekNumber);
  let pct = (week.pctLow + week.pctHigh) / 2;

  // CNS fatigue modifier: cap at 60%
  if (modifiers.highFatigue) {
    pct = Math.min(pct, 0.60);
  }

  const rawWeight = Math.round(oneRM * pct);
  const rounded = plateRound(rawWeight, 5);

  let reps = week.reps;
  // CNS fatigue: shift to hypertrophy range
  if (modifiers.highFatigue && reps < 10) {
    reps = 10;
  }

  const result = {
    week: week.week,
    phase: week.phase,
    sets: week.sets,
    reps,
    weight: rounded,
    pct,
    oneRM,
  };

  // Week 5: add heavy single
  if (week.hasHeavySingle && !modifiers.highFatigue) {
    result.heavySingle = plateRound(Math.round(oneRM * 0.95), 5);
  }

  return result;
}

/**
 * Calculate accessory work (no periodization, just volume).
 * Accessories use a flat 3x10-12 approach.
 */
export function calculateAccessory(oneRM, modifiers = {}) {
  const pct = modifiers.highFatigue ? 0.50 : 0.60;
  const raw = Math.round(oneRM * pct);
  return {
    sets: 3,
    reps: 12,
    weight: plateRound(raw, 5),
    pct,
  };
}

/**
 * Apply progression rollover after Week 6 cycle completion.
 * Upper body: +5 lbs to 1RM
 * Lower body: +10 lbs to 1RM
 */
export function rolloverProgression(exerciseId, current1RM) {
  const increment = getProgressionIncrement(exerciseId);
  return current1RM + increment;
}

/**
 * VO2 Max protocol: Norwegian 4x4 intervals.
 * 4 minutes work, 3 minutes rest, 4 rounds.
 */
export const VO2MAX_PROTOCOL = {
  name: 'Norwegian 4×4',
  rounds: 4,
  workSeconds: 240, // 4 min
  restSeconds: 180, // 3 min
  targetHR: '85-95% max HR',
  description: 'Run, bike, row, or swim at 85-95% max heart rate',
};

/**
 * Time-Crunch: strip workout to primary lift or cardio only.
 */
export function applyTimeCrunch(dayConfig) {
  if (dayConfig.type === 'vo2max') {
    return {
      ...dayConfig,
      name: `${dayConfig.name} (Quick)`,
      accessories: [],
      timeCrunch: true,
      vo2maxRounds: 2, // cut from 4 to 2 rounds
    };
  }
  // Strength day: primary lift only
  return {
    ...dayConfig,
    name: `${dayConfig.name} (Primary Only)`,
    accessories: [],
    timeCrunch: true,
  };
}

/**
 * Get today's workout configuration based on cycle state.
 */
export function getTodaysWorkout(track, cycleDay, cycleWeek, modifiers = {}, estimated1RMs = {}) {
  const trackDays = SPLIT_DAYS[track] || SPLIT_DAYS.full_gym;
  const dayIndex = (cycleDay - 1) % trackDays.length;
  const dayConfig = { ...trackDays[dayIndex] };

  // Travel mode: substitute primary lifts
  if (modifiers.travelMode) {
    if (dayConfig.primary && TRAVEL_SUBSTITUTIONS[dayConfig.primary]) {
      dayConfig.primary = TRAVEL_SUBSTITUTIONS[dayConfig.primary];
    }
    dayConfig.accessories = (dayConfig.accessories || []).map(a =>
      TRAVEL_SUBSTITUTIONS[a] || a
    );
  }

  // Time crunch: strip to essentials
  if (modifiers.timeCrunch) {
    return applyTimeCrunch(dayConfig);
  }

  // Calculate primary lift
  let primaryLift = null;
  if (dayConfig.primary && estimated1RMs[dayConfig.primary]) {
    if (modifiers.travelMode) {
      // Travel: frozen progression, bodyweight focus
      primaryLift = {
        exerciseId: dayConfig.primary,
        sets: 3,
        reps: 'AMRAP', // as many reps as possible
        weight: 0,
        phase: 'Travel Maintenance',
      };
    } else if (modifiers.mvdMode) {
      primaryLift = null; // MVD replaces gym workout
    } else {
      primaryLift = calculatePrimaryLift(estimated1RMs[dayConfig.primary], cycleWeek, modifiers);
      primaryLift.exerciseId = dayConfig.primary;
    }
  }

  // Calculate accessories
  const accessories = (dayConfig.accessories || []).map(exId => {
    const rm = estimated1RMs[exId];
    if (!rm) return { exerciseId: exId, sets: 3, reps: 12, weight: 0 };
    const acc = calculateAccessory(rm, modifiers);
    acc.exerciseId = exId;
    return acc;
  });

  return {
    ...dayConfig,
    primaryLift,
    accessories,
    modifiers: { ...modifiers },
  };
}

/**
 * Get today's daily habits with modifier adjustments.
 */
export function getDailyHabits(modifiers = {}) {
  return DAILY_HABITS.map(h => {
    if (h.modifiableBy === 'heavyMeal' && modifiers.heavyMeal) {
      return { ...h, duration: h.modifiedDuration || 20 };
    }
    return { ...h };
  });
}

/**
 * Get the effective cycle day (frozen if travel mode).
 */
export function getEffectiveCycleDay(state, today) {
  if (state.activeModifiers?.travelMode) return state.currentCycle?.day || 1;
  // Otherwise, auto-advance if it's a new day
  return state.currentCycle?.day || 1;
}

/**
 * Check if a new day has started and advance cycle day.
 */
export function checkDayAdvance(state, todayStr) {
  const lastWorkoutDate = state.currentCycle?.lastWorkoutDate;
  if (!lastWorkoutDate || lastWorkoutDate !== todayStr) {
    return true; // new day
  }
  return false;
}
