import { useMemo } from 'react';
import { Calendar, TrendingUp, Flame, Award, Activity, Trophy } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { PERIODIZATION, getWeekConfig } from '../data/armorEngine';

/* ═══════════════════════════════════════════════════════════
   ARMOR PROGRESS v2.0 — Apple HIG
   Six pillars visualization. Volume charts. Streak ring.
   ═══════════════════════════════════════════════════════════ */

function Stat({ label, value, sub, accent }) {
  return (
    <div className="armor-surface-1 p-4 space-y-1">
      <p className="armor-text-caption" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-2xl font-black tabular-nums" style={{ color: accent || 'white' }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-600">{sub}</p>}
    </div>
  );
}

function CycleBlocks({ week, totalCycles }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="armor-text-caption">Cycle {totalCycles + 1}</p>
        <p className="text-[11px] text-slate-500">Week {week}/6</p>
      </div>
      <div className="flex gap-1.5">
        {PERIODIZATION.map(w => {
          const done = w.week < week;
          const current = w.week === week;
          return (
            <div key={w.week} className="flex-1 space-y-1">
              <div className={`h-8 rounded-lg transition-all ${
                done ? '' : current ? '' : ''
              }`} style={{
                background: done ? 'rgba(16,185,129,0.4)' :
                  current ? 'var(--color-accent)' :
                  'rgba(255,255,255,0.04)',
                boxShadow: current ? '0 0 12px rgba(6,182,212,0.4)' : 'none'
              }} />
              <p className={`text-[9px] font-bold text-center ${current ? 'text-cyan-400' : done ? 'text-emerald-500/60' : 'text-slate-700'}`}>
                {w.phase.slice(0, 4)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StreakRing({ streak, best }) {
  const radius = 50;
  const circ = 2 * Math.PI * radius;
  const target = 30; // visual goal
  const pct = Math.min(1, streak / target);
  const offset = circ * (1 - pct);

  return (
    <div className="armor-surface-2 p-5 flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <svg width={96} height={96} className="transform -rotate-90">
          <circle cx={48} cy={48} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
          <circle cx={48} cy={48} r={radius} fill="none" stroke="var(--color-warning)" strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            filter="drop-shadow(0 0 6px rgba(245,158,11,0.4))"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Flame size={14} className="text-amber-400 mb-0.5" fill="currentColor" />
          <span className="text-lg font-black text-white tabular-nums">{streak}</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">Day Streak</p>
        <p className="text-[11px] text-slate-500">Best: {best} days · Freeze: 1</p>
        <p className="text-[11px] text-amber-400 mt-0.5">{target - streak > 0 ? `${target - streak} to 30-day badge` : '30-day badge earned'}</p>
      </div>
    </div>
  );
}

function VolumeBar({ history }) {
  const data = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const vol = history
        .filter(w => w.date === dateStr)
        .reduce((s, w) => s + (w.exercises || []).reduce((es, ex) => es + (ex.sets || []).reduce((ss, x) => ss + (x.reps || 0) * (x.weight || 0), 0), 0), 0);
      days.push(vol);
    }
    const max = Math.max(...days, 1);
    return { days, max };
  }, [history]);

  return (
    <div className="armor-surface-1 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="armor-text-caption">Last 7 Days · Volume</p>
        <p className="text-[11px] text-slate-600">lbs lifted</p>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {data.days.map((v, i) => {
          const pct = v / data.max;
          const day = new Date();
          day.setDate(day.getDate() - (6 - i));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(4, pct * 100)}%`,
                  background: v > 0 ? 'linear-gradient(180deg, var(--color-accent), rgba(6,182,212,0.3))' : 'rgba(255,255,255,0.04)',
                  boxShadow: v > 0 ? '0 0 8px rgba(6,182,212,0.3)' : 'none',
                }}
              />
              <span className="text-[9px] text-slate-600 font-bold">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.getDay()]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ArmorProgress() {
  const { currentCycle, workoutHistory, streakData, estimated1RMs } = useArmorData();
  const weekConfig = getWeekConfig(currentCycle.week);

  const thisWeekWorkouts = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return workoutHistory.filter(w => new Date(w.date) >= weekStart);
  }, [workoutHistory]);

  const weeklyVolume = useMemo(() => {
    return thisWeekWorkouts.reduce((s, w) =>
      s + (w.exercises || []).reduce((es, ex) =>
        es + (ex.sets || []).reduce((ss, x) => ss + (x.reps || 0) * (x.weight || 0), 0), 0), 0);
  }, [thisWeekWorkouts]);

  const sorted1RMs = Object.entries(estimated1RMs).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);

  if (workoutHistory.length === 0) {
    return (
      <div className="pb-28 max-w-lg mx-auto">
        <div className="px-5 pt-8 pb-6">
          <h1 className="armor-text-large-title">Progress</h1>
        </div>
        <div className="px-5 py-16 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--elevation-1-bg)' }}>
            <Trophy size={32} className="text-slate-700" />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">No Sessions Yet</h2>
          <p className="text-sm text-slate-500">Complete your first workout to see your progress here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-6">
        <h1 className="armor-text-large-title">Progress</h1>
        <p className="armor-text-footnote mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {weekConfig.phase} Phase · Week {currentCycle.week}/6
        </p>
      </div>

      <div className="px-5 space-y-5">
        {/* Cycle Blocks */}
        <div className="armor-surface-1 p-4">
          <CycleBlocks week={currentCycle.week} totalCycles={currentCycle.totalCyclesCompleted} />
        </div>

        {/* Streak Ring */}
        <StreakRing streak={streakData.currentStreak} best={streakData.longestStreak} />

        {/* Volume Chart */}
        <VolumeBar history={workoutHistory} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="This Week" value={thisWeekWorkouts.length} sub="sessions" accent="var(--color-accent)" />
          <Stat label="Weekly Volume" value={`${(weeklyVolume / 1000).toFixed(1)}k`} sub="lbs" accent="var(--color-success)" />
          <Stat label="Total Sets" value={workoutHistory.reduce((s, w) => s + (w.exercises || []).reduce((es, ex) => es + (ex.sets || []).length, 0), 0)} accent="var(--color-cardio)" />
          <Stat label="Cycles" value={currentCycle.totalCyclesCompleted} sub="completed" accent="var(--color-warning)" />
        </div>

        {/* 1RM Leaderboard */}
        {sorted1RMs.length > 0 && (
          <div className="space-y-2">
            <p className="armor-text-caption px-4" style={{ letterSpacing: '0.1em' }}>Estimated 1RMs</p>
            <div className="armor-surface-1 overflow-hidden">
              {sorted1RMs.slice(0, 6).map(([id, val], i) => {
                const max = sorted1RMs[0]?.[1] || val;
                return (
                  <div key={id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span className="text-[10px] font-bold text-slate-700 w-4 tabular-nums">{i + 1}</span>
                    <span className="text-sm font-medium text-white flex-1 capitalize">{id.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-black text-cyan-400 tabular-nums">{val}</span>
                    <span className="text-[10px] text-slate-600">lbs</span>
                    <div className="w-12 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, background: 'var(--color-accent)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div className="space-y-2">
          <p className="armor-text-caption px-4" style={{ letterSpacing: '0.1em' }}>Recent Sessions</p>
          <div className="armor-surface-1 overflow-hidden">
            {[...workoutHistory].reverse().slice(0, 6).map((w, i) => (
              <div key={i} className="px-4 py-3"
                style={{ borderTop: i > 0 ? '0.5px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <span className="text-[10px] font-bold uppercase" style={{ color: w.type === 'vo2max' ? 'var(--color-cardio)' : 'var(--color-accent)' }}>
                    {w.type === 'vo2max' ? 'Cardio' : 'Strength'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {(w.exercises || []).length} exercises · {(w.exercises || []).reduce((s, e) => s + (e.sets || []).length, 0)} sets
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
