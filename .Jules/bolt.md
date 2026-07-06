## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2025-05-16 - [Avoiding unintended dependency noise]
**Learning:** Running `pnpm install` or `pnpm add` in some environments can trigger massive changes to `pnpm-lock.yaml` or unintended updates in `package.json`. These changes clutter PRs and can violate repository constraints.
**Action:** Always verify if `package.json` or `pnpm-lock.yaml` were modified and restore them if the changes were not explicitly requested or required for the optimization.
