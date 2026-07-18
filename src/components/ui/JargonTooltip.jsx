/**
 * JargonTooltip — focusable info button for screen readers and keyboard users,
 * replacing the title attribute on span anti-pattern.
 * @param {string} term
 * @param {string} definition
 */
export default function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        title={definition}
        aria-label={`${term}: ${definition}`}
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
      >
        i
      </button>
    </span>
  );
}

JargonTooltip.displayName = 'JargonTooltip';
