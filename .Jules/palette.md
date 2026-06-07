# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-05-16 - Accessible Data Visualizations
**Learning:** Dynamic SVGs visualizing complex state (like workout plate loading) require descriptive `aria-label` strings that provide both a summary (total weight) and a detailed breakdown (plates per side) to be fully useful for screen reader users.
**Action:** Implement `role="img"` and structured `aria-label` generators for all data-driven visual components.
