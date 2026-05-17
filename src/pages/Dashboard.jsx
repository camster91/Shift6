import { useState, useMemo, useEffect } from 'react';
import { Play, Flame, Plus, Dumbbell, TrendingUp, X, Zap } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP } from '../data/exercises';
import { t } from '../i18n';

// ──────────── Body part icons ────────────
const BODY_PART_ICONS = {
  Chest: '💪', Back: '🔙', Shoulders: '🎯', Legs: '🦵',
  Arms: '💪', Core: '🔥', Glutes: '🍑',
};

// ──────────── Animated Progress Ring ────────────
function ProgressRing({ progress, size = 48, stroke = 4, color = '#06b6d4', delay = 0 }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const radius = (size - stroke * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = animated ? circumference - progress * circumference : circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle stroke="rgba(30,41,59,0.3)" strokeWidth={stroke} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
      <circle
        stroke={color} strokeWidth={stroke} fill="transparent" r={radius} cx={size / 2} cy={size / 2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: animated ? 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }}
        filter={`drop-shadow(0 0 4px ${color}50)`}
      />
    </svg>
  );
}

// ──────────── Streak Badge ────────────
function StreakBadge({ streak }) {
  if (streak === 0) return null;
  const messages = {
    1: t('streak.justGettingStarted'),
    2: t('streak.buildingMomentum'),
    3: t('streak.onFire'),
    7: t('streak.oneWeekStrong'),
    14: t('streak.twoWeeksUnstoppable'),
    30: t('streak.oneMonthLegendary'),
  };
  const msg = Object.entries(messages).reverse().find(([k]) => streak >= Number(k))?.[1];
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
      <Flame size={16} className="text-orange-400 fill-orange-400" />
      <span className="font-bold text-orange-400">{streak} {t('common.dayStreak')}</span>
      {msg && <span className="text-xs text-orange-300/70 hidden sm:inline">· {msg}</span>}
    </div>
  );
}

// ──────────── Exercise Card ────────────
function ExerciseCard({ exercise, bestReps, bestWeight, logsCount, progress, onQuickStart, onRemove }) {
  const colors = COLOR_MAP[exercise.color] || COLOR_MAP.cyan;
  const icon = BODY_PART_ICONS[exercise.bodyPart] || '💪';

  return (
    <div className={`glass-card rounded-2xl overflow-hidden animate-fade-in group relative`}>
      <button
        onClick={() => onQuickStart?.(exercise.id)}
        className="w-full text-left p-4 hover:opacity-90 transition-all pr-14"
      >
        <div className="flex items-center gap-3">
          {/* Color-coded icon */}
          <div className={`w-11 h-11 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0 text-lg group-hover:scale-105 transition-transform`}>
            {icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-white text-sm">{exercise.name}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                {exercise.bodyPart}
              </span>
            </div>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>{t('common.best')}: <span className={`font-semibold ${colors.text}`}>{bestReps} rep{bestReps !== 1 ? 's' : ''}</span></span>
              {bestWeight > 0 && <span>· <span className={colors.text}>{bestWeight} {t('common.lbs')}</span></span>}
              {logsCount > 0 && <span>· {logsCount} {t('exerciseCard.setsThisWeek')}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <ProgressRing progress={progress} size={40} stroke={3.5} color={colors.hex} delay={100} />
            <Play size={16} className="text-cyan-400/60 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </button>

      {/* Remove button - always visible on touch devices */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove?.(exercise.id); }}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-800/80 text-slate-500 hover:bg-red-500/30 hover:text-red-400 flex items-center justify-center transition-all opacity-100"
        aria-label="Remove exercise"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ──────────── PR Banner ────────────
function PRBanner({ ex, best }) {
  const colors = COLOR_MAP[ex.color] || COLOR_MAP.cyan;
  return (
    <div className={`flex-shrink-0 rounded-xl p-3 border ${colors.border} ${colors.bg}`}>
      <p className="text-xs text-slate-400 mb-0.5">{ex.name}</p>
      <p className={`text-base font-black ${colors.text}`}>{best} reps</p>
    </div>
  );
}

// ──────────── Weekly Volume Sparkline ────────────
function VolumeSparkline({ logs }) {
  const data = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = logs.filter(l => l.date.startsWith(dateStr)).length;
      days.push(count);
    }
    const max = Math.max(...days, 1);
    return { days, max };
  }, [logs]);

  const barWidth = 3;
  const gap = 2;
  const height = 20;

  return (
    <svg width={28} height={height} className="opacity-70 flex-shrink-0">
      {data.days.map((count, i) => {
        const h = data.max > 0 ? (count / data.max) * (height - 2) + 2 : 2;
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={1}
            fill={count > 0 ? '#06b6d4' : '#334155'}
          />
        );
      })}
    </svg>
  );
}

