## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2026-07-03 - [Focused vs Broad Optimizations]
**Learning:** In this codebase, broad performance refactors that touch multiple UI components and the main dashboard simultaneously are considered over-optimized and "noisy." They also risk violating the "one small improvement" constraint.
**Action:** Prioritize a single, high-impact memoization of derived state in a core view (like the Dashboard) rather than applying `React.memo` to every sub-component and primitive. Focus on logic hotspots.
