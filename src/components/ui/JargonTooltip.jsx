/**
 * JargonTooltip — a small (i) button that provides terminology definitions.
 * Optimized for accessibility: uses <button> for keyboard focus and aria-label.
 *
 * @param {string} term       - The terminology string to display (e.g., "1RM")
 * @param {string} definition - The tooltip text/definition
 */
export default function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        title={definition}
        aria-label={`Definition for ${term}: ${definition}`}
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] outline-none"
      >
        i
      </button>
    </span>
  );
}
