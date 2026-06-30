/**
 * TravelModeBanner — full-width banner shown above today's workout when
 * travel mode is active. Tells the user that progression is frozen and
 * their workout has been swapped to bodyweight substitutions.
 *
 * Visibility rule: only renders when travelMode is true. Otherwise
 * returns null (parent can safely always include it).
 */
import { Plane } from 'lucide-react';

export default function TravelModeBanner({ todayExerciseId, frozenUntil }) {
  return (
    <div
      className="bg-[var(--color-accent-muted)] border border-[var(--color-accent)] border-opacity-20 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3"
      role="status"
      aria-live="polite"
      data-testid="travel-mode-banner"
    >
      <Plane size={20} className="text-[var(--color-accent)] shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Travel Mode Active
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
          Progression frozen. Today's lift has been swapped to a bodyweight equivalent.
          {todayExerciseId && (
            <>
              {' '}Current: <span className="font-semibold capitalize text-[var(--text-primary)]">{todayExerciseId.replace(/_/g, ' ')}</span>
              {' '}(3 sets · AMRAP).
            </>
          )}
        </p>
        {frozenUntil && (
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1 uppercase tracking-widest">
            Resume progression when you turn this off
          </p>
        )}
      </div>
    </div>
  );
}