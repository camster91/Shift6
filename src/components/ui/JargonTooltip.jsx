import React from 'react';

/**
 * JargonTooltip — Accessible helper for fitness terminology.
 * Wraps a term and provides an (i) icon that reveals a definition on hover or focus.
 *
 * @param {string} term       - The fitness term (e.g. "1RM")
 * @param {string} definition - The explanation of the term
 */
export default function JargonTooltip({ term, definition }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {term}
      <button
        type="button"
        title={definition}
        aria-label={`Definition for ${term}: ${definition}`}
        className="armor-press inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold text-slate-400 bg-white/[0.06] cursor-help select-none focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        i
      </button>
    </span>
  );
}
