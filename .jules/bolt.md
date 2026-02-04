# Bolt's Performance Journal ⚡

## 2025-05-15 - Optimizing High-Frequency Timer Renders
**Learning:** In components with per-second timer updates, wrapping children in `React.memo` is ineffective if they receive props (like stats objects) that are recreated every second.
**Action:** Use lower-resolution dependencies for `useMemo` (e.g., elapsed minutes instead of seconds) when the UI only displays that resolution. This maintains referential stability for 60 seconds at a time, significantly reducing unnecessary re-renders of complex child components.
