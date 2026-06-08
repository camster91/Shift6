## 2025-05-15 - Memoizing Context Provider Value
**Learning:** In a global context provider like `ArmorDataProvider`, the `value` object is recreated on every render if not memoized, causing all consumer components to re-render. This is especially impactful when the context holds many pieces of state and utility functions used throughout the app.
**Action:** Always wrap the context `value` object in `useMemo` and ensure all functions passed into it are wrapped in `useCallback` to maintain reference stability.
