import { useEffect, useMemo, memo, useCallback } from 'react';
import { Play, Flame, Check, Shield, Zap } from 'lucide-react';
import { useArmorData } from '../context/ArmorDataContext';
import {
  getTodaysWorkout, getDailyHabits, get10MinWorkout, MODIFIERS, MVD_PROTOCOL,
  VO2MAX_PROTOCOL, PERIODIZATION, getWeekConfig, EQUIPMENT_TRACKS,
  EXERCISE_TRACK,
} from '../data/armorEngine';
import PlateVisualizer from '../components/PlateVisualizer';
import WeekStrip from '../components/WeekStrip';
import { Card, SectionHeader, StatTile, Button } from '../components/ui';

/* ═══════════════════════════════════════════════════════════
   ARMOR DASHBOARD v3.0 — Apple HIG design system
   Zero borders. Token-driven colors. Elevation-based depth.
   ═══════════════════════════════════════════════════════════ */

// Jargon tooltip helper — wraps a term with an (i) icon
function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none"
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

const CycleProgress = memo(({ week, day, totalCyclesCompleted }) => {
  const weekConfig = getWeekConfig(week);
  const totalDays = 30;
  const done = (week - 1) * 5 + Math.min(day - 1, 4);
  const pct = Math.max(2, (done / totalDays) * 100);

  return (
    <Card padded={false} className="px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="armor-text-caption">Cycle {totalCyclesCompleted + 1} · Week {week}</span>
        <span className="text-[11px] font-bold text-[var(--color-accent)]">
          <JargonTooltip term={weekConfig.phase} definition={phaseDefinition(weekConfig.phase)} />
        </span>
      </div>
      <div className="armor-progress-track">
        <div className="armor-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between">
        {PERIODIZATION.map(w => (
          <span
            key={w.week}
            className={`text-[9px] font-bold tracking-wide transition-colors ${
              w.week === week ? 'text-[var(--color-accent)]' :
              w.week < week ? 'text-[var(--color-success)] opacity-60' :
              'text-[var(--text-disabled)]'
            }`}
          >
            {w.week}
          </span>
        ))}
      </div>
    </Card>
  );
});

CycleProgress.displayName = 'CycleProgress';

const MODIFIER_ENTRIES = Object.values(MODIFIERS);
const MODIFIER_LABEL_OVERRIDES = {
  mvdMode: 'MVD',
  travelMode: 'Travel',
};

const ModifierRow = memo(({ activeModifiers, onToggle }) => {
  return (
    <div>
      <SectionHeader icon={<Zap size={10} />} label="Protocols" />
      <div className="relative">
        {/* Right-edge fade so users know the row is horizontally scrollable
            when more modifiers are added than fit the viewport. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--elevation-0-bg)] to-transparent z-10"
        />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {MODIFIER_ENTRIES.map(mod => {
            const active = activeModifiers[mod.id];
            const label = MODIFIER_LABEL_OVERRIDES[mod.id] ?? mod.label;
            return (
              <button
                key={mod.id}
                onClick={() => onToggle(mod.id)}
                aria-label={`Toggle ${mod.label}`}
                aria-pressed={active}
                title={mod.description}
                className={`armor-press flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap text-[11px] font-semibold ${
                  active
                    ? 'bg-[var(--color-warning-muted)] text-[var(--color-warning)] ring-1 ring-[var(--color-warning-muted)]'
                    : 'bg-[var(--color-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{mod.icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        {/* Right-edge fade gradient signals scrollable content */}
        <div
          className="absolute inset-y-0 right-0 w-12 pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, var(--elevation-0-bg))' }}
        />
      </div>
    </div>
  );
});

ModifierRow.displayName = 'ModifierRow';

