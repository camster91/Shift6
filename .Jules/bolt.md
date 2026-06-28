## 2025-05-15 - [Memoizing the ArmorDataProvider context value]
**Learning:** The `ArmorDataProvider` passes a large object as its value to the `ArmorDataContext.Provider`. Without memoization, any state change (like `syncStatus` toggling from 'idle' to 'syncing') triggers a re-render of all context consumers, even if they don't depend on that specific state.
**Action:** Always wrap large context provider values in `useMemo` to ensure reference stability and prevent unnecessary application-wide re-renders during transient state updates.

## 2025-05-15 - [Build Failure on Duplicate className]
**Learning:** This project's Vite/esbuild configuration is strict about duplicate `className` attributes in JSX. While they might pass in development, they cause a hard failure during `npm run build`.
**Action:** Always run `npm run build` as part of the verification process for any UI changes, and grep for duplicate attributes if a build fails with obscure esbuild errors.

## 2025-05-15 - [Stabilizing JSX Props for React.memo]
**Learning:** Components wrapped in `React.memo` that accept JSX elements as props (e.g., `StatTile` taking an `icon`) will still re-render on every parent render because the JSX literal `<Icon />` creates a new object reference every time.
**Action:** Wrap JSX props in `useMemo` in the parent component to ensure reference stability and make `React.memo` effective for children taking icons or other complex props.
