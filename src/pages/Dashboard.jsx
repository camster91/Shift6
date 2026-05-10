import { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Zap, Flame, Plus, Dumbbell, TrendingUp, Check, X, RotateCcw, Trophy } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP } from '../data/exercises';

// ──────────── Progress Ring ────────────
function ProgressRing({ progress, size = 48, stroke = 4, color = '#06b6d4' }) {
  const radius = (size - stroke * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle stroke="rgba(30,41,59,0.3)" strokeWidth={stroke} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
      <circle stroke={color} strokeWidth={stroke} fill="transparent" r={radius} cx={size / 2} cy={size / 2}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

// ──────────── Exercise Card ────────────
function ExerciseCard({ exercise, bestReps, bestWeight, logsCount, progress, onQuickStart, onViewLog }) {
  const colors = COLOR_MAP[exercise.color] || COLOR_MAP.cyan;

  return (
    <div className={`glass-card rounded-xl overflow-hidden animate-fade-in`}>
      <button onClick={() => onQuickStart?.(exercise.id)}
        className="w-full text-left p-4 hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
            <Dumbbell className={colors.text} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white truncate">{exercise.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {exercise.bodyPart}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-slate-400">
              <span>Best: <span className={colors.text}>{bestReps} reps</span></span>
              {bestWeight > 0 && <span>Weight: <span className={colors.text}>{bestWeight} lbs</span></span>}
              <span>{logsCount} sets</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProgressRing progress={progress} color={colors.hex} />
            <Play size={16} className="text-cyan-400 flex-shrink-0" />
          </div>
        </div>
      </button>
    </div>
  );
}

// ──────────── Quick Start FAB ────────────
function QuickStartFAB({ onClick, visible }) {
  if (!visible) return null;
  return (
    <button onClick={() => { navigator.vibrate?.(50); onClick(); }}
      className="fab" aria-label="Quick start workout">
      <Play size={28} className="fill-current ml-1" />
    </button>
  );
}

// ──────────── Resume Banner ────────────
function ResumeBanner({ session, exercises, onResume, onDiscard }) {
  if (!session) return null;
  const ex = exercises.find(e => e.id === session.exerciseId);
  const colors = COLOR_MAP[ex?.color] || COLOR_MAP.cyan;
  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 mb-4 animate-pulse-slow`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
            <RotateCcw className={colors.text} size={20} />
          </div>
          <div>
            <p className={`font-bold ${colors.text} text-sm`}>Resume Workout</p>
            <p className="text-xs text-slate-400">{ex?.name} — Set {session.setIndex + 1}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Discard</button>
          <button onClick={() => { navigator.vibrate?.(30); onResume(); }}
            className={`px-4 py-1.5 ${colors.solid} text-white rounded-lg text-xs font-bold`}>Continue</button>
        </div>
      </div>
    </div>
  );
}

// ──────────── Main Dashboard ────────────
export default function Dashboard({ onStartWorkout, onOpenLog, onOpenLibrary, onViewExercise }) {
  const {
    exercises, logs, goals, myExercises,
    getBestSet, getBestWeight, getWeeklyFrequency, getCurrentStreak,
    getTodayLogs, getThisWeekLogs, removeExercise
  } = useData();

  const todayLogs = getTodayLogs();
  const weekLogs = getThisWeekLogs();
  const streak = getCurrentStreak();
  const hasLoggedToday = todayLogs.length > 0;

  // Per-exercise stats
  const exerciseStats = useMemo(() => exercises.map(ex => ({
    ...ex,
    bestReps: getBestSet(ex.id),
    bestWeight: getBestWeight(ex.id),
    logsCount: weekLogs.filter(l => l.exerciseId === ex.id).length,
    weeklyFreq: getWeeklyFrequency(ex.id),
  })), [exercises, logs]);

  // Overall progress (rough)
  const overallProgress = useMemo(() => {
    if (exercises.length === 0) return 0;
    const totals = exercises.reduce((acc, ex) => {
      const best = getBestSet(ex.id);
      const target = ex.startReps * 2;
      return { current: acc.current + Math.min(best, target), target: acc.target + target };
    }, { current: 0, target: 0 });
    return totals.target > 0 ? Math.min(1, totals.current / totals.target) : 0;
  }, [exercises, logs]);

  // Recent PRs
  const recentPRs = useMemo(() => {
    return exercises
      .map(ex => {
        const best = getBestSet(ex.id);
        const exLogs = logs.filter(l => l.exerciseId === ex.id);
        const secondBest = exLogs.length > 1
          ? [...exLogs].sort((a, b) => (b.reps || 0) - (a.reps || 0))[1]?.reps || 0
          : 0;
        return { ex, best, isNew: best > secondBest && best > (ex.startReps * 1.5) };
      })
      .filter(r => r.isNew)
      .slice(0, 3);
  }, [exercises, logs]);

  return (
    <div className="p-4 pb-32 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Shift6</h1>
          <p className="text-sm text-slate-400">{hasLoggedToday ? '✅ Logged today' : '⚪ Nothing logged yet'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-orange-400">
            <Flame size={18} />
            <span className="font-bold">{streak}</span>
          </div>
          <ProgressRing progress={overallProgress} size={44} stroke={4} color="#06b6d4" />
        </div>
      </div>

      {/* Progress banner */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-400">This Week</span>
          <span className="text-xs text-slate-500">{weekLogs.length} sets across {exercises.length} exercises</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
            style={{ width: `${overallProgress * 100}%` }} />
        </div>
      </div>

      {/* Resume banner */}
      <ResumeBanner session={null} exercises={exercises} onResume={() => {}} onDiscard={() => {}} />

      {/* PRs */}
      {recentPRs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" /> New Personal Records
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {recentPRs.map(({ ex, best }) => {
              const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
              return (
                <div key={ex.id} className={`flex-shrink-0 ${colors.bg} border ${colors.border} rounded-xl p-3 min-w-[120px]`}>
                  <p className="text-xs text-slate-400">{ex.name}</p>
                  <p className={`text-lg font-black ${colors.text}`}>{best} reps</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Your Exercises */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Exercises</h2>
          <button onClick={onOpenLibrary}
            className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300 transition-colors">
            <Plus size={14} /> Add
          </button>
        </div>

        <div className="space-y-2">
          {exerciseStats.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              bestReps={ex.bestReps}
              bestWeight={ex.bestWeight}
              logsCount={ex.logsCount}
              progress={ex.bestReps > 0 ? Math.min(1, ex.bestReps / (ex.startReps * 2)) : 0}
              onQuickStart={(id) => onStartWorkout?.(id)}
            />
          ))}
        </div>

        {exercises.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <Dumbbell size={40} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 mb-4">No exercises in your collection yet</p>
            <button onClick={onOpenLibrary}
              className="bg-cyan-500 text-white px-6 py-2 rounded-xl font-bold active:scale-95 transition-transform">
              Browse Exercises
            </button>
          </div>
        )}
      </div>

      {/* Quick Start FAB */}
      <QuickStartFAB
        visible={exercises.length > 0}
        onClick={() => onStartWorkout?.()}
      />
    </div>
  );
}
