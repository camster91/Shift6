/**
 * JargonTooltip — wraps a technical term with an accessible (i) info button.
 * Replaces the anti-pattern of using `title` on a span, providing a
 * focusable element with a clear ARIA label for screen readers.
 *
 * @param {string} term       - The term to display
 * @param {string} definition - The tooltip content/explanation
 */
const JargonTooltip = ({ term, definition }) => {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none hover:text-[var(--text-primary)] transition-colors"
        aria-label={`Information about ${term}: ${definition}`}
        title={definition}
      >
        i
      </button>
    </span>
  );
};

JargonTooltip.displayName = 'JargonTooltip';

export default JargonTooltip;
