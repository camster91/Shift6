import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * ArmorDataContext — Shared state provider.
 * v1.1 — Added streak engine, week auto-advance, cycle rollover with progression.
 */

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const STORAGE_KEY = 'armor_data';

const DEFAULT_DATA = {
  userId: null,
  preferences: {
    equipmentTrack: 'full_gym', unit: 'lbs', theme: 'dark',
    soundEnabled: true, vibrationEnabled: true,
  },
  userProfile: {
    displayName: '',
    estimated1RMs: {
      barbell_squat: 0, bench_press: 0, deadlift: 0, barbell_row: 0, shoulder_press: 0,
      goblet_squat: 0, dumbbell_press: 0, romanian_deadlift: 0,
    },
    bodyweight: 0, height: 0, age: 0,
  },
  currentCycle: {
    week: 1, day: 1, totalCyclesCompleted: 0,
    lastWorkoutDate: null, completedDaysThisWeek: [],
  },
  activeModifiers: {
    mvdMode: false, highFatigue: false, travelMode: false,
    heavyMeal: false, timeCrunch: false,
  },
  dailyHabitState: {
    balanceDrill: false, lunchWalk: false, dinnerWalk: false, rugRoutine: false,
    dateString: new Date().toISOString().split('T')[0],
  },
  workoutHistory: [],
  streakData: {
    currentStreak: 0, longestStreak: 0,
    lastActiveDate: null, mvdDates: [], freezesAvailable: 1,
  },
};

