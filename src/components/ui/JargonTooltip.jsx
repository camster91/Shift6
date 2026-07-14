import React from 'react';

/**
 * JargonTooltip — Accessible technical term helper.
 * Replaces the title attribute anti-pattern with a focusable button,
 * ARIA labels for screen readers, and clear focus states.
 *
 * @param {string} term - The technical term to display (e.g., "1RM")
 * @param {string} definition - The plain-english explanation
 */
const JargonTooltip = ({ term, definition }) => {
  return (
    <span className="inline-flex items-center gap-1 group">
      <span className="text-[inherit]">{term}</span>
      <button
        type="button"
        aria-label={`${term}: ${definition}`}
        title={definition}
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-[var(--text-tertiary)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none cursor-help select-none transition-colors"
        onClick={(e) => {
          // Prevent accidental form submissions or parent triggers
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        i
      </button>
    </span>
  );
};

JargonTooltip.displayName = 'JargonTooltip';

export default JargonTooltip;
