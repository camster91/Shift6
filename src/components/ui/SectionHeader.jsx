/**
 * SectionHeader — icon + label + optional count + optional action.
 * Used above lists and section dividers.
 *
 * @param {React.ReactNode} icon    - Already instantiated icon (e.g. <TrendingUp size={12} />)
 * @param {string}          label   - armor-text-caption uppercase label
 * @param {number|string|undefined} count  - Optional inline count badge
 * @param {React.ReactNode|undefined} action - Optional right-aligned action
 */
const SectionHeader = ({
  icon,
  label,
  count,
  action,
}) => {
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      {/* Icon */}
      <span className="text-slate-600 flex items-center">
        {icon}
      </span>

      {/* Label */}
      <span
        className="armor-text-caption"
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
      </span>

      {/* Optional count badge */}
      {count !== undefined && (
        <span className="bg-white/[0.04] text-cyan-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
          {count}
        </span>
      )}

      {/* Optional action */}
      {action && (
        <span className="ml-auto">
          {action}
        </span>
      )}
    </div>
  );
};

SectionHeader.displayName = 'SectionHeader';

export default SectionHeader;