## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2026-06-13 - [Optimizing Dashboard re-renders and derived calculations]
**Learning:** High-frequency components in the dashboard like HabitCheck and ModifierRow were re-rendering on every context change. Simply adding React.memo isn't enough if the parent passes inline arrow functions as props, which breaks memoization. Memoizing derived stats like 1RM filtering reduces O(N) overhead during state updates.
**Action:** When using React.memo for list items, pass stable handlers from context and the item ID as props so the component can invoke the handler with its ID internally. Always memoize derived data calculations with useMemo in components that consume large contexts.
