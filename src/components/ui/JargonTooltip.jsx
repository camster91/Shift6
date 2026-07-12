/**
 * JargonTooltip — wraps a term with an (i) info icon that reveals a definition.
 * Improved for accessibility by using a focusable button and aria-label.
 *
 * @param {string} term       - The technical term to display
 * @param {string} definition - The explanatory text
 */
const JargonTooltip = ({ term, definition }) => {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none hover:text-[var(--text-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] outline-none"
        aria-label={`${term}: ${definition}`}
        title={definition}
      >
        i
      </button>
    </span>
  );
};

JargonTooltip.displayName = 'JargonTooltip';

export default JargonTooltip;
