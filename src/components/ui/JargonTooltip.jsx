/**
 * JargonTooltip — wraps a term with an (i) icon button that shows a definition.
 * Uses a focusable <button> instead of a <span> for better accessibility.
 *
 * @param {string} term       - The technical term (e.g. "1RM")
 * @param {string} definition - The plain-english explanation
 */
export default function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] outline-none"
        title={definition}
        aria-label={`Definition for ${term}: ${definition}`}
      >
        i
      </button>
    </span>
  );
}
