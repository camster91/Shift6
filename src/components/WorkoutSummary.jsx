/**
 * WorkoutSummary — modal that fires after a workout completes.
 *
 * Shows: what was accomplished, cycle progress, next workout
 * preview, and a "Done" button to dismiss. Uses confetti for
 * celebration. Falls back gracefully on first workout (no history).
 */
import { useMemo } from 'react';
import { Check, ChevronRight, Sparkles, Trophy } from 'lucide-react';
import { ConfettiBurst } from './Celebration';

function StatTile({ value, label, color = 'text-[var(--text-primary)]' }) {
  return (
    <div className="flex flex-col items-center flex-1 px-2">
      <span className={`text-2xl font-black tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1">
        {label}
      </span>
    </div>
  );
}

export default function WorkoutSummary({
  workout,
  onDismiss,
  nextWorkout,
  isFirstWorkout = false,
  isCycleComplete = false,
}) {
  // Compute summary stats. Hooks must run before any early return.
  const stats = useMemo(() => {
    const exercises = workout?.exercises || [];
    const totalSets = exercises.reduce((s, e) => s + (e.sets?.length || 0), 0);
    const totalReps = exercises.reduce(
      (s, e) => s + (e.sets || []).reduce((ss, set) => ss + (set.reps || 0), 0),
      0
    );
    const totalVolume = exercises.reduce(
      (s, e) => s + (e.sets || []).reduce(
        (ss, set) => ss + (set.reps || 0) * (set.weight || 0), 0
      ),
      0
    );
    return { totalSets, totalReps, totalVolume };
  }, [workout]);

  const isEmpty = stats.totalSets === 0;

  if (!workout) return null;

  return (
    <>
      {/* Skip the confetti burst for empty workouts — the user
          just bailed out, no celebration warranted. */}
      {!isEmpty && <ConfettiBurst count={60} />}
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}
        onClick={onDismiss}
        data-testid="workout-summary-modal"
      >
        <div
          className="armor-surface-3 p-6 max-w-sm w-full armor-spring-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-5">
            <div
              className="mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: isEmpty ? 'rgba(148,163,184,0.2)' : 'rgba(16,185,129,0.2)' }}
            >
              {isCycleComplete ? (
                <Trophy size={32} className="text-[var(--color-warning)]" strokeWidth={2.5} />
              ) : isEmpty ? (
                <span className="text-3xl">⏹</span>
              ) : (
                <Check size={32} className="text-[var(--color-success)]" strokeWidth={3} />
              )}
            </div>
            <h2 className="armor-text-large-title text-[var(--text-primary)]">
              {isCycleComplete
                ? '6-Week Cycle Complete'
                : isEmpty
                ? 'Workout Ended Early'
                : isFirstWorkout
                ? 'First Workout Logged'
                : 'Workout Complete'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {isCycleComplete
                ? 'Progression applied. Onward.'
                : isEmpty
                ? 'No sets logged. Nothing saved to history.'
                : isFirstWorkout
                ? 'You\'re 1 of 24 in the cycle. Off to a start.'
                : 'Saved to history. Rest up.'}
            </p>
          </div>

          {/* Stats row — hidden for empty workouts (nothing to show) */}
          {!isEmpty && (
            <div className="flex justify-between items-stretch bg-[var(--color-surface-1)] rounded-2xl p-4 mb-5">
              <StatTile value={stats.totalSets} label="Sets" />
              <div className="w-px bg-[var(--color-divider)]" />
              <StatTile value={stats.totalReps} label="Reps" />
              <div className="w-px bg-[var(--color-divider)]" />
              <StatTile
                value={stats.totalVolume.toLocaleString()}
                label="Volume lbs"
                color="text-[var(--color-accent)]"
              />
            </div>
          )}

          {/* Cycle progress — also hidden for empty workouts */}
          {!isEmpty && workout.week && workout.day && !isCycleComplete && (
            <div className="mb-5">
              <p className="armor-text-caption mb-2">Cycle progress</p>
              <p className="text-sm text-[var(--text-primary)]">
                Week {workout.week} · Day {workout.day} of 5
              </p>
            </div>
          )}

          {/* Next workout preview */}
          {nextWorkout && (
            <div className="bg-[var(--color-surface-1)] rounded-2xl p-4 mb-5">
              <p className="armor-text-caption mb-2">Up next</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-[var(--text-primary)] capitalize">
                    {nextWorkout.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {nextWorkout.type === 'vo2max'
                      ? 'VO₂ Max'
                      : nextWorkout.type === 'mvd'
                      ? 'MVD'
                      : `${nextWorkout.primary?.replace(/_/g, ' ') || '—'}`}
                  </p>
                </div>
                <ChevronRight size={20} className="text-[var(--text-tertiary)]" />
              </div>
            </div>
          )}

          {/* Done button */}
          <button
            onClick={onDismiss}
            className="armor-press w-full py-3.5 rounded-2xl text-[var(--text-primary)] font-bold flex items-center justify-center gap-2"
            style={{ background: 'var(--color-accent)' }}
          >
            <Sparkles size={16} /> {isCycleComplete ? 'Start New Cycle' : 'Done'}
          </button>
        </div>
      </div>
    </>
  );
}