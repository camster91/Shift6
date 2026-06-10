# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-05-15 - Prop Spreading for Reusable Components
**Learning:** Reusable UI components (Button, Card) must spread `...props` to their root elements to ensure they can receive and apply accessibility attributes (ARIA) from consumer components.
**Action:** Always implement prop spreading in base UI primitives.
