## 2026-06-01 - [Optimized Log Filtering in useData]
**Learning:** In applications where a central data hook (like `useData`) manages a large array of logs and provides multiple helper functions for filtering that array by exercise ID, redundant O(N) filtering operations across multiple components can lead to noticeable lag as the history grows. Pre-grouping the data into a lookup object (O(1)) significantly improves performance.
**Action:** Use `useMemo` to create indexed lookups for large arrays in central hooks that are frequently accessed by various parts of the application.
