import { useEffect, useMemo } from 'react';
import { Play, Flame, Check, Shield, Zap } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import {
  getTodaysWorkout, getDailyHabits, get10MinWorkout, MODIFIERS, MVD_PROTOCOL,
  VO2MAX_PROTOCOL, PERIODIZATION, getWeekConfig, EQUIPMENT_TRACKS,
  EXERCISE_TRACK,
} from '../data/armorEngine';
import PlateVisualizer from '../components/PlateVisualizer';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import StatTile from '../components/ui/StatTile';

/* ═══════════════════════════════════════════════════════════
   ARMOR DASHBOARD v2.0 — Apple HIG design system
   Zero borders. Elevation-based depth. Typographic hierarchy.
   ═══════════════════════════════════════════════════════════ */

// Jargon tooltip helper — wraps a term with an (i) icon
function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-slate-400 bg-white/[0.06] cursor-help select-none"
        title={definition}
      >
        i
      </span>
    </span>
  );
}

const PHASE_DEFINITIONS = {
  'Base': 'foundation phase — moderate weight, higher reps, building work capacity',
  'Peak': 'peak phase — heavy weight, low reps, building absolute strength',
  'Deload': 'deload phase — light weight, active recovery, preparing for next cycle',
  'Intensify': 'intensify phase — challenging weight, moderate reps, building strength',
};

function phaseDefinition(phase) {
  return PHASE_DEFINITIONS[phase] || phase;
}

function CycleProgress({ week, day, totalCyclesCompleted }) {
  const weekConfig = getWeekConfig(week);
  const totalDays = 30;
  const done = (week - 1) * 5 + Math.min(day - 1, 4);
  const pct = Math.max(2, (done / totalDays) * 100);

  return (
    <Card padded={false} className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="armor-text-caption">Cycle {totalCyclesCompleted + 1} · Week {week}</span>
        <span className="text-[11px] font-bold text-cyan-400"><JargonTooltip term={weekConfig.phase} definition={phaseDefinition(weekConfig.phase)} /></span>
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
    </Card>
  );
}

