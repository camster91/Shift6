## 2025-05-14 - Memoization of Context and Dashboard Components
**Learning:** The `ArmorDataProvider` was recreating its `value` object on every render, causing all consuming components to re-render even when data hadn't changed. Memoizing this object with `useMemo` is a high-impact optimization in this centralized state architecture.
**Action:** Always verify if Context providers are memoizing their `value` objects, especially when they contain many state-derived properties and updater functions.
