import { useState, useCallback, useEffect, useRef } from 'react';
import { PERIODIZATION } from '../data/armorEngine';

/**
 * Armor Data Store — Local-first persistence with cloud sync readiness.
 * Schema matches the Armor spec:
 *   userId, preferences, userProfile, currentCycle, activeModifiers, dailyHabitState
 */

// ── localStorage helpers ────────────────────────────────────
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Defaults ─────────────────────────────────────────────────
const STORAGE_KEY = 'armor_data';

const DEFAULT_DATA = {
  // v1 schema — matches spec
  userId: null,
  preferences: {
    equipmentTrack: 'full_gym',
    unit: 'lbs',
    theme: 'dark',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  userProfile: {
    displayName: '',
    estimated1RMs: {
      // Will be populated during onboarding
      barbell_squat: 0,
      bench_press: 0,
      deadlift: 0,
      barbell_row: 0,
      shoulder_press: 0,
      goblet_squat: 0,
      dumbbell_press: 0,
      romanian_deadlift: 0,
    },
    bodyweight: 0,
    height: 0,
    age: 0,
  },
  currentCycle: {
    week: 1,
    day: 1,
    totalCyclesCompleted: 0,
    lastWorkoutDate: null,
    workoutLog: {}, // { "2026-06-01": { day: 1, completed: true, primaryWeight: 185, setsCompleted: 3 } }
  },
  activeModifiers: {
    mvdMode: false,
    highFatigue: false,
    travelMode: false,
    heavyMeal: false,
    timeCrunch: false,
  },
  dailyHabitState: {
    balanceDrill: false,
    lunchWalk: false,
    dinnerWalk: false,
    rugRoutine: false,
    dateString: new Date().toISOString().split('T')[0],
  },
  // Extended: workout logs, sets history
  workoutHistory: [], // { date, day, exercises: [{ id, sets: [{ reps, weight }] }] }
  streakData: {
    currentStreak: 0,
    longestStreak: 0,
    freezeUsed: 0,
    mvdDays: [], // dates where MVD was used
  },
};

// ── Hook ─────────────────────────────────────────────────────

export function useArmorData() {
  const [data, setData] = useState(() => load(STORAGE_KEY, DEFAULT_DATA));
  const saveTimeout = useRef(null);

  // Persist on change with debounce
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      save(STORAGE_KEY, data);
    }, 100);
    return () => clearTimeout(saveTimeout.current);
  }, [data]);

  // ── Atomic Updaters ────────────────────────────────────────

  const updatePreferences = useCallback((updates) => {
    setData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...updates },
    }));
  }, []);

  const updateUserProfile = useCallback((updates) => {
    setData(prev => ({
      ...prev,
      userProfile: { ...prev.userProfile, ...updates },
    }));
  }, []);

  const set1RM = useCallback((exerciseId, value) => {
    setData(prev => ({
      ...prev,
      userProfile: {
        ...prev.userProfile,
        estimated1RMs: { ...prev.userProfile.estimated1RMs, [exerciseId]: value },
      },
    }));
  }, []);

  const updateCycle = useCallback((updates) => {
    setData(prev => ({
      ...prev,
      currentCycle: { ...prev.currentCycle, ...updates },
    }));
  }, []);

  const advanceDay = useCallback((todayStr) => {
    setData(prev => {
      if (prev.activeModifiers.travelMode) return prev; // frozen
      const currentDay = prev.currentCycle.day;
      const totalDays = 5; // 5-day split
      const nextDay = currentDay >= totalDays ? 1 : currentDay + 1;
      return {
        ...prev,
        currentCycle: {
          ...prev.currentCycle,
          day: nextDay,
          lastWorkoutDate: todayStr,
        },
      };
    });
  }, []);

  const advanceWeek = useCallback(() => {
    setData(prev => {
      const currentWeek = prev.currentCycle.week;
      if (currentWeek >= 6) {
        // Rollover: complete cycle, reset to week 1
        return {
          ...prev,
          currentCycle: {
            ...prev.currentCycle,
            week: 1,
            day: 1,
            totalCyclesCompleted: prev.currentCycle.totalCyclesCompleted + 1,
            lastWorkoutDate: null,
          },
        };
      }
      return {
        ...prev,
        currentCycle: {
          ...prev.currentCycle,
          week: currentWeek + 1,
          day: 1,
        },
      };
    });
  }, []);

  const toggleModifier = useCallback((modifierId) => {
    setData(prev => {
      const current = prev.activeModifiers[modifierId] || false;
      const updated = { ...prev.activeModifiers, [modifierId]: !current };

      // MVD mode is mutually exclusive with gym workout — handled in UI
      return {
        ...prev,
        activeModifiers: updated,
      };
    });
  }, []);

  const setModifier = useCallback((modifierId, value) => {
    setData(prev => ({
      ...prev,
      activeModifiers: { ...prev.activeModifiers, [modifierId]: value },
    }));
  }, []);

  const toggleHabit = useCallback((habitId) => {
    setData(prev => ({
      ...prev,
      dailyHabitState: {
        ...prev.dailyHabitState,
        [habitId]: !prev.dailyHabitState[habitId],
      },
    }));
  }, []);

  const resetDailyHabits = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setData(prev => ({
      ...prev,
      dailyHabitState: {
        balanceDrill: false,
        lunchWalk: false,
        dinnerWalk: false,
        rugRoutine: false,
        dateString: todayStr,
      },
    }));
  }, []);

  const logWorkout = useCallback((workoutData) => {
    setData(prev => ({
      ...prev,
      workoutHistory: [...prev.workoutHistory, workoutData],
    }));
  }, []);

  const updateStreak = useCallback((updates) => {
    setData(prev => ({
      ...prev,
      streakData: { ...prev.streakData, ...updates },
    }));
  }, []);

  const completeOnboarding = useCallback((onboardingData) => {
    const { equipmentTrack, estimated1RMs, displayName, age, bodyweight } = onboardingData;
    setData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        equipmentTrack: equipmentTrack || prev.preferences.equipmentTrack,
      },
      userProfile: {
        ...prev.userProfile,
        displayName: displayName || '',
        estimated1RMs: { ...prev.userProfile.estimated1RMs, ...estimated1RMs },
        age: age || prev.userProfile.age,
        bodyweight: bodyweight || prev.userProfile.bodyweight,
      },
      // Start cycle at week 1, day 1
      currentCycle: {
        ...prev.currentCycle,
        week: 1,
        day: 1,
        lastWorkoutDate: null,
      },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setData(DEFAULT_DATA);
    save(STORAGE_KEY, DEFAULT_DATA);
  }, []);

  // ── Derived Data ───────────────────────────────────────────

  const onboardingDone = !!data.userProfile.displayName || data.currentCycle.totalCyclesCompleted > 0 || Object.values(data.userProfile.estimated1RMs).some(v => v > 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const habitsNeedReset = data.dailyHabitState.dateString !== todayStr;

  // Get this week's workout logs
  const thisWeekLogs = data.workoutHistory.filter(w => {
    const wDate = new Date(w.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return wDate >= weekStart;
  });

  const todayLog = data.workoutHistory.find(w => w.date === todayStr);

  // Count MVD days in current streak
  const mvdCount = data.streakData.mvdDays?.length || 0;

  return {
    // Raw data
    data,
    preferences: data.preferences,
    userProfile: data.userProfile,
    currentCycle: data.currentCycle,
    activeModifiers: data.activeModifiers,
    dailyHabitState: data.dailyHabitState,
    workoutHistory: data.workoutHistory,
    streakData: data.streakData,

    // Derived
    onboardingDone,
    todayStr,
    habitsNeedReset,
    thisWeekLogs,
    todayLog,
    mvdCount,
    estimated1RMs: data.userProfile.estimated1RMs,
    equipmentTrack: data.preferences.equipmentTrack,

    // Updaters
    updatePreferences,
    updateUserProfile,
    set1RM,
    updateCycle,
    advanceDay,
    advanceWeek,
    toggleModifier,
    setModifier,
    toggleHabit,
    resetDailyHabits,
    logWorkout,
    updateStreak,
    completeOnboarding,
    resetAll,
  };
}

// For backward compatibility during migration
export function migrateFromShift6() {
  try {
    const oldSettings = load('shift6_settings', null);
    const oldLogs = load('shift6_logs', []);
    const oldOnboarding = load('shift6_onboarding_done', false);

    if (!oldOnboarding) return null; // nothing to migrate

    const data = { ...DEFAULT_DATA };
    data.preferences.equipmentTrack = oldSettings?.equippedIds?.includes('barbell') ? 'full_gym' : 'home_gym';
    data.preferences.unit = oldSettings?.unit || 'lbs';
    data.currentCycle = { week: 1, day: 1, totalCyclesCompleted: 0, lastWorkoutDate: null, workoutLog: {} };

    // Estimate 1RMs from best sets
    const bestByExercise = {};
    oldLogs.forEach(log => {
      if (!bestByExercise[log.exerciseId] || (log.reps && log.reps > bestByExercise[log.exerciseId].reps)) {
        bestByExercise[log.exerciseId] = log;
      }
    });

    return {
      ...data,
      workoutHistory: [],
      streakData: { currentStreak: 0, longestStreak: 0, freezeUsed: 0, mvdDays: [] },
    };
  } catch {
    return null;
  }
}