function ModifierRow({ activeModifiers, onToggle }) {
  const entries = Object.values(MODIFIERS);
  // Short display labels to prevent truncation on390px viewports
  const labelOverride = {
    mvdMode: 'MVD',
    travelMode: 'Travel',
 };
  return (
    <div>
      <SectionHeader icon={<Zap size={10} />} label="Protocols" />
      <div className="relative">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {entries.map(mod => {
            const active = activeModifiers[mod.id];
            const label = labelOverride[mod.id] ?? mod.label;
            return (
              <button
                key={mod.id}
                onClick={() => onToggle(mod.id)}
                aria-label={`Toggle ${mod.label}`}
                aria-pressed={active}
                title={mod.description}
                className={`armor-press flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap ${
                  active
                    ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-300'
                }`}
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                <span>{mod.icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        {/* Right-edge fade gradient signals scrollable content */}
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-r from-transparent to-[#020617] pointer-events-none" />
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
      className={`armor-press w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none ${
        done
          ? 'bg-emerald-500/8'
          : 'bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
        done ? 'bg-emerald-500 scale-110' : 'bg-white/[0.06] scale-100'
      }`}>
        {done ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'text-emerald-400' : 'text-slate-300'}`}>
          {habit.label}
        </p>
        <p className="text-[11px] text-slate-400">
          {habit.duration}{habit.unit} · {habit.anchor}
        </p>
      </div>
      <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
        {habit.duration}m
      </span>
    </button>
  );
}

/* ── MAIN DASHBOARD ────────────────────────────────────────── */

export default function ArmorDashboard({ onStartWorkout }) {
  const {
    activeModifiers, dailyHabitState, currentCycle, userProfile,
    toggleModifier, toggleHabit, resetDailyHabits,
    estimated1RMs, equipmentTrack, effectiveTrack, todaysTrack, setTodaysTrack,
    todaysWorkoutCompleted, habitsNeedReset, streakData, isMVDToday, preferences,
  } = useArmorData();

  useEffect(() => {
    if (habitsNeedReset) resetDailyHabits();
  }, [habitsNeedReset, resetDailyHabits]);

  const weekConfig = getWeekConfig(currentCycle.week);
  const todayWorkout = useMemo(() =>
    getTodaysWorkout(effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs),
    [effectiveTrack, currentCycle.day, currentCycle.week, activeModifiers, estimated1RMs]);
  const dailyHabits = useMemo(() => getDailyHabits(activeModifiers), [activeModifiers]);
  const todayDone = todaysWorkoutCompleted || isMVDToday;
  const isMVD = activeModifiers.mvdMode;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const streak = streakData.currentStreak || 0;
  const unit = preferences.unit || 'lbs';

  // Filter 1RMs to the active track only
  const trackExerciseIds = Object.keys(EXERCISE_TRACK).filter(id => EXERCISE_TRACK[id] === effectiveTrack);
  const track1RMs = trackExerciseIds.map(id => estimated1RMs[id] || 0);
  const top1RM = track1RMs.length > 0 ? Math.max(...track1RMs, 0) : 0;
  const allTrack1RMsZero = track1RMs.length > 0 && track1RMs.every(v => v === 0);
  const displayTop1RM = top1RM === 0 ? '—' : (unit === 'kg' ? `${Math.round(top1RM / 2.20462)}${unit}` : `${top1RM}${unit}`);

  return (
    <div className="pb-32 space-y-5 max-w-lg mx-auto">
      {/* ── HEADER ── */}
      <div className="px-5 pt-8 pb-2">
        <p className="armor-text-caption mb-1">{greeting}{userProfile.displayName ? `, ${userProfile.displayName}` : ''}</p>
        <div className="flex items-center justify-between">
          <h1 className="armor-text-large-title">
            <span className="text-cyan-400">Armor</span>
          </h1>
          <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
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
                { icon: '💪', label: `${MVD_PROTOCOL.pushups.sets * MVD_PROTOCOL.pushups.reps} Push-Ups`, sub: '5×20 in a single circuit (~10 min)' },
                { icon: '🚶', label: `${MVD_PROTOCOL.walk.duration}-Minute Walk`, sub: 'Brisk pace, outdoors if possible' },
                { icon: '🧘', label: `${MVD_PROTOCOL.mobility.duration}-Minute Mobility`, sub: 'Hips, hamstrings, thoracic spine' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03]">
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {!todayDone && (
              <button
                onClick={onStartWorkout}
                className="armor-press flex items-center justify-center gap-1.5 w-full py-3 rounded-full text-sm font-bold text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                <Play size={14} className="fill-current" />
                Start MVD
              </button>
            )}
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
            <Card className="p-5 space-y-4 relative overflow-hidden">
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
                  <p className="text-[11px] text-slate-400">
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
                        {Math.round(todayWorkout.primaryLift.weight / (unit === 'kg' ? 2.20462 : 1))}
                      </span>
                      <span className="text-sm text-slate-400 ml-1">{unit}</span>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {todayWorkout.primaryLift.sets}×{todayWorkout.primaryLift.reps} @ {Math.round(todayWorkout.primaryLift.pct * 100)}%
                      </p>
                    </div>
                  </div>
                  {/* Inline plate visualizer so the user knows exactly what to load
                      before tapping Start. */}
                  {unit !== 'kg' && (
                    <div className="mt-3 -mx-2">
                      <PlateVisualizer weight={todayWorkout.primaryLift.weight} track={effectiveTrack} compact />
                    </div>
                  )}
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
          </Card>

            {/* 10-Minute Express card */}
            {(() => {
              const express10 = get10MinWorkout(effectiveTrack);
              return (
                <Card padded={false} className="bg-white/[0.03] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '24px' }}>⚡</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{express10.name}</p>
                      <p className="text-[11px] text-slate-400">No time? 2 sets + a quick circuit</p>
                    </div>
                    {!todayDone && (
                      <button
                        onClick={onStartWorkout}
                        className="armor-press px-4 py-2 rounded-full text-xs font-bold text-white"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        Start express
                      </button>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* 0-lbs nudge — shown when all active-track 1RMs are 0 */}
            {allTrack1RMsZero && (
              <Card padded={false} className="bg-amber-500/8 border border-amber-500/20 p-4">
                <p className="text-sm font-semibold text-amber-400">
                  👋 First time? Set your 1RMs in Settings to get personalized weights. Takes 30 seconds.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* ── DAILY HABITS ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionHeader icon={<Check size={10} />} label="Daily Habits" />
            <span className="text-[10px] text-slate-500 font-medium">1 freeze day/week</span>
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
          <StatTile icon={<span style={{ fontSize: '18px' }}>📅</span>} label="Week" value={`${currentCycle.week}/6`} accent="cyan" />
          <StatTile icon={<span style={{ fontSize: '18px' }}>⚡</span>} label="Phase" value={weekConfig.phase} accent="emerald" />
          <StatTile icon={<span style={{ fontSize: '18px' }}>🏆</span>} label={<><JargonTooltip term="1RM" definition="your one-rep max — the heaviest weight you can lift once" /></>} value={displayTop1RM} accent="amber" aria-label={`Top 1 rep max: ${displayTop1RM}`} />
        </div>
      </div>
    </div>
  );
}
