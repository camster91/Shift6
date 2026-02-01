## 2025-05-22 - App-wide Re-renders during Workouts
**Learning:** The root `App.jsx` manages workout timers, causing it to re-render every second when a timer is active. This triggers re-renders for all child components (Header, BottomNav, etc.) unless they are memoized.
**Action:** Use `React.memo` for stable layout components and ensure handlers passed to them are memoized with `useCallback`.
