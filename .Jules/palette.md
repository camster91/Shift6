# Palette's Journal - Critical UX/Accessibility Learnings

This journal tracks critical UX and accessibility insights discovered during development.

## 2025-05-15 - Improving Interactive Element Accessibility
**Learning:** Icon-only buttons and tab navigation require explicit ARIA attributes and focus indicators to be accessible to screen readers and keyboard users.
**Action:** Always add `aria-label`, `role="tablist"`, and `role="tab"` where appropriate, and ensure `focus-visible` styles are implemented.

## 2025-06-08 - Accessible Interactive Cards
**Learning:** Custom interactive elements like Cards implemented with `div` require explicit `role="button"`, `tabIndex={0}`, and manual keyboard event handlers (Enter/Space) to be accessible to keyboard and screen reader users.
**Action:** Centralize accessibility logic in shared UI components so that enabling an `interactive` prop automatically handles ARIA roles, tabbing, and keyboard triggers.

## 2026-07-10 - Improving Form Clarity and Accessibility
**Learning:** Associating labels with inputs and providing context-aware feedback (e.g., dynamic button text for "Sign In" vs. "Create Account") significantly improves accessibility for screen readers and clarity for all users.
**Action:** Always verify proper label-input associations and use dynamic loading states that accurately reflect the user's current operation.

## 2026-07-14 - Accessible Technical Definitions (Jargon Tooltips)
**Learning:** Using the `title` attribute for technical jargon is an anti-pattern that excludes keyboard and screen reader users. Replacing it with a focusable button and `aria-label` ensures all users can access critical definitions.
**Action:** Use the centralized `JargonTooltip` component for all technical terms (1RM, CNS, etc.) and avoid the native `title` attribute for primary information delivery.
