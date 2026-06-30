import React from 'react';

/**
 * JargonTooltip — Accessible tooltip for terminology.
 * Uses a button for keyboard accessibility and ARIA for screen readers.
 * @param {string} term       - The word to be defined
 * @param {string} definition - The help text shown on hover/focus
 */
const JargonTooltip = ({ term, definition }) => {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        title={definition}
        aria-label={`About ${term}: ${definition}`}
      >
        i
      </button>
    </span>
  );
};

JargonTooltip.displayName = 'JargonTooltip';

export default JargonTooltip;
