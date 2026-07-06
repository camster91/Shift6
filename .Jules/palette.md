# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-06-08 - Accessible Interactive Cards
**Learning:** Custom interactive elements like Cards implemented with `div` require explicit `role="button"`, `tabIndex={0}`, and manual keyboard event handlers (Enter/Space) to be accessible to keyboard and screen reader users.
**Action:** Centralize accessibility logic in shared UI components so that enabling an `interactive` prop automatically handles ARIA roles, tabbing, and keyboard triggers.

## 2025-06-15 - Unblocking Accessibility Props in Shared Components
**Learning:** Shared UI components that don't spread `...props` to their underlying elements silently break accessibility (e.g., `aria-label`) and custom styling, even if the parent looks correct.
**Action:** Always ensure shared primitive components (Buttons, Inputs, etc.) spread standard HTML attributes to the root element.

## 2025-06-15 - Duplicate Prop Regressions in Vite
**Learning:** Vite/React production builds are extremely sensitive to duplicate props (especially `className`) on JSX elements, which can cause immediate runtime or build failures that aren't always obvious in dev.
**Action:** Use linting or automated checks to catch duplicate JSX attributes; when refactoring styles, ensure the old `className` is fully replaced rather than appended.
