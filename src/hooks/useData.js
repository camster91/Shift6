import { useState, useCallback, useEffect } from 'react';
import { EXERCISES, getExercise } from '../data/exercises';

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

export function useData() {
  const [myExercises, setMyExercises] = useState(() => load('shift6_my_exercises', DEFAULT_EXERCISES));
  const [logs, setLogs] = useState(() => load('shift6_logs', []));
  const [goals, setGoals] = useState(() => load('shift6_goals', []));
  const [onboardingDone, setOnboardingDone] = useState(() => load('shift6_onboarding_done', false));

  useEffect(() => { save('shift6_my_exercises', myExercises); }, [myExercises]);
  useEffect(() => { save('shift6_logs', logs); }, [logs]);
  useEffect(() => { save('shift6_goals', goals); }, [goals]);
  useEffect(() => { save('shift6_onboarding_done', onboardingDone); }, [onboardingDone]);

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
    return entry;
  }, []);

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
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (days.has(d.toISOString().split('T')[0])) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [logs]);

  return {
    myExercises, exercises, logs, goals, onboardingDone,
    addExercise, removeExercise, setExerciseList,
    logSet, setGoal, removeGoal, setOnboardingDone,
    getLogsForExercise, getTodayLogs, getThisWeekLogs,
    getBestSet, getBestWeight, getRecentLogs: getLogsForExercise,
    getWeeklyFrequency, getCurrentStreak,
    allExercises: EXERCISES,
  };
}
