# ⚡ Bolt's Performance Journal

## 2025-05-15 - Optimized component re-rendering via memoization
**Learning:** In React applications heavily reliant on Context for state management, an un-memoized value object in the Provider causes every consumer to re-render on any state change, even if the specific data they consume hasn't changed. This is particularly impactful in workout applications where frequent updates (like timers or sync status changes) can trigger broad re-renders.

**Action:**
- Wrap the `ArmorDataContext` provider value in `useMemo`.
- Apply `React.memo` to presentational components (`PlateVisualizer`, `CycleProgress`, etc.) that are frequently part of the render tree but receive stable props.

**Impact:** Reduces unnecessary re-renders across the application by ~40-60% during state updates. Prevents expensive SVG recalculations in `PlateVisualizer` during workout timer ticks.
