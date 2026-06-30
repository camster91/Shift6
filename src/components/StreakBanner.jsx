/**
 * StreakBanner — surfaces streak state to the user on the dashboard.
 *
 * Two visual states:
 *  - 'at_risk' (warning color): streak is alive but at risk if they
 *    don't act today. Shows the current streak number and asks
 *    them to log.
 *  - 'broken' (muted): streak ended. Acknowledges what they had and
 *    tells them to keep logging.
 *
 * Renders nothing when the user is in a normal state.
 */
import { Flame, AlertCircle } from 'lucide-react';

export default function StreakBanner({ status }) {
  if (!status || !status.banner) return null;
  const { banner } = status;
  const isAtRisk = banner.kind === 'at_risk';

  return (
    <div
      className={`rounded-2xl px-4 py-3 mb-4 flex items-start gap-3 ${
        isAtRisk
          ? 'bg-[var(--color-warning-muted)] border border-[var(--color-warning)] border-opacity-20'
          : 'bg-[var(--color-surface-1)] border border-[var(--color-divider)]'
      }`}
      role="status"
      aria-live="polite"
      data-testid="streak-banner"
    >
      {isAtRisk ? (
        <Flame size={20} className="text-[var(--color-warning)] shrink-0 mt-0.5" aria-hidden="true" />
      ) : (
        <AlertCircle size={20} className="text-[var(--text-tertiary)] shrink-0 mt-0.5" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${
          isAtRisk ? 'text-[var(--color-warning)]' : 'text-[var(--text-primary)]'
        }`}>
          {banner.title}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
          {banner.body}
        </p>
      </div>
    </div>
  );
}
