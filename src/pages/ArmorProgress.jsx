import { useMemo, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import { PERIODIZATION, getWeekConfig } from '../data/armorEngine';
import { Card, PageHeader, EmptyState } from '../components/ui';

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

/* ── PR Timeline SVG line chart ─────────────────────────── */
function PRTimelineChart({ data, liftName }) {
  if (!data || data.length === 0) return null;

  const w = 320, h = 120, pad = 24;
  const xs = data.map((_, i) => pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1));
  const maxV = Math.max(...data.map(d => d.value), 1);
  const ys = data.map(d => h - pad - (d.value / maxV) * (h - 2 * pad));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');

  // Round Y-axis to nearest 25
  const yMax = Math.ceil(maxV / 25) * 25;

  return (
    <Card className="p-4 space-y-3">
      <p className="armor-text-caption">Your {liftName} — heaviest set per session</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[320px] h-[120px]" style={{ display: 'block' }}>
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = h - pad - pct * (h - 2 * pad);
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              {i === 0 ? null : (
                <text x={pad - 4} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">
                  {Math.round(pct * yMax)}
                </text>
              )}
            </g>
          );
        })}
        {/* Line */}
        <path d={path} fill="none" stroke="rgb(6,182,212)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r={3} fill="rgb(6,182,212)" />
        ))}
 {/* X-axis labels */}
        {data.map((d, i) => {
          const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <text key={i} x={xs[i]} y={h - 4} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.3)">
              {label}
            </text>
          );
        })}
      </svg>
    </Card>
  );
}

