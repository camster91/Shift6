# Bolt's Performance Journal ⚡

## 2025-05-15 - Optimizing High-Frequency Timer Renders
**Learning:** In components with per-second timer updates, wrapping children in `React.memo` is ineffective if they receive props (like stats objects) that are recreated every second.
**Action:** Use lower-resolution dependencies for `useMemo` (e.g., elapsed minutes instead of seconds) when the UI only displays that resolution. This maintains referential stability for 60 seconds at a time, significantly reducing unnecessary re-renders of complex child components.

## 2025-02-04 - [Pattern] Memoizing derived state in View components
**Learning:** In this codebase, main view components (like `Progress.jsx` and `Dashboard.jsx`) often receive large state objects (`sessionHistory`, `completedDays`) and perform multiple expensive calculations (`calculateStats`, `calculateStreakWithGrace`) directly in the component body. These calculations are triggered on every render, even for local state changes like tab switching.
**Action:** Always check if these calculations are wrapped in `useMemo`. If not, it's a high-impact, low-risk optimization to add it, especially for components with multiple UI states or tabs.
