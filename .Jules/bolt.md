## 2026-06-09 - [Optimized Context & Dashboard]
**Learning:** In a context-heavy application, failing to memoize the Provider's value object causes the entire application tree to re-render whenever any state (even transient sync status) changes.
**Action:** Always memoize the context value and ensure sub-components use `React.memo` to prevent ripple-effect re-renders from the root.
