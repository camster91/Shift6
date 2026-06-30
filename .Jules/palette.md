# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-06-08 - Accessible Interactive Cards
**Learning:** Custom interactive elements like Cards implemented with `div` require explicit `role="button"`, `tabIndex={0}`, and manual keyboard event handlers (Enter/Space) to be accessible to keyboard and screen reader users.
**Action:** Centralize accessibility logic in shared UI components so that enabling an `interactive` prop automatically handles ARIA roles, tabbing, and keyboard triggers.

## 2025-06-30 - Accessible Tooltips and Build Integrity
**Learning:** Jargon tooltips implemented as simple spans lack keyboard accessibility. Replacing them with a `<button type="button">` with `aria-label` provides a consistent, focusable interface for help text. Additionally, Vite/esbuild production builds fail if duplicate `className` attributes are present on a single JSX element, which can happen when merging styles from different sources without care.
**Action:** Always use `<button>` for interactive help triggers and audit JSX for duplicate props before build.
