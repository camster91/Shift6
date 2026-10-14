# Owned saved-cycle navigation

Home and the cycle dashboard link to `/cycles`, an owner-scoped saved-cycle
list. It loads 20 records per page using `(started_at,id)` descending keyset
pagination, with a hard maximum of 100 per query. Pages retain older paused
cycles and saved reflection links. Opening a record does not activate it.

`/cycle?cycleId=...` loads that exact owned cycle. Missing, invalid and foreign
identifiers cannot fall back to another cycle. Omitting the parameter preserves
the current dashboard selection of active cycle, then latest saved cycle.
Owner, focus and selected-route checks invalidate stale confirmations.

If an older paused cycle is inspected while another cycle is active, Resume is
disabled. A link opens the exact active cycle, where Pause still requires its
own confirmation. Returning to the older record and confirming Resume is a
separate action. No browsing action silently switches training state.

`/cycle-reflection?cycleId=...` is an exact owned, read-only history view for
saved rating, focus, chosen next action and note. It does not route historical
records into the latest-cycle review screen's next-cycle write actions. The
unparameterized current dashboard preserves its existing review workflow.

This iteration does not compare ambiguous historical load units or implement
repeat-week occurrences. Tests exercise real SQLite pages with equal timestamps,
multiple owners, older paused records, exact reflection selection and invalid
route rejection; component tests exercise stale route confirmations and the
other-active-cycle link. Native history/navigation QA remains pending.
