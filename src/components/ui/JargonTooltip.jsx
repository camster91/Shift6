/**
 * JargonTooltip — a centralized, accessible tooltip component that replaces
 * native title spans with a keyboard-focusable button.
 *
 * @param {string} term       - The phrase/jargon to define (e.g. "1RM", "CNS")
 * @param {string} definition - Accessible explanation shown on hover and read by screen readers
 */
export default function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        title={definition}
        aria-label={`${term}: ${definition}`}
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
      >
        i
      </button>
    </span>
  );
}

JargonTooltip.displayName = 'JargonTooltip';
