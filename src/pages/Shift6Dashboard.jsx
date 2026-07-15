import { useEffect, useMemo, memo } from 'react';
import { Play, Flame, Check, Shield, Zap } from 'lucide-react';
import { useShift6Data } from '../context/Shift6DataContext';
import {
  getTodaysWorkout, getDailyHabits, MODIFIERS, MVD_PROTOCOL,
  VO2MAX_PROTOCOL, PERIODIZATION, getWeekConfig, EQUIPMENT_TRACKS,
  EXERCISE_TRACK, streakStatus,
} from '../data/shift6Engine';
import PlateVisualizer from '../components/PlateVisualizer';
import ExerciseIllustration from '../components/ExerciseIllustration';
import WeekStrip from '../components/WeekStrip';
import TravelModeBanner from '../components/TravelModeBanner';
import StreakBanner from '../components/StreakBanner';
import { Card, SectionHeader, StatTile, Button } from '../components/ui';

/* ═══════════════════════════════════════════════════════════
   SHIFT6 DASHBOARD v3.0 — Apple HIG design system
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

function CycleProgress({ week, day, totalCyclesCompleted }) {
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
}

const ModifierRow = memo(function ModifierRow({ activeModifiers, onToggle }) {
  // Only surface the modifier the user is most likely to toggle during
  // a workout session (travel). The other modifiers (mvd, highFatigue,
  // heavyMeal) are still in the data model and toggled via Settings,
  // the post-workout summary, or programmatic flows like the adaptive
  // deload recommendation. The roster lives in MODIFIERS so adding a
  // new toggleable one requires only editing this filter.
  const visibleModIds = ['travelMode'];
  const entries = Object.values(MODIFIERS).filter(m => visibleModIds.includes(m.id));
  // Short display labels to prevent truncation on 390px viewports
  const labelOverride = {
    mvdMode: 'MVD',
    travelMode: 'Travel',
  };
  return (
    <div>
      <div className="flex gap-1.5">
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
    </div>
  );
});

function HabitCheck({ habit, done, onToggle }) {
  return (
    <button
      onClick={onToggle}
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
}

/* ── MAIN DASHBOARD ────────────────────────────────────────── */

