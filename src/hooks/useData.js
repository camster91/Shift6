import { useState, useEffect, useCallback } from 'react';
import { EXERCISE_DEFAULTS } from '../data/exercises';

const STORAGE_KEY = 'shift6-tracker-data';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function getDefaultData() {
  return {
    exercises: EXERCISE_DEFAULTS.map((e, i) => ({
      id: `ex-${i}`,
      name: e.name,
      bodyPart: e.bodyPart,
    })),
    logs: [],
    goals: [],
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Merge in any new default exercises not yet added
      const existingNames = new Set(data.exercises.map(e => e.name));
      const newDefaults = EXERCISE_DEFAULTS.filter(e => !existingNames.has(e.name));
      if (newDefaults.length > 0) {
        newDefaults.forEach((e, i) => {
          data.exercises.push({
            id: `ex-${Date.now()}-${i}`,
            name: e.name,
            bodyPart: e.bodyPart,
          });
        });
      }
      return data;
    }
  } catch (e) {
    console.warn('Failed to load data, using defaults', e);
  }
  return getDefaultData();
}

export function useData() {
  const [data, setData] = useState(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const addLog = useCallback((log) => {
    setData(prev => ({
      ...prev,
      logs: [...prev.logs, { ...log, id: generateId() }],
    }));
  }, []);

  const addExercise = useCallback((exercise) => {
    setData(prev => ({
      ...prev,
      exercises: [...prev.exercises, { ...exercise, id: generateId() }],
    }));
  }, []);

  const removeExercise = useCallback((id) => {
    setData(prev => ({
      ...prev,
      exercises: prev.exercises.filter(e => e.id !== id),
    }));
  }, []);

  const addGoal = useCallback((goal) => {
    setData(prev => ({
      ...prev,
      goals: [...prev.goals, { ...goal, id: generateId() }],
    }));
  }, []);

  const removeGoal = useCallback((id) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id),
    }));
  }, []);

  const resetData = useCallback(() => {
    setData(getDefaultData());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    exercises: data.exercises,
    logs: data.logs,
    goals: data.goals,
    addLog,
    addExercise,
    removeExercise,
    addGoal,
    removeGoal,
    resetData,
  };
}
