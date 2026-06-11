import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  fetchCloud, pushCloud, isLoggedIn,
} from '../lib/syncClient';

/**
 * ArmorDataContext — Shared state provider with cloud sync.
 * v1.2 — Added optional cloud sync via syncClient (Supabase/Postgres).
 *
 * Sync behavior:
 *  - When logged in, debounced 2s push of local changes to cloud
 *  - On login, fetch cloud and merge (cloud wins for future writes)
 *  - On conflict (409), keep local and surface to UI
 *
 * Cloud data is stored as-is (same shape as localStorage) — the context
 * does NOT do any transformation, only persistence transport.
 */

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const STORAGE_KEY = 'armor_data';
const REVISION_KEY = 'armor_revision';

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
    todaysTrack: null, // null = use preferences.equipmentTrack; 'full_gym' | 'home_gym' = per-workout override
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

function computeStreak(workoutHistory, mvdDates, freezesAvailable, previousLongest = 0) {
  const allActiveDates = new Set();
  workoutHistory.forEach(w => { if (w.completed) allActiveDates.add(w.date); });
  mvdDates.forEach(d => allActiveDates.add(d));
  const sorted = [...allActiveDates].sort().reverse();
  if (sorted.length === 0) return { currentStreak: 0, longestStreak: previousLongest };
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return { currentStreak: 0, longestStreak: previousLongest };
  let streak = 1;
  let freezesRemaining = freezesAvailable;
  let prevDate = new Date(sorted[0]);
  for (let i = 1; i < sorted.length; i++) {
    const currDate = new Date(sorted[i]);
    const dayDiff = Math.round((prevDate - currDate) / 86400000);
    if (dayDiff === 1) { streak++; prevDate = currDate; }
    else if (dayDiff === 2 && freezesRemaining > 0) { freezesRemaining--; streak++; prevDate = currDate; }
    else break;
  }
  return { currentStreak: streak, longestStreak: Math.max(streak, previousLongest) };
}

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

const ArmorDataContext = createContext(null);

