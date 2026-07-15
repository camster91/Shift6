## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2025-06-10 - [Dashboard "Re-render Ripple" from Centralized Context]
**Learning:** In this architecture, the main dashboard consumes a large context (Shift6DataContext). Even with a memoized context value, transient state changes like `syncStatus` (idle -> syncing -> synced) trigger a re-render of the dashboard. Without `React.memo` and stabilized callback props in the App shell, the entire dashboard tree re-reconciles, including expensive O(N) history derivations and pure UI components like `WeekStrip`.
**Action:** When a component consumes a high-frequency or "fat" context, always pair `React.memo` with stabilized props from the parent and wrap O(N) derivations in `useMemo` to shield the UI from the context's re-render ripple.
