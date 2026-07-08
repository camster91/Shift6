# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-06-08 - Accessible Interactive Cards
**Learning:** Custom interactive elements like Cards implemented with `div` require explicit `role="button"`, `tabIndex={0}`, and manual keyboard event handlers (Enter/Space) to be accessible to keyboard and screen reader users.
**Action:** Centralize accessibility logic in shared UI components so that enabling an `interactive` prop automatically handles ARIA roles, tabbing, and keyboard triggers.

## 2025-06-10 - Preventing Build-Breaking Attribute Duplicates
**Learning:** Vite production builds (specifically the minifier/transformer) fail immediately if duplicate `className` attributes exist on a single JSX element. This is a silent killer in development that only surfaces at build time.
**Action:** Be vigilant for duplicate props during code reviews and UI updates; favor template literals or utility functions (like `clsx`) for conditional styling.
