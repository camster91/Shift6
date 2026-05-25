import { useState, useCallback, useEffect } from 'react';
import { EXERCISES, getExercise } from '../data/exercises';
import { trackEvent, Events } from '../utils/analytics.js';
import { scheduleWorkoutReminder, cancelWorkoutReminder } from '../utils/notifications.js';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

const DEFAULT_EXERCISES = ['pushups', 'squats', 'pullups', 'plank', 'lunges', 'glute_bridge', 'supermans', 'diamond_pushups', 'tricep_dips'];
const DEFAULT_SETTINGS = {
  restSeconds: 90,
  targetSets: 3,
  soundEnabled: true,
  vibrationEnabled: true,
  unit: 'lbs',
  theme: 'dark',
  restTimes: {},
  calibratedStartReps: {},
  equippedIds: ['none'],
  skillLevel: 'beginner',
  plateaus: {},
  streakFreezes: 1,
  notificationsEnabled: false,
  notificationHour: 7,
  notificationMinute: 0,
};

export function useData() {
  const [myExercises, setMyExercises] = useState(() => load('shift6_my_exercises', DEFAULT_EXERCISES));
  const [logs, setLogs] = useState(() => load('shift6_logs', []));
  const [goals, setGoals] = useState(() => load('shift6_goals', []));
  const [onboardingDone, setOnboardingDone] = useState(() => load('shift6_onboarding_done', false));
  const [settings, setSettings] = useState(() => load('shift6_settings', DEFAULT_SETTINGS));

  useEffect(() => { save('shift6_my_exercises', myExercises); }, [myExercises]);
  useEffect(() => { save('shift6_logs', logs); }, [logs]);
  useEffect(() => { save('shift6_goals', goals); }, [goals]);
  useEffect(() => { save('shift6_onboarding_done', onboardingDone); }, [onboardingDone]);
  useEffect(() => { save('shift6_settings', settings); }, [settings]);

  const exercises = myExercises.map(id => getExercise(id)).filter(Boolean);

  const addExercise = useCallback((exerciseId) => {
    setMyExercises(prev => prev.includes(exerciseId) ? prev : [...prev, exerciseId]);
  }, []);

  const removeExercise = useCallback((exerciseId) => {
    setMyExercises(prev => prev.filter(id => id !== exerciseId));
  }, []);

  const setExerciseList = useCallback((ids) => {
    setMyExercises(ids);
  }, []);

  const logSet = useCallback((exerciseId, reps, weight, notes) => {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      exerciseId, reps, weight: weight || 0,
      date: new Date().toISOString(), notes: notes || '',
    };
    setLogs(prev => [...prev, entry]);
    trackEvent(Events.SET_COMPLETE, { exercise_id: exerciseId, reps, weight: weight || 0 });
    return entry;
  }, []);

  const removeLog = useCallback((logId) => {
    setLogs(prev => prev.filter(l => l.id !== logId));
  }, []);

  const updateLogNotes = useCallback((logId, notes) => {
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, notes } : l));
  }, []);

  const getLastRepsFor = useCallback((exerciseId) => {
    const exLogs = logs.filter(l => l.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return exLogs[0]?.reps || 0;
  }, [logs]);

  const setGoal = useCallback((exerciseId, targetReps, weeks) => {
    setGoals(prev => {
      const idx = prev.findIndex(g => g.exerciseId === exerciseId);
      const goal = { id: exerciseId, exerciseId, targetReps, weeks: weeks || 6, createdAt: new Date().toISOString() };
      if (idx >= 0) { const u = [...prev]; u[idx] = goal; return u; }
      return [...prev, goal];
    });
  }, []);

  const removeGoal = useCallback((exerciseId) => {
    setGoals(prev => prev.filter(g => g.exerciseId !== exerciseId));
  }, []);

  const getLogsForExercise = useCallback((exerciseId) => {
    return logs.filter(l => l.exerciseId === exerciseId).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [logs]);

  const getTodayLogs = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return logs.filter(l => l.date.startsWith(today));
  }, [logs]);

  const getThisWeekLogs = useCallback(() => {
    const now = new Date();
    const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
    return logs.filter(l => new Date(l.date) >= ws);
  }, [logs]);

  const getBestSet = useCallback((exerciseId) => {
    const exLogs = logs.filter(l => l.exerciseId === exerciseId);
    return exLogs.length ? Math.max(...exLogs.map(l => l.reps || 0)) : 0;
  }, [logs]);

  const getBestWeight = useCallback((exerciseId) => {
    const exLogs = logs.filter(l => l.exerciseId === exerciseId);
    return exLogs.length ? Math.max(...exLogs.map(l => l.weight || 0)) : 0;
  }, [logs]);

  const getWeeklyFrequency = useCallback((exerciseId) => {
    const now = new Date();
    const ws = new Date(now); ws.setDate(now.getDate() - now.getDay());
    return logs.filter(l => l.exerciseId === exerciseId && new Date(l.date) >= ws).length;
  }, [logs]);

  const getCurrentStreak = useCallback(() => {
    const days = new Set(logs.map(l => l.date.split('T')[0]));
    let streak = 0;
    const today = new Date();
    let usedFreezes = 0;
    const maxFreezes = settings?.streakFreezes || 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (days.has(dateStr)) {
        streak++;
      } else {
        if (i === 0) continue; // Allow today to not be logged yet without breaking streak
        if (usedFreezes < maxFreezes) {
          usedFreezes++;
        } else {
          break;
        }
      }
    }
    return streak;
  }, [logs, settings?.streakFreezes]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const detectPlateauAndOverload = useCallback((exerciseId, setsCompleted) => {
    if (!setsCompleted || setsCompleted.length === 0) return { status: 'none' };
    const best = getBestSet(exerciseId);
    const sessionMax = Math.max(...setsCompleted.map(s => s.reps));

    // Overload / PR check
    if (best > 0 && sessionMax > best) {
      const plateaus = { ...(settings?.plateaus || {}) };
      delete plateaus[exerciseId];
      updateSettings({ plateaus });
      return { status: 'overload', value: sessionMax, diff: sessionMax - best };
    }

    // Plateau check
    const exLogs = logs.filter(l => l.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const sessionMaxes = [];
    const seenDates = new Set();
    for (const log of exLogs) {
      const dStr = log.date.split('T')[0];
      if (!seenDates.has(dStr)) {
        seenDates.add(dStr);
        const dayLogs = exLogs.filter(l => l.date.startsWith(dStr));
        sessionMaxes.push(Math.max(...dayLogs.map(l => l.reps)));
      }
      if (sessionMaxes.length >= 3) break;
    }

    if (sessionMaxes.length >= 3 && sessionMaxes[0] <= sessionMaxes[1] && sessionMaxes[1] <= sessionMaxes[2]) {
      const plateaus = { ...(settings?.plateaus || {}) };
      const currentPlat = (plateaus[exerciseId] || 0) + 1;
      plateaus[exerciseId] = currentPlat;
      
      if (currentPlat >= 3) {
        const currentCalib = settings?.calibratedStartReps?.[exerciseId] ?? getExercise(exerciseId)?.startReps ?? 10;
        const deloaded = Math.max(2, Math.round(currentCalib * 0.85));
        const calibratedStartReps = { ...(settings?.calibratedStartReps || {}), [exerciseId]: deloaded };
        delete plateaus[exerciseId];
        updateSettings({ plateaus, calibratedStartReps });
        return { status: 'deload', currentReps: deloaded };
      } else {
        updateSettings({ plateaus });
        return { status: 'plateau_warning', count: currentPlat };
      }
    }

    return { status: 'stable' };
  }, [logs, settings, getBestSet, updateSettings]);

  return {
    myExercises, exercises, logs, goals, onboardingDone, settings,
    addExercise, removeExercise, setExerciseList,
    logSet, setGoal, removeGoal, setOnboardingDone, removeLog, updateLogNotes, updateSettings,
    getLogsForExercise, getTodayLogs, getThisWeekLogs,
    getBestSet, getBestWeight, getRecentLogs: getLogsForExercise,
    getWeeklyFrequency, getCurrentStreak, getLastRepsFor,
    allExercises: EXERCISES,
    setLogs, setMyExercises, setGoals,
    detectPlateauAndOverload
  };
}
