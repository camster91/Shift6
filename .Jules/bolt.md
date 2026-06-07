## 2026-06-07 - Optimizing Loop-Based Date Logic
**Learning:** Instantiating `new Date()` inside a loop (e.g., history-based streak calculations) creates significant O(N) overhead and GC pressure. Pre-converting strings to timestamps or ISO strings outside the loop is much more efficient.
**Action:** Always pre-calculate date primitives before entering loops that iterate over large history sets.
