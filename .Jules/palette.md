# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-05-15 - ARIA Roles for Dynamic UI Elements
**Learning:** Dynamic UI elements like rest timers and SVG-based data visualizations require specific ARIA roles (`role="timer"`, `role="img"`) and live regions (`aria-live="polite"`) to be properly communicated to assistive technologies.
**Action:** Use `role="timer"` for countdowns and ensure SVGs have `role="img"` with descriptive `aria-label` attributes that reflect their current state.
