import { useEffect, useMemo } from 'react';
import { Play, Flame, Check, Shield, Zap } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import {
  getTodaysWorkout, getDailyHabits, MODIFIERS, MVD_PROTOCOL,
  VO2MAX_PROTOCOL, PERIODIZATION, getWeekConfig, EQUIPMENT_TRACKS,
} from '../data/armorEngine';
import PlateVisualizer from '../components/PlateVisualizer';

/* ═══════════════════════════════════════════════════════════
   ARMOR DASHBOARD v2.0 — Apple HIG design system
   Zero borders. Elevation-based depth. Typographic hierarchy.
   ═══════════════════════════════════════════════════════════ */

function CycleProgress({ week, day, totalCyclesCompleted }) {
  const weekConfig = getWeekConfig(week);
  const totalDays = 30;
  const done = (week - 1) * 5 + Math.min(day - 1, 4);
  const pct = Math.max(2, (done / totalDays) * 100);

  return (
    <div className="armor-surface-1 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="armor-text-caption">Cycle {totalCyclesCompleted + 1} · Week {week}</span>
        <span className="text-[11px] font-bold text-cyan-400">{weekConfig.phase}</span>
      </div>
      <div className="armor-progress-track">
        <div className="armor-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between">
        {PERIODIZATION.map(w => (
          <span key={w.week} className={`text-[9px] font-bold tracking-wide transition-colors ${
            w.week === week ? 'text-cyan-400' :
            w.week < week ? 'text-emerald-500/60' : 'text-slate-700'
          }`}>
            {w.week}
          </span>
        ))}
      </div>
    </div>
  );
}