const HabitCheck = memo(({ habit, done, habitId, toggleHabit }) => {
  const handleToggle = useCallback(() => toggleHabit(habitId), [toggleHabit, habitId]);
  return (
    <button
      onClick={handleToggle}
      className={`armor-press w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        done
          ? 'bg-[var(--color-success-muted)]'
          : 'bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-hover)]'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
          done ? 'bg-[var(--color-success)]' : 'bg-[var(--color-surface-active)]'
        }`}
      >
        {done ? <Check size={11} className="text-white" strokeWidth={3} /> : null}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'text-[var(--color-success)]' : 'text-[var(--text-primary)]'}`}>
          {habit.label}
        </p>
        <p className="armor-text-footnote">
          {habit.duration}{habit.unit} · {habit.anchor}
        </p>
      </div>
      <span className="text-[11px] font-semibold text-[var(--text-secondary)] tabular-nums">
        {habit.duration}m
      </span>
    </button>
  );
});

HabitCheck.displayName = 'HabitCheck';

/* ── MAIN DASHBOARD ────────────────────────────────────────── */

export default function ArmorDashboard({ onStartWorkout, onNavigateToSettings }) {
  const {
    activeModifiers, dailyHabitState, currentCycle, userProfile,
    toggleModifier, toggleHabit, resetDailyHabits,
    estimated1RMs, equipmentTrack, effectiveTrack, todaysTrack, setTodaysTrack,
    todaysWorkoutCompleted, habitsNeedReset, streakData, isMVDToday, preferences,
    workoutHistory,
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
  const workoutAccent = todayWorkout.type === 'vo2max' ? 'cardio' : 'accent';

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const streak = streakData.currentStreak || 0;
  const unit = preferences.unit || 'lbs';

  // PERFORMANCE: Memoize derived statistics to avoid O(N) filtering on every render
  const { displayTop1RM, allTrack1RMsZero } = useMemo(() => {
    const trackExerciseIds = Object.keys(EXERCISE_TRACK).filter(id => EXERCISE_TRACK[id] === effectiveTrack);
    const track1RMs = trackExerciseIds.map(id => estimated1RMs[id] || 0);
    const top1RM = track1RMs.length > 0 ? Math.max(...track1RMs, 0) : 0;
    const allZero = track1RMs.length > 0 && track1RMs.every(v => v === 0);
    const display = top1RM === 0 ? '—' : (unit === 'kg' ? `${Math.round(top1RM / 2.20462)}${unit}` : `${top1RM}${unit}`);
    return { displayTop1RM: display, allTrack1RMsZero: allZero };
  }, [effectiveTrack, estimated1RMs, unit]);

  // PERFORMANCE: Memoize 10-minute express workout calculation
  const express10 = useMemo(() => get10MinWorkout(effectiveTrack), [effectiveTrack]);

  return (
    <div className="pb-32 space-y-5 max-w-lg mx-auto">
      {/* ── HEADER ── */}
      <div className="px-5 pt-8 pb-2">
        <p className="armor-text-caption mb-1">{greeting}{userProfile.displayName ? `, ${userProfile.displayName}` : ''}</p>
        <div className="flex items-center justify-between">
          <h1 className="armor-text-large-title">
            <span className="text-[var(--color-accent)]">Armor</span>
          </h1>
          <div className="flex items-center gap-2" aria-live="polite" aria-atomic="true">
            {streak > 0 && (
              <span className="armor-badge armor-badge-warning">
                <Flame size={11} fill="currentColor" />
                <span className="tabular-nums">{streak}</span>
              </span>
            )}
            {todayDone && (
              <span className="armor-badge armor-badge-success">Done</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* ── WEEK HISTORY (last 7 days) ── */}
        <WeekStrip
          completedDates={workoutHistory.filter(w => w.completed).map(w => w.date)}
          mvdDates={streakData.mvdDates || []}
        />

        {/* ── CYCLE PROGRESS ── */}
        <CycleProgress
          week={currentCycle.week}
          day={currentCycle.day}
          totalCyclesCompleted={currentCycle.totalCyclesCompleted}
        />

        {/* ── MODIFIERS ── */}
        <ModifierRow activeModifiers={activeModifiers} onToggle={toggleModifier} />

        {/* ── TODAY'S WORKOUT ── */}
        {isMVD ? (
          <div className="armor-surface-2 p-5 space-y-3 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl bg-[var(--color-warning-muted)]"
            />
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[var(--color-warning)]" />
              <h2 className="text-lg font-black text-[var(--color-warning)]">Minimum Viable Day</h2>
            </div>
            <p className="armor-text-footnote text-[var(--color-warning)] opacity-60">
              Your streak is protected. Complete these three things.
            </p>
            <div className="space-y-2">
              {[
                { icon: '💪', label: `${MVD_PROTOCOL.pushups.sets * MVD_PROTOCOL.pushups.reps} Push-Ups`, sub: '5×20 in a single circuit (~10 min)' },
                { icon: '🚶', label: `${MVD_PROTOCOL.walk.duration}-Minute Walk`, sub: 'Brisk pace, outdoors if possible' },
                { icon: '🧘', label: `${MVD_PROTOCOL.mobility.duration}-Minute Mobility`, sub: 'Hips, hamstrings, thoracic spine' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface-1)]">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</p>
                    <p className="armor-text-footnote">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            {!todayDone && (
              <Button
                variant="primary"
                size="md"
                icon={<Play size={14} className="fill-current" />}
                onClick={onStartWorkout}
                className="w-full bg-[var(--color-warning)]"
              >
                Start MVD
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Per-workout track switcher. Default is the user's primary track;
                tapping a track flips today's session only. */}
            <div className="armor-press flex items-center gap-1 p-1 rounded-xl bg-[var(--elevation-1-bg)]">
              {Object.values(EQUIPMENT_TRACKS).map(t => {
                const active = effectiveTrack === t.id;
                const isOverride = todaysTrack === t.id && todaysTrack !== equipmentTrack;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTodaysTrack(t.id === equipmentTrack ? null : t.id)}
                    className={`armor-press flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                        : 'bg-transparent text-[var(--text-tertiary)]'
                    }`}
                  >
                    <span aria-hidden="true">{t.icon}</span>
                    <span>{t.label}</span>
                    {isOverride && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />}
                  </button>
                );
              })}
            </div>

            <Card className="p-5 space-y-4 relative overflow-hidden">
              {/* Ambient glow based on workout type */}
              <div
                className={`absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-20 ${
                  workoutAccent === 'cardio' ? 'bg-[var(--color-cardio)]' : 'bg-[var(--color-accent)]'
                }`}
              />

              {/* Title row */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden="true">{todayWorkout.type === 'vo2max' ? '🫀' : '🏋️'}</span>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-primary)]">{todayWorkout.name}</h2>
                    <p
                      className="armor-text-caption"
                      style={{ letterSpacing: '0.08em', color: workoutAccent === 'cardio' ? 'var(--color-cardio)' : 'var(--color-accent)' }}
                    >
                      {todayWorkout.type === 'vo2max' ? 'VO₂ Max' : 'Strength'} · {weekConfig.phase}
                    </p>
                  </div>
                </div>
                {!todayDone && (
                  <Button
                    variant="primary"
                    size="md"
                    icon={<Play size={14} className="fill-current" />}
                    onClick={onStartWorkout}
                    style={workoutAccent === 'cardio' ? { background: 'var(--color-cardio)' } : undefined}
                  >
                    Start
                  </Button>
                )}
                {todayDone && (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Workout details */}
              {todayWorkout.type === 'vo2max' ? (
                <div className="relative z-10 bg-[var(--color-cardio-muted)] rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">🏃</span>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{VO2MAX_PROTOCOL.name}</p>
                    <p className="armor-text-footnote">
                      {VO2MAX_PROTOCOL.rounds}×{VO2MAX_PROTOCOL.workSeconds / 60}min work · {VO2MAX_PROTOCOL.restSeconds / 60}min rest · {VO2MAX_PROTOCOL.targetHR}
                    </p>
                  </div>
                </div>
              ) : todayWorkout.primaryLift ? (
                <div className="relative z-10 space-y-3">
                  {/* Primary lift card */}
                  <div className="bg-[var(--color-surface-1)] rounded-xl px-4 py-3">
                    <p className="armor-text-caption mb-2">Primary Lift</p>
                    <div className="flex items-end justify-between">
                      <span className="text-base font-bold text-[var(--text-primary)] capitalize">
                        {todayWorkout.primaryLift.exerciseId?.replace(/_/g, ' ')}
                      </span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-[var(--color-accent)] tabular-nums">
                          {Math.round(todayWorkout.primaryLift.weight / (unit === 'kg' ? 2.20462 : 1))}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)] ml-1">{unit}</span>
                        <p className="armor-text-footnote font-medium">
                          {todayWorkout.primaryLift.sets}×{todayWorkout.primaryLift.reps} @ {Math.round(todayWorkout.primaryLift.pct * 100)}%
                        </p>
                      </div>
                    </div>
                    {/* Inline plate visualizer so the user knows exactly what to load
                        before tapping Start. Weight must be in the selected unit. */}
                    <div className="mt-3 -mx-2">
                      <PlateVisualizer
                        weight={unit === 'kg' ? Math.round(todayWorkout.primaryLift.weight / 2.20462) : todayWorkout.primaryLift.weight}
                        track={effectiveTrack}
                        compact
                        unit={unit}
                      />
                    </div>
                    {activeModifiers.highFatigue && (
                      <p className="armor-text-footnote text-[var(--color-warning)] mt-2 font-medium">
                        CNS fatigue active — reduced to 60%, hypertrophy focus
                      </p>
                    )}
                  </div>

                  {/* Accessories — compact */}
                  {todayWorkout.accessories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {todayWorkout.accessories.slice(0, 3).map((acc, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-full bg-[var(--color-surface-1)] text-[11px] text-[var(--text-secondary)] font-medium"
                        >
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
                <p className="relative z-10 armor-text-footnote text-[var(--color-accent)] opacity-80 font-medium bg-[var(--color-accent-muted)] rounded-lg px-3 py-2">
                  ✈️ Travel mode — progression frozen, bodyweight substitutions active
                </p>
              )}
            </Card>

            {/* 10-Minute Express card */}
            <Card padded={false} className="bg-[var(--color-surface-1)] p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">⚡</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{express10.name}</p>
                  <p className="armor-text-footnote">No time? 2 sets + a quick circuit</p>
                </div>
                {!todayDone && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onStartWorkout}
                  >
                    Start express
                  </Button>
                )}
              </div>
            </Card>

            {/* 0-lbs nudge — shown when all active-track 1RMs are 0 */}
            {allTrack1RMsZero && (
              <Card padded={false} className="bg-[var(--color-warning-muted)] p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-warning)]">
                    👋 First time? Set your 1RMs to get personalized weights.
                  </p>
                  <p className="armor-text-footnote text-[var(--color-warning)] mt-0.5 opacity-80">
                    Takes 30 seconds. Skip if you'd rather enter as you go.
                  </p>
                </div>
                {onNavigateToSettings && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onNavigateToSettings}
                    className="bg-[var(--color-warning)] shrink-0"
                  >
                    Set 1RMs
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── DAILY HABITS ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionHeader icon={<Check size={10} />} label="Daily Habits" />
            <span className="text-[10px] text-[var(--text-disabled)] font-medium">1 freeze day/week</span>
          </div>
          {dailyHabits.map((habit, i) => (
            <div key={habit.id} className="armor-entrance" style={{ animationDelay: `${0.05 * i}s` }}>
              <HabitCheck
                habit={habit}
                done={dailyHabitState[habit.id] || false}
                habitId={habit.id}
                toggleHabit={toggleHabit}
              />
            </div>
          ))}
        </div>

        {/* ── QUICK STATS ── */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={<span aria-hidden="true">📅</span>} label="Week" value={`${currentCycle.week}/6`} accent="cyan" />
          <StatTile icon={<span aria-hidden="true">⚡</span>} label="Phase" value={weekConfig.phase} accent="emerald" />
          <StatTile
            icon={<span aria-hidden="true">🏆</span>}
            label={<><JargonTooltip term="1RM" definition="your one-rep max — the heaviest weight you can lift once" /></>}
            value={displayTop1RM}
            accent="amber"
            aria-label={`Top 1 rep max: ${displayTop1RM}`}
          />
        </div>
      </div>
    </div>
  );
}