export function ArmorDataProvider({ children }) {
  const [data, setData] = useState(() => {
    const loaded = load(STORAGE_KEY, null);
    if (!loaded || !loaded.userProfile || !loaded.preferences || !loaded.currentCycle) {
      return DEFAULT_DATA;
    }
    // Merge with defaults to fill in any missing fields from older versions
    return {
      userProfile: { ...DEFAULT_DATA.userProfile, ...loaded.userProfile, estimated1RMs: { ...DEFAULT_DATA.userProfile.estimated1RMs, ...(loaded.userProfile.estimated1RMs || {}) } },
      preferences: { ...DEFAULT_DATA.preferences, ...loaded.preferences },
      currentCycle: { ...DEFAULT_DATA.currentCycle, ...loaded.currentCycle },
      activeModifiers: { ...DEFAULT_DATA.activeModifiers, ...(loaded.activeModifiers || {}) },
      dailyHabitState: { ...DEFAULT_DATA.dailyHabitState, ...(loaded.dailyHabitState || {}) },
      workoutHistory: Array.isArray(loaded.workoutHistory) ? loaded.workoutHistory : [],
      streakData: { ...DEFAULT_DATA.streakData, ...(loaded.streakData || {}) },
    };
  });
  const [revision, setRevision] = useState(() => load(REVISION_KEY, 1));
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error' | 'offline'
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [conflict, setConflict] = useState(null);

  const syncTimeout = useRef(null);

  // Listen for online/offline
  useEffect(() => {
    const on = () => setSyncStatus('idle');
    const off = () => setSyncStatus('offline');
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Persist locally — immediate write (no debounce) so navigation never loses data
  useEffect(() => {
    save(STORAGE_KEY, data);
    save(REVISION_KEY, revision);
  }, [data, revision]);

  // Cloud sync (debounced 2s after change) — only if logged in
  useEffect(() => {
    if (!isLoggedIn()) return;
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        const res = await pushCloud(data, revision);
        if (res && res.conflict) {
          // Server has newer data — surface the conflict to the UI
          setConflict({ serverData: res.serverData, serverRevision: res.serverRevision });
          setSyncStatus('error');
          return;
        }
        setRevision(res.revision);
        setSyncStatus('synced');
        setLastSyncAt(new Date().toISOString());
        setConflict(null);
      } catch (err) {
        setSyncStatus('error');
      }
    }, 2000);
    return () => clearTimeout(syncTimeout.current);
  }, [data, revision]);

  const todayStr = new Date().toISOString().split('T')[0];

  const onboardingDone = useMemo(() => {
    const { displayName } = data.userProfile;
    const { totalCyclesCompleted } = data.currentCycle;
    const has1RMs = Object.values(data.userProfile.estimated1RMs).some(v => v > 0);
    return !!displayName || totalCyclesCompleted > 0 || has1RMs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.userProfile.displayName, data.currentCycle.totalCyclesCompleted,
      data.userProfile.estimated1RMs.barbell_squat,
      data.userProfile.estimated1RMs.bench_press,
      data.userProfile.estimated1RMs.deadlift,
      data.userProfile.estimated1RMs.goblet_squat,
      data.userProfile.estimated1RMs.dumbbell_press,
      data.userProfile.estimated1RMs.romanian_deadlift]);

  const habitsNeedReset = data.dailyHabitState.dateString !== todayStr;

  const todaysWorkoutCompleted = useMemo(() => {
    return data.workoutHistory.some(w => w.date === todayStr && w.completed);
  }, [data.workoutHistory, todayStr]);

  const isMVDToday = data.streakData.mvdDates?.includes(todayStr);

  // ── Cloud pull (on login) ───────────────────────────────────
  const pullFromCloud = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      const { data: cloudData, revision: cloudRev } = await fetchCloud();
      if (cloudData && Object.keys(cloudData).length > 0) {
        setData(cloudData);
        setRevision(cloudRev);
      }
      setSyncStatus('synced');
      setLastSyncAt(new Date().toISOString());
      setConflict(null);
      return true;
    } catch (err) {
      setSyncStatus('error');
      return false;
    }
  }, []);

  // ── Conflict resolution ──────────────────────────────────────
  const resolveConflictKeepLocal = useCallback(() => {
    // Force push with current local revision (server will accept because rev > serverRev)
    setConflict(null);
    setRevision(prev => prev + 1); // bumps local rev so next push wins
  }, []);

  const resolveConflictUseServer = useCallback(() => {
    if (!conflict) return;
    setData(conflict.serverData);
    setRevision(conflict.serverRevision);
    setConflict(null);
  }, [conflict]);

  // ── Updaters (unchanged) ─────────────────────────────────────
  const updatePreferences = useCallback((updates) =>
    setData(prev => ({ ...prev, preferences: { ...prev.preferences, ...updates } })), []);
  const updateUserProfile = useCallback((updates) =>
    setData(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...updates } })), []);
  const set1RM = useCallback((exerciseId, value) => {
    // Reject non-finite, zero, negative, or absurdly high values
    const cleanValue = Number(value);
    if (!Number.isFinite(cleanValue) || cleanValue <= 0 || cleanValue > 9999) {
      console.warn(`[ArmorData] set1RM rejected: ${exerciseId} = ${value}`);
      return;
    }
    return setData(prev => ({
      ...prev, userProfile: {
        ...prev.userProfile,
        estimated1RMs: { ...prev.userProfile.estimated1RMs, [exerciseId]: cleanValue },
      },
    }));
  }, []);
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
    // Validate and sanitize 1RMs before storing
    const sanitized1RMs = {};
    if (estimated1RMs) {
      for (const [k, v] of Object.entries(estimated1RMs)) {
        const clean = Number(v);
        sanitized1RMs[k] = (Number.isFinite(clean) && clean >= 0 && clean <= 9999) ? clean : 0;
      }
    }
    setData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, equipmentTrack: equipmentTrack || prev.preferences.equipmentTrack },
      userProfile: {
        ...prev.userProfile,
        displayName: displayName || 'Athlete',
        estimated1RMs: { ...prev.userProfile.estimated1RMs, ...sanitized1RMs },
      },
      currentCycle: { ...prev.currentCycle, week: 1, day: 1, lastWorkoutDate: null, completedDaysThisWeek: [] },
    }));
  }, []);

  const logWorkout = useCallback((workoutData) => {
    setData(prev => {
      const newHistory = [...prev.workoutHistory, { ...workoutData, date: workoutData.date || todayStr }];
      let nextDay = prev.currentCycle.day;
      let nextWeek = prev.currentCycle.week;
      let completedCycles = prev.currentCycle.totalCyclesCompleted;
      let next1RMs = { ...prev.userProfile.estimated1RMs };
      const completedDays = [...(prev.currentCycle.completedDaysThisWeek || [])];

      if (workoutData.completed !== false && !prev.activeModifiers.travelMode) {
        if (!completedDays.includes(nextDay)) completedDays.push(nextDay);
        nextDay = nextDay >= 5 ? 1 : nextDay + 1;
        if (completedDays.length >= 5 || nextDay === 1) {
          if (nextWeek >= 6) {
            nextWeek = 1;
            completedCycles += 1;
            next1RMs = rollover1RMs(prev.userProfile.estimated1RMs);
          } else {
            nextWeek += 1;
          }
          completedDays.length = 0;
        }
      }
      const { currentStreak, longestStreak } = computeStreak(newHistory, prev.streakData.mvdDates, prev.streakData.freezesAvailable, prev.streakData.longestStreak);
      return {
        ...prev,
        workoutHistory: newHistory,
        userProfile: { ...prev.userProfile, estimated1RMs: next1RMs },
        currentCycle: {
          ...prev.currentCycle,
          day: nextDay, week: nextWeek, totalCyclesCompleted: completedCycles,
          lastWorkoutDate: todayStr, completedDaysThisWeek: completedDays,
          // Clear the per-workout track override once the workout is logged,
          // so tomorrow's session returns to the user's primary track by default.
          todaysTrack: null,
        },
        streakData: { ...prev.streakData, currentStreak, longestStreak, lastActiveDate: todayStr },
      };
    });
  }, [todayStr]);

  const logMVD = useCallback(() => {
    setData(prev => {
      const mvdDates = [...(prev.streakData.mvdDates || [])];
      if (!mvdDates.includes(todayStr)) mvdDates.push(todayStr);
      const { currentStreak, longestStreak } = computeStreak(prev.workoutHistory, mvdDates, prev.streakData.freezesAvailable, prev.streakData.longestStreak);
      return { ...prev, streakData: { ...prev.streakData, mvdDates, currentStreak, longestStreak, lastActiveDate: todayStr } };
    });
  }, [todayStr]);

  const advanceDay = useCallback(() =>
    setData(prev => ({ ...prev, currentCycle: { ...prev.currentCycle, day: prev.currentCycle.day >= 5 ? 1 : prev.currentCycle.day + 1 } })), []);
  const advanceWeek = useCallback(() =>
    setData(prev => ({ ...prev, currentCycle: { ...prev.currentCycle, week: prev.currentCycle.week >= 6 ? 1 : prev.currentCycle.week + 1, day: 1, completedDaysThisWeek: [] } })), []);

  // Per-workout track override. Sets which track today's session uses.
  // Pass null to clear (use the user's primary track).
  const setTodaysTrack = useCallback((track) => {
    setData(prev => ({
      ...prev,
      currentCycle: { ...prev.currentCycle, todaysTrack: track || null },
    }));
  }, []);

  // The track this workout will actually use (override or default)
  const effectiveTrack = data.currentCycle.todaysTrack || data.preferences.equipmentTrack;
  const resetAll = useCallback(() => {
    setData(DEFAULT_DATA);
    setRevision(1);
    save(STORAGE_KEY, DEFAULT_DATA);
    save(REVISION_KEY, 1);
  }, []);

  // PERFORMANCE: Memoize the provider value to prevent unnecessary app-wide re-renders
  // whenever any state in this context changes (e.g. transient sync status).
  const value = useMemo(() => ({
    data, revision, syncStatus, lastSyncAt, conflict,
    preferences: data.preferences, userProfile: data.userProfile, currentCycle: data.currentCycle,
    activeModifiers: data.activeModifiers, dailyHabitState: data.dailyHabitState,
    workoutHistory: data.workoutHistory, streakData: data.streakData,
    onboardingDone, todayStr, habitsNeedReset, todaysWorkoutCompleted, isMVDToday,
    estimated1RMs: data.userProfile.estimated1RMs, equipmentTrack: data.preferences.equipmentTrack,
    effectiveTrack, todaysTrack: data.currentCycle.todaysTrack, setTodaysTrack,
    updatePreferences, updateUserProfile, set1RM,
    toggleModifier, setModifier, toggleHabit, resetDailyHabits,
    logWorkout, logMVD, advanceDay, advanceWeek,
    completeOnboarding, resetAll,
    pullFromCloud, resolveConflictKeepLocal, resolveConflictUseServer,
  }), [
    data, revision, syncStatus, lastSyncAt, conflict,
    onboardingDone, todayStr, habitsNeedReset, todaysWorkoutCompleted, isMVDToday,
    effectiveTrack, setTodaysTrack,
    updatePreferences, updateUserProfile, set1RM,
    toggleModifier, setModifier, toggleHabit, resetDailyHabits,
    logWorkout, logMVD, advanceDay, advanceWeek,
    completeOnboarding, resetAll,
    pullFromCloud, resolveConflictKeepLocal, resolveConflictUseServer,
  ]);

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