function ModifierRow({ activeModifiers, onToggle }) {
  const entries = Object.values(MODIFIERS);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <Zap size={10} className="text-slate-600" />
        <span className="armor-text-caption" style={{ letterSpacing: '0.08em' }}>Protocols</span>
        {Object.values(activeModifiers).some(v => v) && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {entries.map(mod => {
          const active = activeModifiers[mod.id];
          return (
            <button
              key={mod.id}
              onClick={() => onToggle(mod.id)}
              aria-pressed={active}
              className={`armor-press flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap ${
                active
                  ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                  : 'bg-white/[0.03] text-slate-500 hover:text-slate-400'
              }`}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              <span>{mod.icon}</span>
              <span className="whitespace-nowrap">{mod.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HabitCheck({ habit, done, onToggle }) {
  return (
    <button
      onClick={onToggle}
      role="checkbox"
      aria-checked={done}
      className={`armor-press w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        done
          ? 'bg-emerald-500/8'
          : 'bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
        done ? 'bg-emerald-500' : 'bg-white/[0.06]'
      }`}>
        {done ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'text-emerald-400' : 'text-slate-300'}`}>
          {habit.label}
        </p>
        <p className="text-[11px] text-slate-600">
          {habit.duration}{habit.unit} · {habit.anchor}
        </p>
      </div>
      <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
        {habit.duration}m
      </span>
    </button>
  );
}

function QuickStat({ icon, label, value }) {
  return (
    <div className="bg-white/[0.02] rounded-xl px-4 py-3 text-center">
      <p className="text-slate-600 mb-1" style={{ fontSize: '18px' }}>{icon}</p>
      <p className="text-sm font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

/* ── MAIN DASHBOARD ────────────────────────────────────────── */

export default function ArmorDashboard({ onStartWorkout }) {
  const {
    activeModifiers, dailyHabitState, currentCycle, userProfile,
    toggleModifier, toggleHabit, resetDailyHabits,
    estimated1RMs, equipmentTrack, effectiveTrack, todaysTrack, setTodaysTrack,
    todaysWorkoutCompleted, habitsNeedReset, streakData, isMVDToday,
  } = useArmorData();

  useEffect(() => {
    if (habitsNeedReset) resetDailyHabits();
  }, [habitsNeedReset, resetDailyHabits]);

  const weekConfig = getWeekConfig(currentCycle.week);
  const todayWorkout = useMemo(() =>
    getTodaysWorkout(effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs),
    [effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs]);
  const dailyHabits = useMemo(() => getDailyHabits(activeModifiers), [activeModifiers]);
  const habitsCompleted = dailyHabits.filter(h => dailyHabitState[h.id]).length;
  const allHabitsDone = habitsCompleted === dailyHabits.length;
  const todayDone = todaysWorkoutCompleted || isMVDToday;
  const isMVD = activeModifiers.mvdMode;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const streak = streakData.currentStreak || 0;
  const top1RM = Math.max(...Object.values(estimated1RMs), 0);

  return (
    <div className="pb-32 space-y-5 max-w-lg mx-auto">
      {/* ── HEADER ── */}
      <div className="px-5 pt-8 pb-2">
        <p className="armor-text-caption mb-1">{greeting}{userProfile.displayName ? `, ${userProfile.displayName}` : ''}</p>
        <div className="flex items-center justify-between">
          <h1 className="armor-text-large-title">
            <span className="text-cyan-400">Armor</span>
          </h1>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10">
                <Flame size={13} className="text-orange-400" fill="currentColor" />
                <span className="text-xs font-bold text-orange-400 tabular-nums">{streak}</span>
              </div>
            )}
            {todayDone && (
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10">
                <span className="text-[11px] font-bold text-emerald-400">Done</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* ── CYCLE PROGRESS ── */}
        <CycleProgress week={currentCycle.week} day={currentCycle.day} totalCyclesCompleted={currentCycle.totalCyclesCompleted} />

        {/* ── MODIFIERS ── */}
        <ModifierRow activeModifiers={activeModifiers} onToggle={toggleModifier} />

        {/* ── TODAY'S WORKOUT ── */}
        {isMVD ? (
          <div className="armor-surface-2 p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-amber-400" />
              <h2 className="text-lg font-black text-amber-400">Minimum Viable Day</h2>
            </div>
            <p className="armor-text-footnote text-amber-400/60">
              Your streak is protected. Complete these three things.
            </p>
            <div className="space-y-2">
              {[
                { icon: '💪', label: `${MVD_PROTOCOL.pushups.total} Push-Ups`, sub: 'Accumulate throughout the day' },
                { icon: '🚶', label: `${MVD_PROTOCOL.walk.duration}-Minute Walk`, sub: 'Brisk pace, outdoors if possible' },
                { icon: '🧘', label: `${MVD_PROTOCOL.mobility.duration}-Minute Mobility`, sub: 'Hips, hamstrings, thoracic spine' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03]">
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-600">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Per-workout track switcher. Default is the user's primary track;
                tapping a track flips today's session only. */}
            <div className="armor-press flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--elevation-1-bg)' }}>
              {Object.values(EQUIPMENT_TRACKS).map(t => {
                const active = effectiveTrack === t.id;
                const isOverride = todaysTrack === t.id && todaysTrack !== equipmentTrack;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTodaysTrack(t.id === equipmentTrack ? null : t.id)}
                    className="armor-press flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: active ? 'var(--color-accent-muted, rgba(6,182,212,0.12))' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--text-tertiary, #64748b)',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{t.icon}</span>
                    <span>{t.label}</span>
                    {isOverride && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>
            <div className={`armor-surface-2 p-5 space-y-4 relative overflow-hidden ${
              todayWorkout.type === 'vo2max' ? '' : ''
            }`}>
            {/* Ambient glow based on workout type */}
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-20 ${
              todayWorkout.type === 'vo2max' ? 'bg-rose-500' : 'bg-cyan-500'
            }`} />

            {/* Title row */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '28px' }}>{todayWorkout.type === 'vo2max' ? '🫀' : '🏋️'}</span>
                <div>
                  <h2 className="text-lg font-black text-white">{todayWorkout.name}</h2>
                  <p className="armor-text-caption" style={{ letterSpacing: '0.08em', color: todayWorkout.type === 'vo2max' ? 'var(--color-cardio)' : 'var(--color-accent)' }}>
                    {todayWorkout.type === 'vo2max' ? 'VO₂ Max' : 'Strength'} · {weekConfig.phase}
                  </p>
                </div>
              </div>
              {!todayDone && (
                <button
                  onClick={onStartWorkout}
                  className="armor-press flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold text-white"
                  style={{ background: todayWorkout.type === 'vo2max' ? 'var(--color-cardio)' : 'var(--color-accent)' }}
                >
                  <Play size={14} className="fill-current" />
                  Start
                </button>
              )}
              {todayDone && (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={16} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Workout details */}
            {todayWorkout.type === 'vo2max' ? (
              <div className="relative z-10 bg-rose-500/5 rounded-xl px-4 py-3 flex items-center gap-3">
                <span style={{ fontSize: '20px' }}>🏃</span>
                <div>
                  <p className="text-sm font-bold text-white">{VO2MAX_PROTOCOL.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {VO2MAX_PROTOCOL.rounds}×{VO2MAX_PROTOCOL.workSeconds / 60}min work · {VO2MAX_PROTOCOL.restSeconds / 60}min rest · {VO2MAX_PROTOCOL.targetHR}
                  </p>
                </div>
              </div>
            ) : todayWorkout.primaryLift ? (
              <div className="relative z-10 space-y-3">
                {/* Primary lift card */}
                <div className="bg-white/[0.04] rounded-xl px-4 py-3">
                  <p className="armor-text-caption mb-2">Primary Lift</p>
                  <div className="flex items-end justify-between">
                    <span className="text-base font-bold text-white capitalize">
                      {todayWorkout.primaryLift.exerciseId?.replace(/_/g, ' ')}
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-cyan-400 tabular-nums">
                        {todayWorkout.primaryLift.weight}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">lbs</span>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {todayWorkout.primaryLift.sets}×{todayWorkout.primaryLift.reps} @ {Math.round(todayWorkout.primaryLift.pct * 100)}%
                      </p>
                    </div>
                  </div>
                  {/* Inline plate visualizer so the user knows exactly what to load
                      before tapping Start. */}
                  <div className="mt-3 -mx-2">
                    <PlateVisualizer weight={todayWorkout.primaryLift.weight} track={effectiveTrack} compact />
                  </div>
                  {activeModifiers.highFatigue && (
                    <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
                      CNS fatigue active — reduced to 60%, hypertrophy focus
                    </p>
                  )}
                </div>

                {/* Accessories — compact */}
                {todayWorkout.accessories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {todayWorkout.accessories.slice(0, 3).map((acc, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-white/[0.03] text-[11px] text-slate-400 font-medium">
                        {acc.exerciseId?.replace(/_/g, ' ')} · {acc.sets}×{acc.reps}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="armor-text-footnote text-center py-4">
                Set your 1RMs in Settings to calculate workout weights.
              </p>
            )}

            {activeModifiers.travelMode && (
              <p className="relative z-10 text-[11px] text-blue-400/80 font-medium bg-blue-500/8 rounded-lg px-3 py-2">
                ✈️ Travel mode — progression frozen, bodyweight substitutions active
              </p>
            )}
          </div>
          </div>
        )}

        {/* ── DAILY HABITS ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="armor-text-caption" style={{ letterSpacing: '0.08em' }}>
              Daily Habits
            </span>
            {allHabitsDone && habitsCompleted > 0 && (
              <span className="text-[11px] font-bold text-emerald-400">
                All complete · {habitsCompleted}/{dailyHabits.length}
              </span>
            )}
            {!allHabitsDone && (
              <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                {habitsCompleted}/{dailyHabits.length}
              </span>
            )}
          </div>
          {dailyHabits.map((habit, i) => (
            <div key={habit.id} className="armor-entrance" style={{ animationDelay: `${0.05 * i}s` }}>
              <HabitCheck
                habit={habit}
                done={dailyHabitState[habit.id] || false}
                onToggle={() => toggleHabit(habit.id)}
              />
            </div>
          ))}
        </div>

        {/* ── QUICK STATS ── */}
        <div className="grid grid-cols-3 gap-2">
          <QuickStat icon="📅" label="Week" value={`${currentCycle.week}/6`} />
          <QuickStat icon="⚡" label="Phase" value={weekConfig.phase} />
          <QuickStat icon="🏆" label="Top 1RM" value={`${top1RM}lbs`} />
        </div>
      </div>
    </div>
  );
}
