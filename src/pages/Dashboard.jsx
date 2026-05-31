import { useState, useMemo } from 'react';
import { Flame, Plus, Dumbbell, TrendingUp, X, Zap, ChevronRight, Play } from 'lucide-react';
import { useData } from '../hooks/useData';
import { COLOR_MAP } from '../data/exercises';
import { t } from '../i18n';
import { getLocalDateString } from '../utils/date.js';

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

// ──────────── Exercise Mini Row ────────────
function ExerciseMiniRow({ exercise, bestReps, weekSets, lastDate, onClick, onRemove, isPendingRemove }) {
  const colors = COLOR_MAP[exercise.color] || COLOR_MAP.cyan;
  const icon = BODY_PART_ICONS[exercise.bodyPart] || '💪';
  const daysSince = lastDate ? Math.floor((Date.now() - lastDate) / 864e5) : null;

  let statusText = '';
  let statusColor = 'text-slate-500';
  if (!lastDate) { statusText = 'Never trained'; statusColor = 'text-orange-400'; }
  else if (daysSince === 0) { statusText = 'Today'; statusColor = 'text-emerald-400'; }
  else if (daysSince === 1) { statusText = 'Yesterday'; statusColor = 'text-cyan-400'; }
  else { statusText = `${daysSince}d ago`; statusColor = 'text-slate-500'; }

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/50 active:scale-[0.98] transition-all"
    >
      <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 text-sm`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{exercise.name}</p>
        <p className="text-[10px] font-medium leading-relaxed">
          <span className={statusColor}>{statusText}</span>
          {bestReps > 0 && <span className="text-slate-600"> · Best: {bestReps}</span>}
          {weekSets > 0 && <span className="text-slate-600"> · {weekSets} this week</span>}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove?.(exercise.id); }}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 font-bold text-[10px] ${
          isPendingRemove
            ? 'bg-red-500 text-white'
            : 'bg-slate-800/80 text-slate-500 hover:bg-red-500/30 hover:text-red-400'
        }`}
        aria-label={isPendingRemove ? 'Confirm remove' : 'Remove exercise'}
      >
        {isPendingRemove ? '?' : <X size={12} />}
      </button>
    </button>
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

  const [pendingRemove, setPendingRemove] = useState(null);

  const handleRemoveExercise = (exId) => {
    if (pendingRemove === exId) {
      removeExercise(exId);
      navigator.vibrate?.(30);
      setPendingRemove(null);
    } else {
      setPendingRemove(exId);
    }
  };

  const exerciseStats = useMemo(() => {
    return (exercises || []).map(ex => {
      const exLogs = logs.filter(l => l.exerciseId === ex.id).sort((a, b) => new Date(b.date) - new Date(a.date));
      const lastLog = exLogs[0];
      return {
        ...ex,
        bestReps: getBestSet(ex.id),
        weekSets: weekLogs.filter(l => l.exerciseId === ex.id).length,
        lastDate: lastLog ? new Date(lastLog.date).getTime() : null,
      };
    }).sort((a, b) => {
      if (!a.lastDate && !b.lastDate) return 0;
      if (!a.lastDate) return -1;
      if (!b.lastDate) return 1;
      return a.lastDate - b.lastDate;
    });
  }, [exercises, logs, weekLogs, getBestSet]);

  const overallProgress = useMemo(() => {
    if (!exercises?.length) return 0;
    const totals = exercises.reduce((acc, ex) => {
      const best = getBestSet(ex.id);
      const target = ex.startReps * 2;
      return { current: acc.current + Math.min(best, target), target: acc.target + target };
    }, { current: 0, target: 0 });
    return totals.target > 0 ? Math.min(1, totals.current / totals.target) : 0;
  }, [exercises, getBestSet]);

  const nextUp = exerciseStats[0];

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
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yStr = getLocalDateString(yesterday);
    const yLogs = logs.filter(l => getLocalDateString(new Date(l.date)) === yStr);
    if (yLogs.length > 0) return t('dashboard.workoutStatus.readyToTrain');
    return t('dashboard.workoutStatus.noWorkoutYet');
  })();

  return (
    <div className="p-4 pb-24 space-y-5 max-w-lg mx-auto">

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

      {/* ── Primary CTA ── */}
      {nextUp && (
        <button
          onClick={() => { navigator.vibrate?.(30); onViewExercise?.(nextUp.id); }}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left hover:border-cyan-500/30 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500 flex items-center justify-center shrink-0">
              <Play size={28} className="text-white fill-current ml-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-0.5">Next Up</p>
              <h2 className="text-lg font-black text-white truncate">{nextUp.name}</h2>
              <p className="text-xs text-slate-500">
                {!nextUp.lastDate
                  ? 'First time — establish your baseline'
                  : `${Math.floor((Date.now() - nextUp.lastDate) / 864e5)} days since last session`}
              </p>
            </div>
            <ChevronRight size={20} className="text-slate-600 shrink-0" />
          </div>
        </button>
      )}

      {/* ── Start Routine ── */}
      {exercises.length > 0 && (
        <button
          onClick={() => { navigator.vibrate?.(30); onStartWorkout?.(); }}
          className="w-full bg-cyan-500 rounded-2xl py-4 font-bold text-white shadow-lg shadow-cyan-500/10 active:scale-95 active:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Zap size={18} className="fill-current" />
          Start Routine ({exercises.length} exercises)
        </button>
      )}

      {/* ── Exercise List ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.yourExercises')}</h2>
          <button onClick={onOpenLibrary}
            className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 hover:text-cyan-300 transition-colors px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Plus size={12} /> {t('common.browse')}
          </button>
        </div>

        <div className="space-y-1.5">
          {exerciseStats.map((ex) => (
            <ExerciseMiniRow
              key={ex.id}
              exercise={ex}
              bestReps={ex.bestReps}
              weekSets={ex.weekSets}
              lastDate={ex.lastDate}
              onClick={() => { navigator.vibrate?.(20); onViewExercise?.(ex.id); }}
              onRemove={handleRemoveExercise}
              isPendingRemove={pendingRemove === ex.id}
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
    </div>
  );
}