/* ── Volume-per-week SVG bar chart ───────────────────────── */
function VolumeWeeklyChart({ data }) {
  if (!data || data.length === 0) return null;

  const barW = 36, gap = 8, chartH = 100, labelH = 16;
  const totalW = data.length * (barW + gap) + gap;
  const maxV = Math.max(...data.map(d => d.volume), 1);

  return (
    <Card className="p-4 space-y-3">
      <p className="armor-text-caption">Weekly Volume</p>
      <svg viewBox={`0 0 ${totalW} ${chartH + labelH}`} className="w-full" style={{ display: 'block', maxHeight: 116 }}>
        {/* Y-axis max label */}
        <text x={4} y={10} fontSize={9} fill="rgba(255,255,255,0.3)">
          {Math.round(maxV).toLocaleString()}
        </text>
        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max(4, (d.volume / maxV) * chartH);
          const x = gap + i * (barW + gap);
          const y = chartH - barH + labelH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill="rgb(6,182,212)" />
              <text x={x + barW / 2} y={chartH + labelH - 2} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.3)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

/* ── Time range segmented control ───────────────────────── */
function TimeRangeToggle({ value, onChange }) {
  return (
    <div className="flex gap-0.5 p-0.5 armor-surface-1 rounded-xl">
      {['30d', 'All'].map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            value === opt
              ? 'bg-cyan-400 text-black'
              : 'text-slate-500 hover:text-white'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function ArmorProgress() {
  const { currentCycle, workoutHistory, streakData, estimated1RMs } = useArmorData();
  const weekConfig = getWeekConfig(currentCycle.week);
  const [timeRange, setTimeRange] = useState('30d');

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

  /* ── Filtered history based on time range ── */
  const filteredHistory = useMemo(() => {
    if (timeRange === 'All') return workoutHistory;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return workoutHistory.filter(w => new Date(w.date) >= cutoff);
  }, [workoutHistory, timeRange]);

  /* ── PR Timeline data ── */
  const prTimelineData = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    // Primary lift IDs
    const primaryLiftIds = new Set([
      'squat', 'bench', 'deadlift',
      'home_squat', 'home_bench', 'home_deadlift',
    ]);

    // Find all unique primary lifts in history
    const liftIdsInHistory = new Set();
    filteredHistory.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (primaryLiftIds.has(ex.id)) liftIdsInHistory.add(ex.id);
      });
    });

    if (liftIdsInHistory.size === 0) return null;

    // Pick the most recently logged primary lift
    let mostRecentLift = null;
    let mostRecentDate = null;
    filteredHistory.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (liftIdsInHistory.has(ex.id)) {
          const d = new Date(w.date);
          if (!mostRecentDate || d > mostRecentDate) {
            mostRecentDate = d;
            mostRecentLift = ex.id;
          }
        }
      });
    });

    if (!mostRecentLift) return null;

    // Build {date, value} for each session containing this lift
    const dateMap = {};
    filteredHistory.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (ex.id !== mostRecentLift) return;
        const heaviest = (ex.sets || []).reduce((best, s) => {
          if (s.completed !== false && s.weight > 0) {
            return Math.max(best, s.weight);
          }
          return best;
        }, 0);
        if (heaviest > 0) {
          dateMap[w.date] = Math.max(dateMap[w.date] || 0, heaviest);
        }
      });
    });

    const entries = Object.entries(dateMap)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-42); // cap at ~6 weeks of1-per-day

    if (entries.length === 0) return null;

    const liftLabel = mostRecentLift.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return {
      liftName: liftLabel,
      data: entries.map(([date, value]) => ({ date, value })),
    };
  }, [filteredHistory]);

  /* ── Volume per week data ── */
  const volumeWeeklyData = useMemo(() => {
    if (filteredHistory.length < 2) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 42); // last 6 weeks
    const recent = filteredHistory.filter(w => new Date(w.date) >= cutoff);

    // Group by ISO week
    const weekMap = {};
    recent.forEach(w => {
      const d = new Date(w.date);
      const year = d.getFullYear();
      const week = getISOWeek(d);
      const key = `${year}-W${week}`;
      if (!weekMap[key]) {
        weekMap[key] = { date: d, volume: 0 };
      }
      weekMap[key].volume += (w.exercises || []).reduce((es, ex) =>
        es + (ex.sets || []).reduce((ss, s) => ss + (s.reps || 0) * (s.weight || 0), 0), 0);
    });

    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, { date, volume }]) => ({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume,
      }));

    return weeks.length >= 2 ? weeks : null;
  }, [filteredHistory]);

  if (workoutHistory.length === 0) {
    return (
      <div className="pb-32 max-w-lg mx-auto">
        <div className="px-5 pt-8 pb-6">
          <PageHeader title="Progress" />
        </div>
        <div className="px-5 space-y-5">
          {/* Placeholder streak card */}
          <Card className="opacity-50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/[0.04]">
                <Flame size={22} className="text-slate-600" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-500">0 day streak</p>
                <p className="text-[11px] text-slate-700">Longest: 0 days</p>
              </div>
            </div>
          </Card>
          {/* Placeholder cycle blocks */}
          <Card className="opacity-50">
            <div className="flex items-center justify-between mb-3">
              <p className="armor-text-caption text-slate-700">Cycle 1</p>
              <p className="text-[11px] text-slate-700">Week 1/6</p>
            </div>
            <div className="flex gap-1.5">
              {PERIODIZATION.map(w => (
                <div key={w.week} className="flex-1 space-y-1">
                  <div className="h-8 rounded-lg bg-white/[0.04]" />
                  <p className="text-[9px] font-bold text-center text-slate-700">{w.phase.slice(0, 4)}</p>
                </div>
              ))}
            </div>
          </Card>
          {/* Placeholder volume bar */}
          <Card className="opacity-50">
            <div className="flex items-center justify-between">
              <p className="armor-text-caption text-slate-700">Last 7 Days · Volume</p>
              <p className="text-[11px] text-slate-700">lbs lifted</p>
            </div>
            <div className="flex items-end gap-1.5 h-24">
              {[40, 60, 30, 70, 50, 80, 45].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full rounded-t-md bg-white/[0.06]" style={{ height: `${h}%` }} />
                  <span className="text-[9px] text-slate-700 font-bold">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}</span>
                </div>
              ))}
            </div>
          </Card>
          {/* CTA copy */}
          <EmptyState
            icon={<Trophy size={48} className="text-slate-700" />}
            title="No Sessions Yet"
            description="Complete your first workout to unlock your progress dashboard."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 max-w-lg mx-auto">
      <div className="px-5 pt-8 pb-6">
        <PageHeader
          title="Progress"
          description={`${weekConfig.phase} Phase · Week ${currentCycle.week}/6`}
        />
      </div>

      <div className="px-5 space-y-5">
        {/* Streak Counter Card */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-500/10">
              <Flame size={22} className="text-amber-400" fill="currentColor" />
            </div>
            <div>
              <p className="text-xl font-black text-white">🔥 {streakData.currentStreak} day streak</p>
              <p className="text-[11px] text-slate-500">Longest: {streakData.longestStreak} days</p>
            </div>
          </div>
        </Card>

        {/* Session Count Chip */}
        <div className="px-4 py-3 armor-surface-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Workouts Completed</span>
          <span className="text-sm font-black text-cyan-400 tabular-nums">
            {workoutHistory.filter(w => w.completed).length}
          </span>
        </div>

        {/* Time Range Toggle */}
        <TimeRangeToggle value={timeRange} onChange={setTimeRange} />

        {/* PR Timeline Chart */}
        {prTimelineData && (
          <PRTimelineChart data={prTimelineData.data} liftName={prTimelineData.liftName} />
        )}

        {/* Volume Weekly Chart */}
        {volumeWeeklyData && (
          <VolumeWeeklyChart data={volumeWeeklyData} />
        )}

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

/* ── ISO week helper ── */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
