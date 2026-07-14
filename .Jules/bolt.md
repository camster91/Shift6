## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2026-07-14 - [Memoizing Dashboard and Progress views]
**Learning:** The main dashboard and progress views contain multiple derived data points (e.g., filtering workout history) that are re-calculated on every render. When these views are passed unstable callback props from the parent (e.g., anonymous functions), React.memo becomes ineffective.
**Action:** Stabilize callback props with useCallback in the parent and memoize derived calculations with useMemo in the component to ensure referential stability and prevent unnecessary re-renders.
