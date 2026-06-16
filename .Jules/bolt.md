## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2025-05-15 - [React.memo and Stable Context Handlers]
**Learning:** Using `React.memo` on list items like `HabitCheck` is only effective if the props passed are stable. Passing an inline arrow function (e.g., `onToggle={() => toggleHabit(id)}`) in a render loop breaks memoization on every parent re-render.
**Action:** Refactor sub-components to accept stable handlers from context and the item's ID as separate props. The sub-component should invoke the handler with its ID internally.
