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

## 2026-08-15 - Accessible Technical Definitions (Tooltips)
**Learning:** Using the `title` attribute for technical definitions is an accessibility anti-pattern as it's not focusable and often ignored by screen readers. A focusable `<button>` with a descriptive `aria-label` ensures all users can access technical jargon definitions.
**Action:** Replace `title` based definitions with a centralized `JargonTooltip` component that uses a focusable element and ARIA labels.