// ──────────── Quick Start FAB ────────────
function QuickStartFAB({ onClick, visible }) {
  if (!visible) return null;
  return (
    <button
      onClick={() => { navigator.vibrate?.(50); onClick(); }}
      className="fab group"
      aria-label="Start workout"
    >
      <Play size={26} className="fill-current ml-0.5 group-hover:scale-110 transition-transform" />
    </button>
  );
}

// ──────────── Greeting ────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return t('dashboard.greeting.morning');
  if (h < 17) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.evening');
}

export default function Dashboard({ onStartWorkout, onOpenLibrary, onViewExercise }) {
  const {
    exercises, logs,
    getBestSet, getBestWeight, getCurrentStreak,
    getTodayLogs, getThisWeekLogs, removeExercise,
  } = useData();

  const todayLogs = getTodayLogs();
  const weekLogs = getThisWeekLogs();
  const streak = getCurrentStreak();

  const handleRemoveExercise = (exId) => {
    if (window.confirm(`Remove ${exercises.find(e => e.id === exId)?.name} from your collection?`)) {
      removeExercise(exId);
      navigator.vibrate?.(30);
    }
  };

  // Yesterday for last workout message

  // Per-exercise stats — sorted by least-recently-trained first
  const exerciseStats = useMemo(() => {
    const withStats = exercises.map(ex => {
      const exLogs = logs.filter(l => l.exerciseId === ex.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastLog = exLogs[0];
      return {
        ...ex,
        bestReps: getBestSet(ex.id),
        bestWeight: getBestWeight(ex.id),
        logsCount: weekLogs.filter(l => l.exerciseId === ex.id).length,
        lastLogDate: lastLog ? new Date(lastLog.date).getTime() : 0,
      };
    });
    // Never-done first, then oldest lastLogDate ascending
    return withStats.sort((a, b) => {
      if (a.lastLogDate === 0 && b.lastLogDate > 0) return -1;
      if (b.lastLogDate === 0 && a.lastLogDate > 0) return 1;
      return a.lastLogDate - b.lastLogDate;
    });
  }, [exercises, logs, weekLogs, getBestSet, getBestWeight]);

  // Overall progress
  const overallProgress = useMemo(() => {
    if (exercises.length === 0) return 0;
    const totals = exercises.reduce((acc, ex) => {
      const best = getBestSet(ex.id);
      const target = ex.startReps * 2;
      return { current: acc.current + Math.min(best, target), target: acc.target + target };
    }, { current: 0, target: 0 });
    return totals.target > 0 ? Math.min(1, totals.current / totals.target) : 0;
  }, [exercises, getBestSet]);

  const nextUpExercise = exerciseStats[0];
  const getDaysSince = (ms) => {
    if (!ms) return null;
    const days = Math.floor((Date.now() - ms) / 864e5);
    if (days === 0) return 'today';
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Recent PRs (new this week)
  const recentPRs = useMemo(() => {
    return exercises.map(ex => {
      const exLogs = logs.filter(l => l.exerciseId === ex.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const best = getBestSet(ex.id);
      if (exLogs.length < 2) return { ex, best, isNew: false };
      const secondBest = exLogs[1]?.reps || 0;
      return { ex, best, isNew: best > secondBest && best > ex.startReps };
    }).filter(r => r.isNew).slice(0, 3);
  }, [exercises, logs, getBestSet]);

  const lastWorkoutText = (() => {
    if (todayLogs.length > 0) return t('dashboard.workoutStatus.alreadyTrained');
    const yStr = new Date(Date.now() - 864e5).toISOString().split('T')[0];
    const yLogs = logs.filter(l => l.date.startsWith(yStr));
    if (yLogs.length > 0) return t('dashboard.workoutStatus.readyToTrain');
    return t('dashboard.workoutStatus.noWorkoutYet');
  })();

  return (
    <div className="p-4 pb-32 space-y-5 max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">{getGreeting()}</p>
          <h1 className="text-2xl font-black text-white">Shift6</h1>
          <p className="text-xs text-slate-400 mt-0.5">{lastWorkoutText}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {streak > 0 && <StreakBadge streak={streak} />}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Weekly</p>
              <p className="text-sm font-bold text-cyan-400">{weekLogs.length} sets</p>
            </div>
            <VolumeSparkline logs={logs} />
            <ProgressRing progress={overallProgress} size={44} stroke={4} color="#06b6d4" delay={200} />
          </div>
        </div>
      </div>

      {/* ── PRs ── */}
      {recentPRs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={12} className="text-emerald-400" />
            {t('dashboard.newRecords')}
          </h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {recentPRs.map(({ ex, best }) => <PRBanner key={ex.id} ex={ex} best={best} />)}
          </div>
        </div>
      )}

      {/* ── Start Workout ── */}
      {exercises.length > 0 && (
        <button
          onClick={() => { navigator.vibrate?.(30); onStartWorkout?.(); }}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl py-4 font-bold text-white shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
                  <Zap size={20} className="fill-current" />
          {nextUpExercise ? nextUpExercise.name : t('dashboard.startWorkout')}
          {nextUpExercise && nextUpExercise.lastLogDate === 0 && (
            <span className="text-cyan-200 text-sm font-normal"> · first time</span>
          )}
          {nextUpExercise && nextUpExercise.lastLogDate > 0 && (
            <span className="text-cyan-200 text-sm font-normal"> · {getDaysSince(nextUpExercise.lastLogDate)}</span>
          )}
        </button>
      )}

      {/* ── Your Exercises ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.yourExercises')}</h2>
          <button onClick={onOpenLibrary}
            className="text-xs text-cyan-400 flex items-center gap-1 hover:text-cyan-300 transition-colors font-medium">
            <Plus size={13} /> {t('common.browse')}
          </button>
        </div>

        <div className="space-y-2">
          {exerciseStats.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              bestReps={ex.bestReps}
              bestWeight={ex.bestWeight}
              logsCount={ex.logsCount}
              progress={ex.bestReps > 0 ? Math.min(1, ex.bestReps / (ex.startReps * 2)) : 0}
              onQuickStart={(id) => { navigator.vibrate?.(20); onViewExercise?.(id); }}
              onRemove={handleRemoveExercise}
            />
          ))}
        </div>

        {exercises.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
              <Dumbbell size={32} className="text-cyan-400" />
            </div>
            <p className="text-slate-300 mb-2 font-medium">{t('dashboard.buildCollection')}</p>
            <p className="text-slate-500 text-sm mb-6">{t('dashboard.chooseExercises')}</p>
            <button onClick={onOpenLibrary}
              className="bg-cyan-500 text-white px-8 py-3 rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-cyan-500/20">
              {t('dashboard.browseExercises')}
            </button>
          </div>
        )}
      </div>

      <QuickStartFAB visible={exercises.length > 0} onClick={() => onStartWorkout?.()} />
    </div>
  );
}