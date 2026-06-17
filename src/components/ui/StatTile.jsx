// ── Accent color maps ─────────────────────────────────────────────────────────
// Maps semantic accent names to the design-token color classes. The
// underlying tokens (--color-accent, --color-success, etc.) are the
// single source of truth — these classes just resolve them.
const accentClasses = {
  cyan:   'text-[var(--color-accent)]',
  emerald: 'text-[var(--color-success)]',
  amber:  'text-[var(--color-warning)]',
  rose:   'text-[var(--color-cardio)]',
  slate:  'text-[var(--text-secondary)]',
};
const accentBgClasses = {
  cyan:   'bg-[var(--color-accent-muted)]',
  emerald: 'bg-[var(--color-success-muted)]',
  amber:  'bg-[var(--color-warning-muted)]',
  rose:   'bg-[var(--color-cardio-muted)]',
  slate:  'bg-[var(--color-surface-1)]',
};

/**
 * StatTile — metric box with icon, value, and label.
 * @param {React.ReactNode} icon    - Already instantiated (e.g. <Flame size={20} />)
 * @param {string}          label   - Small caption below value
 * @param {React.ReactNode|string} value - Large bold metric
 * @param {'cyan'|'emerald'|'amber'|'rose'|'slate'} accent - Icon/text accent color
 */
const StatTile = ({
  icon,
  label,
  value,
  accent = 'cyan',
  className = '',
  ...rest
}) => {
  return (
    <div
      className={`armor-surface-1 rounded-2xl p-4 text-center ${className}`}
      {...rest}
    >
      {/* Icon — top center, accent-tinted background */}
      <div
        className={`mb-3 mx-auto w-10 h-10 rounded-xl flex items-center justify-center ${accentBgClasses[accent] ?? accentBgClasses.cyan} ${accentClasses[accent] ?? accentClasses.cyan}`}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Value — large bold */}
      <div className="text-2xl font-bold mb-1 text-[var(--text-primary)] tabular-nums">
        {value}
      </div>

      {/* Label — small caption */}
      <div className="armor-text-caption">
        {label}
      </div>
    </div>
  );
};

StatTile.displayName = 'StatTile';

export default StatTile;
