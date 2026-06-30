/**
 * PersonalRecords — scans workoutHistory and surfaces the
 * heaviest weight ever lifted per exercise. Used in the
 * Progress tab to give users a "wall of fame" view of what
 * they've actually done (vs Estimated 1RMs which are self-reports).
 *
 * Renders nothing if there's no history.
 */
import { useMemo } from 'react';
import { Trophy, Calendar } from 'lucide-react';

export default function PersonalRecords({ workoutHistory = [], unit = 'lbs', limit = 6 }) {
  const records = useMemo(() => {
    const map = new Map(); // exerciseId → { weight, date, workoutId }
    workoutHistory.forEach(w => {
      const date = w.date;
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
          if (set.completed === false) return;
          if (!set.weight || set.weight <= 0) return;
          const prev = map.get(ex.id);
          if (!prev || set.weight > prev.weight) {
            map.set(ex.id, {
              weight: set.weight,
              reps: set.reps,
              date,
              exerciseId: ex.id,
            });
          }
        });
      });
    });

    // Sort heaviest first
    return [...map.values()].sort((a, b) => b.weight - a.weight);
  }, [workoutHistory]);

  if (records.length === 0) return null;

  const display = (w) => unit === 'kg' ? Math.round(w / 2.20462) : w;
  const topWeight = records[0]?.weight || 1;

  return (
    <div
      className="armor-surface-1 p-4"
      data-testid="personal-records"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-[var(--color-warning)]" aria-hidden="true" />
          <p
            className="armor-text-caption px-0"
            style={{ letterSpacing: '0.1em' }}
          >
            Personal Records
          </p>
        </div>
        <p className="armor-text-footnote text-[var(--text-tertiary)]">
          Heaviest set ever
        </p>
      </div>

      <div className="space-y-1.5">
        {records.slice(0, limit).map((r, i) => (
          <div
            key={r.exerciseId}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)]"
          >
            <span
              className="text-[10px] font-bold w-4 tabular-nums"
              style={{ color: i === 0 ? 'var(--color-warning)' : 'var(--text-tertiary)' }}
              aria-label={`Rank ${i + 1}`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] capitalize truncate">
                {r.exerciseId.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                <Calendar size={9} aria-hidden="true" />
                {new Date(r.date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
                {' · '}
                {r.reps} {r.reps === 1 ? 'rep' : 'reps'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-[var(--color-accent)] tabular-nums leading-tight">
                {display(r.weight)}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)]">{unit}</p>
            </div>
            <div className="w-16 h-1 bg-[var(--color-surface-1)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (r.weight / topWeight) * 100)}%`,
                  background: i === 0 ? 'var(--color-warning)' : 'var(--color-accent)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}