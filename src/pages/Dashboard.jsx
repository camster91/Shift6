import { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { getBodyPart, BODY_PARTS } from '../data/exercises';

export default function Dashboard() {
  const { logs, exercises, goals, getWeeklyFrequency, getLastDone } = useData();
  const today = new Date().toISOString().split('T')[0];

  // Check for weekly log - prompt if nothing logged today
  const loggedToday = logs.some(l => l.date === today);
  const thisWeekLogs = logs.filter(l => {
    const d = new Date(l.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return d >= weekStart;
  });

  // Per body part frequency this week
  const bodyFreq = {};
  BODY_PARTS.forEach(bp => {
    const count = thisWeekLogs.filter(l => {
      const ex = exercises.find(e => e.id === l.exerciseId);
      return ex && getBodyPart(ex.name) === bp;
    }).length;
    bodyFreq[bp] = count;
  });

  // Goals with progress
  const goalProgress = goals.map(g => {
    const ex = exercises.find(e => e.id === g.exerciseId);
    const exLogs = logs.filter(l => l.exerciseId === g.exerciseId).sort((a, b) => a.date.localeCompare(b.date));
    const best = exLogs.length > 0
      ? Math.max(...exLogs.flatMap(l => l.sets.map(s => s.reps || 0)))
      : 0;
    const target = g.targetReps || 0;
    const progress = target > 0 ? Math.min(100, Math.round((best / target) * 100)) : 0;
    return { ...g, exerciseName: ex?.name || 'Unknown', best, progress };
  });

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Shift6</h1>
      <p className="text-gray-400">{loggedToday ? '✅ Logged today' : '⚪ Nothing logged yet today'}</p>

      {/* Weekly frequency grid */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Weekly Body Part Frequency</h2>
        <div className="grid grid-cols-2 gap-2">
          {BODY_PARTS.map(bp => {
            const freq = bodyFreq[bp] || 0;
            const color = freq >= 2 ? 'bg-green-600' : freq === 1 ? 'bg-yellow-600' : 'bg-gray-700';
            return (
              <div key={bp} className={`${color} rounded-lg p-3 flex justify-between`}>
                <span>{bp}</span>
                <span className="font-bold">{freq}x</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Goals summary */}
      {goalProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">6-Week Goals</h2>
          <div className="space-y-3">
            {goalProgress.map(g => (
              <div key={g.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between mb-1">
                  <span>{g.exerciseName}</span>
                  <span>{g.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${g.progress}%` }} />
                </div>
                <div className="text-sm text-gray-400 mt-1">{g.best} / {g.targetReps} reps</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick log button */}
      <button
        onClick={() => window.location.hash = '#/log'}
        className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-lg"
      >
        + Log Exercise
      </button>
    </div>
  );
}
