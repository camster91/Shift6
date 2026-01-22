## 2024-07-25 - Root Component State Causing Child Re-renders

**Learning:** State updates in the root `App.jsx` component, particularly the `timeLeft` state for the rest timer, were causing the entire `Dashboard.jsx` component to re-render every second during a rest period. This is inefficient as the dashboard does not depend on the timer.

**Action:** Wrap the `Dashboard` component in `React.memo` and memoize the props passed to it using `useCallback` to prevent these unnecessary re-renders. This will ensure the dashboard only re-renders when its own data changes.