const Shift6Dashboard = memo(function Shift6Dashboard({ onStartWorkout, onNavigateToSettings }) {
  const {
    activeModifiers, dailyHabitState, currentCycle, userProfile,
    toggleModifier, toggleHabit, resetDailyHabits,
    estimated1RMs, equipmentTrack, effectiveTrack, todaysTrack, setTodaysTrack,
    todaysWorkoutCompleted, habitsNeedReset, streakData, isMVDToday, preferences,
    workoutHistory,
  } = useShift6Data();

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

  // PERFORMANCE: Memoize expensive derivations to prevent redundant work on every re-render.

  // O(N) history filter. Prevents re-mapping the entire history array on every render.
  const completedDates = useMemo(() =>
    workoutHistory.filter(w => w.completed).map(w => w.date),
    [workoutHistory]
  );

  // O(E) filter/map where E is the total exercise count.
  const { top1RM, allTrack1RMsZero } = useMemo(() => {
    const ids = Object.keys(EXERCISE_TRACK).filter(id => EXERCISE_TRACK[id] === effectiveTrack);
    const rms = ids.map(id => estimated1RMs[id] || 0);
    return {
      top1RM: rms.length > 0 ? Math.max(...rms, 0) : 0,
      allTrack1RMsZero: rms.length > 0 && rms.every(v => v === 0)
    };
  }, [effectiveTrack, estimated1RMs]);

  const displayTop1RM = top1RM === 0 ? '—' : (unit === 'kg' ? `${Math.round(top1RM / 2.20462)}${unit}` : `${top1RM}${unit}`);

  return (
    <div className="pb-32 space-y-5 max-w-lg mx-auto">
      {/* ── HEADER ── */}
      <div className="px-5 pt-8 pb-2">
        <p className="armor-text-caption mb-1">{greeting}{userProfile.displayName ? `, ${userProfile.displayName}` : ''}</p>
        <div className="flex items-center justify-between">
          {/* Brand wordmark intentionally omitted — the brand is in the URL,
              PWA name, page <title>, and bottom tab bar. A large display
              header eats ~80px of vertical space that the workout card needs. */}
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
        <div className="flex items-center justify-between">
          <h2 className="armor-text-caption">This week</h2>
          <p className="armor-text-caption">
            <span className="text-[var(--text-primary)] font-bold">Week {currentCycle.week}</span> of 6 · Cycle {currentCycle.totalCyclesCompleted + 1}
          </p>
        </div>
        <WeekStrip
          completedDates={completedDates}
          mvdDates={streakData.mvdDates || []}
        />

        {/* ── STREAK STATUS BANNER ── */}
        {/* Shows a warning if the user's streak is at risk today, or
            a muted acknowledgement if a streak was just broken. Hidden
            when streak is healthy. Calculated from lastActiveDate +
            currentStreak. */}
        {(() => {
          const status = streakStatus(streakData);
          return <StreakBanner status={status} />;
        })()}

        {/* ── MODIFIERS ── */}
        <ModifierRow activeModifiers={activeModifiers} onToggle={toggleModifier} />

        {/* ── TRAVEL MODE BANNER ── */}
        {/* Prominent indicator above the workout card so users always
            know when they've enabled travel mode and why the workout
            is different from usual. The compact in-card text is a
            secondary reminder. */}
        {activeModifiers.travelMode && todayWorkout?.primaryLift && (
          <TravelModeBanner
            todayExerciseId={todayWorkout.primaryLift.exerciseId}
          />
        )}

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
                        {todayWorkout.primaryLift.weight > 0 ? (
                          <>
                            <span className="text-2xl font-black text-[var(--color-accent)] tabular-nums">
                              {Math.round(todayWorkout.primaryLift.weight / (unit === 'kg' ? 2.20462 : 1))}
                            </span>
                            <span className="text-sm text-[var(--text-secondary)] ml-1">{unit}</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-[var(--text-secondary)]">Bodyweight</span>
                        )}
                        <p className="armor-text-footnote font-medium">
                          {todayWorkout.primaryLift.sets}×{todayWorkout.primaryLift.reps}
                          {Number.isFinite(todayWorkout.primaryLift.pct)
                            ? ` @ ${Math.round(todayWorkout.primaryLift.pct * 100)}%`
                            : ''}
                        </p>
                      </div>
                    </div>
                    {/* Exercise illustration — what the lift looks like.
                        Falls back to null (no extra space) if no image. */}
                    <ExerciseIllustration
                      exerciseId={todayWorkout.primaryLift.exerciseId}
                      compact
                      className="w-full mt-3"
                    />
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

                  {/* Accessories — plain text line, not chips.
                       A user only needs to know what's coming after the
                       primary lift; per-exercise chips waste vertical space. */}
                  {todayWorkout.accessories.length > 0 && (
                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                      Also: {todayWorkout.accessories.slice(0, 3).map(acc =>
                        `${acc.exerciseId?.replace(/_/g, ' ')} · ${acc.sets}×${acc.reps}`
                      ).join(' · ')}
                    </p>
                  )}
                </div>
                // The orange "First time?" callout below already covers
                // this exact case — without this guard, empty-state
                // users saw the same 1RM-setup prompt twice in close
                // vertical proximity.
              ) : null}

              {/* Travel-mode substitution notice used to live here as
                  small italic text. Now hoisted to <TravelModeBanner />
                  above the card for visibility — see line 246. */}
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
        {/* Compact 2-row list instead of 4 stacked cards — keeps the habits
            present (they count toward the streak) but stops them from
            dominating the screen. */}
        <div className="space-y-1.5">
          <SectionHeader icon={<Check size={10} />} label="Daily Habits" />
          <div className="flex flex-wrap gap-1.5">
            {dailyHabits.map(habit => {
              const done = dailyHabitState[habit.id] || false;
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`armor-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                    done
                      ? 'bg-[var(--color-success)] text-[var(--elevation-0-bg)]'
                      : 'bg-[var(--color-surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  aria-pressed={done}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : <span aria-hidden="true">{habit.icon}</span>}
                  <span>{habit.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default Shift6Dashboard;
