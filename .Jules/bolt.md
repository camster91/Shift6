## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2025-05-20 - [Optimizing List Memoization with Stable Handlers]
**Learning:** Wrapping list items in `React.memo` is only effective if their props are stable. Creating inline arrow functions in the parent render (e.g., `onToggle={() => toggleHabit(habit.id)}`) defeats memoization because a new function reference is created on every parent render.
**Action:** Pass the stable handler (e.g., `toggleHabit` from context) directly to the child component, and have the child invoke it with the relevant ID. This ensures prop stability and allows `React.memo` to skip redundant re-renders.