// ── Streak Engine ────────────────────────────────────────────
function computeStreak(workoutHistory, mvdDates, freezesAvailable) {
  const allActiveDates = new Set();
  workoutHistory.forEach(w => { if (w.completed) allActiveDates.add(w.date); });
  mvdDates.forEach(d => allActiveDates.add(d));

  const sorted = [...allActiveDates].sort().reverse();
  if (sorted.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday to be active
  const mostRecent = sorted[0];
  if (mostRecent !== today && mostRecent !== yesterday) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let streak = 1;
  let freezesRemaining = freezesAvailable;
  let prevDate = new Date(mostRecent);

  for (let i = 1; i < sorted.length; i++) {
    const currDate = new Date(sorted[i]);
    const dayDiff = Math.round((prevDate - currDate) / 86400000);

    if (dayDiff === 1) {
      streak++;
      prevDate = currDate;
    } else if (dayDiff === 2 && freezesRemaining > 0) {
      freezesRemaining--;
      streak++;
      prevDate = currDate;
    } else {
      break;
    }
  }

  return { currentStreak: streak, longestStreak: Math.max(streak, streak) };
}

// ── Cycle Rollover — progression applied to 1RMs ─────────────
function rollover1RMs(estimated1RMs) {
  const UPPER = ['bench_press', 'incline_bench', 'dumbbell_press', 'shoulder_press', 'arnold_press'];
  const LOWER = ['barbell_squat', 'goblet_squat', 'deadlift', 'romanian_deadlift', 'hip_thrusts', 'leg_press'];
  const updated = { ...estimated1RMs };
  for (const [key, val] of Object.entries(updated)) {
    if (val <= 0) continue;
    if (LOWER.includes(key)) updated[key] = val + 10;
    else if (UPPER.includes(key)) updated[key] = val + 5;
  }
  return updated;
}

// ── Context ─────────────────────────────────────────────────
const ArmorDataContext = createContext(null);

export function ArmorDataProvider({ children }) {
  const [data, setData] = useState(() => load(STORAGE_KEY, DEFAULT_DATA));
  const saveTimeout = useRef(null);

  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(STORAGE_KEY, data), 100);
    return () => clearTimeout(saveTimeout.current);
  }, [data]);

  // ── Derived values ─────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  const onboardingDone = useMemo(() =>
    !!data.userProfile.displayName ||
    data.currentCycle.totalCyclesCompleted > 0 ||
    Object.values(data.userProfile.estimated1RMs).some(v => v > 0),
    [data.userProfile.displayName, data.currentCycle.totalCyclesCompleted, data.userProfile.estimated1RMs]);

  const habitsNeedReset = data.dailyHabitState.dateString !== todayStr;

  const todaysWorkoutCompleted = useMemo(() => {
    return data.workoutHistory.some(w => w.date === todayStr && w.completed);
  }, [data.workoutHistory, todayStr]);

  const isMVDToday = data.streakData.mvdDates?.includes(todayStr);

  // ── Updaters ────────────────────────────────────────────────

  const updatePreferences = useCallback((updates) =>
    setData(prev => ({ ...prev, preferences: { ...prev.preferences, ...updates } })), []);

  const updateUserProfile = useCallback((updates) =>
    setData(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...updates } })), []);

  const set1RM = useCallback((exerciseId, value) =>
    setData(prev => ({
      ...prev, userProfile: {
        ...prev.userProfile,
        estimated1RMs: { ...prev.userProfile.estimated1RMs, [exerciseId]: value },
      },
    })), []);

  const toggleModifier = useCallback((modifierId) =>
    setData(prev => ({
      ...prev, activeModifiers: { ...prev.activeModifiers, [modifierId]: !prev.activeModifiers[modifierId] },
    })), []);

  const setModifier = useCallback((modifierId, value) =>
    setData(prev => ({
      ...prev, activeModifiers: { ...prev.activeModifiers, [modifierId]: value },
    })), []);

  const toggleHabit = useCallback((habitId) =>
    setData(prev => ({
      ...prev, dailyHabitState: { ...prev.dailyHabitState, [habitId]: !prev.dailyHabitState[habitId] },
    })), []);

  const resetDailyHabits = useCallback(() => {
    setData(prev => ({
      ...prev, dailyHabitState: {
        balanceDrill: false, lunchWalk: false, dinnerWalk: false, rugRoutine: false,
        dateString: todayStr,
      },
    }));
  }, [todayStr]);

  const completeOnboarding = useCallback((onboardingData) => {
    const { equipmentTrack, estimated1RMs, displayName } = onboardingData;
    setData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, equipmentTrack: equipmentTrack || prev.preferences.equipmentTrack },
      userProfile: {
        ...prev.userProfile,
        displayName: displayName || 'Athlete',
        estimated1RMs: { ...prev.userProfile.estimated1RMs, ...estimated1RMs },
      },
      currentCycle: { ...prev.currentCycle, week: 1, day: 1, lastWorkoutDate: null, completedDaysThisWeek: [] },
    }));
  }, []);

  // ── Workout logging + auto-advance ─────────────────────────

  const logWorkout = useCallback((workoutData) => {
    setData(prev => {
      const newHistory = [...prev.workoutHistory, { ...workoutData, date: workoutData.date || todayStr }];

      // Advance day
      let nextDay = prev.currentCycle.day;
      let nextWeek = prev.currentCycle.week;
      let completedCycles = prev.currentCycle.totalCyclesCompleted;
      let next1RMs = { ...prev.userProfile.estimated1RMs };
      const completedDays = [...(prev.currentCycle.completedDaysThisWeek || [])];

      if (workoutData.completed !== false && !prev.activeModifiers.travelMode) {
        // Mark today's day as completed
        if (!completedDays.includes(nextDay)) {
          completedDays.push(nextDay);
        }

        // Advance to next day
        nextDay = nextDay >= 5 ? 1 : nextDay + 1;

        // Check if week is complete (all 5 days done)
        if (completedDays.length >= 5 || nextDay === 1) {
          if (nextWeek >= 6) {
            // Cycle complete — rollover with progression
            nextWeek = 1;
            completedCycles += 1;
            next1RMs = rollover1RMs(prev.userProfile.estimated1RMs);
          } else {
            nextWeek += 1;
          }
          // Reset completed days for new week
          completedDays.length = 0;
        }
      }

      // Recalculate streak
      const { currentStreak } = computeStreak(
        newHistory, prev.streakData.mvdDates, prev.streakData.freezesAvailable
      );
      const longestStreak = Math.max(prev.streakData.longestStreak, currentStreak);

      return {
        ...prev,
        workoutHistory: newHistory,
        userProfile: { ...prev.userProfile, estimated1RMs: next1RMs },
        currentCycle: {
          ...prev.currentCycle,
          day: nextDay,
          week: nextWeek,
          totalCyclesCompleted: completedCycles,
          lastWorkoutDate: todayStr,
          completedDaysThisWeek: completedDays,
        },
        streakData: {
          ...prev.streakData,
          currentStreak,
          longestStreak,
          lastActiveDate: todayStr,
        },
      };
    });
  }, [todayStr]);

  // ── MVD (Minimum Viable Day) ───────────────────────────────

  const logMVD = useCallback(() => {
    setData(prev => {
      const mvdDates = [...(prev.streakData.mvdDates || [])];
      if (!mvdDates.includes(todayStr)) {
        mvdDates.push(todayStr);
      }
      const { currentStreak } = computeStreak(
        prev.workoutHistory, mvdDates, prev.streakData.freezesAvailable
      );
      return {
        ...prev,
        streakData: {
          ...prev.streakData,
          mvdDates,
          currentStreak,
          longestStreak: Math.max(prev.streakData.longestStreak, currentStreak),
          lastActiveDate: todayStr,
        },
      };
    });
  }, [todayStr]);

  // ── Manual overrides ────────────────────────────────────────

  const advanceDay = useCallback(() =>
    setData(prev => ({
      ...prev, currentCycle: { ...prev.currentCycle, day: prev.currentCycle.day >= 5 ? 1 : prev.currentCycle.day + 1 },
    })), []);

  const advanceWeek = useCallback(() =>
    setData(prev => ({
      ...prev, currentCycle: {
        ...prev.currentCycle,
        week: prev.currentCycle.week >= 6 ? 1 : prev.currentCycle.week + 1,
        day: 1,
        completedDaysThisWeek: [],
      },
    })), []);

  const resetAll = useCallback(() => {
    setData(DEFAULT_DATA);
    save(STORAGE_KEY, DEFAULT_DATA);
  }, []);

  // ── Value ───────────────────────────────────────────────────
  const value = {
    data,
    preferences: data.preferences,
    userProfile: data.userProfile,
    currentCycle: data.currentCycle,
    activeModifiers: data.activeModifiers,
    dailyHabitState: data.dailyHabitState,
    workoutHistory: data.workoutHistory,
    streakData: data.streakData,
    onboardingDone,
    todayStr,
    habitsNeedReset,
    todaysWorkoutCompleted,
    isMVDToday,
    estimated1RMs: data.userProfile.estimated1RMs,
    equipmentTrack: data.preferences.equipmentTrack,
    updatePreferences, updateUserProfile, set1RM,
    toggleModifier, setModifier, toggleHabit, resetDailyHabits,
    logWorkout, logMVD, advanceDay, advanceWeek,
    completeOnboarding, resetAll,
  };

  return (
    <ArmorDataContext.Provider value={value}>
      {children}
    </ArmorDataContext.Provider>
  );
}

export function useArmorData() {
  const ctx = useContext(ArmorDataContext);
  if (!ctx) throw new Error('useArmorData must be used within ArmorDataProvider');
  return ctx;
}

export function migrateFromShift6() {
  try {
    const oldSettings = load('shift6_settings', null);
    const oldOnboarding = load('shift6_onboarding_done', false);
    if (!oldOnboarding) return null;
    return { ...DEFAULT_DATA, preferences: { ...DEFAULT_DATA.preferences, equipmentTrack: oldSettings?.equippedIds?.includes('barbell') ? 'full_gym' : 'home_gym' } };
  } catch { return null; }
}
