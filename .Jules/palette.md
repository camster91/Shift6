# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-05-16 - Accessible Data Visualizations
**Learning:** Dynamic SVGs that visualize data (like a barbell plate loader) are invisible to screen readers without explicit `role="img"` and a descriptive `aria-label` that reflects the current state (e.g., the total weight).
**Action:** Ensure all data-driven SVG components include `role="img"` and an `aria-label` that updates based on the current props/state.
