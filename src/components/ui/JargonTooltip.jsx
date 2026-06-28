import React from 'react';

/**
 * JargonTooltip — accessible terminology helper.
 * Wraps a term with an (i) icon that reveals a definition on hover or focus.
 * Uses a <button> to ensure keyboard focusability and ARIA support.
 */
const JargonTooltip = ({ term, definition }) => {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-1)] cursor-help select-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] outline-none"
        title={definition}
        aria-label={`Definition of ${term}: ${definition}`}
      >
        i
      </button>
    </span>
  );
};

export default JargonTooltip;
