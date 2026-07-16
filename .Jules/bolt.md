## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2026-06-30 - [Dashboard Component Memoization]
**Learning:** The dashboard main components (`CycleProgress`, `ModifierRow`, `WeekStrip`) and the frequent habit pill items were re-rendering on every sync status update. Wrapping them in `React.memo` and stabilizing props with `useMemo` in the parent significantly reduces the re-render depth.
**Action:** Use `React.memo` for stable leaf components and `useMemo` for any object/array props passed to them to ensure referential stability and prevent wasted re-renders.
