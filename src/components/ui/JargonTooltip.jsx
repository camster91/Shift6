/**
 * JargonTooltip — Accessible technical definition trigger.
 * Replaces the inaccessible 'title' attribute anti-pattern with a
 * focusable button that provides the definition via aria-label.
 *
 * @param {string} term        - The technical term (e.g. "1RM", "MVD")
 * @param {string} definition  - The plain-English explanation
 */
const JargonTooltip = ({ term, definition }) => {
  return (
    <button
      type="button"
      className="armor-press inline-flex items-center gap-0.5 group focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 rounded-sm px-0.5 -mx-0.5"
      aria-label={`${term}: ${definition}`}
      title={definition}
    >
      <span className="text-current">{term}</span>
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] group-hover:bg-[var(--color-surface-active)] transition-colors select-none"
        aria-hidden="true"
      >
        i
      </span>
    </button>
  );
};

JargonTooltip.displayName = 'JargonTooltip';

export default JargonTooltip;
