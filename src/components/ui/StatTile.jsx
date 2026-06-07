// ── Accent color maps ─────────────────────────────────────────────────────────
const accentClasses = {
  cyan:   'text-cyan-400',
  emerald: 'text-emerald-400',
  amber:  'text-amber-400',
  rose:   'text-rose-400',
  slate:  'text-slate-400',
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
    <div className={`armor-surface-1 rounded-2xl p-4 text-center ${className}`} {...rest}>
      {/* Icon — top center, accent colored */}
      <div className={`mb-2 flex justify-center ${accentClasses[accent] ?? accentClasses.cyan}`}>
        {icon}
      </div>

      {/* Value — large bold */}
      <div className="text-2xl font-bold text-white mb-1">
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