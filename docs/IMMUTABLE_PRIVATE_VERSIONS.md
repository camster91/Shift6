# Saved private version immutability (#348)

Issue: https://github.com/camster91/Shift6/issues/348

Source defect was reproduced using real SQLite at the pre-fix `91eea026` stack:
after saving a version and a cycle referencing it, a changed same-ID version write
resolved instead of rejecting. Native reproduction of this particular sequence
remains pending; this is not a human/native QA claim.

Saved version IDs now represent immutable JSON snapshots, including status, version
number and creation time. A changed same-ID write throws before changing program
metadata or outbox data. The SQL insert never updates an existing version row.
Cross-owner and cross-program ID protections remain. Semantically identical JSON
retries ignore object key order and produce no new writes; an older-version retry
cannot move a newer current-version pointer backwards. Metadata changes cannot
silently succeed as a retry. New versions/copies still use the canonical transactions.

After Save, the builder offers Continue editing as a new private copy. This is an
explicit action; neither Save failure nor recovery silently forks or starts a plan.
The copy keeps workouts, targets and added custom movements and remaps unapplied
import text to the copied workout IDs. A blocked same-ID Save/Start retains recovery
and explains the copy requirement. Public content gates and owner/context guards
still apply. Existing cycles keep their original version JSON.

Regressions use real SQLite to preserve cycle-referenced snapshots, program metadata
and outbox rows; reject target/status/version/time/metadata mutations; preserve owner
adoption and collisions; and prove idempotent/no-rewind retries. Component checks cover
editing after Save, explicit copying and original pasted-text retention. Existing
active-workout and Coach revision paths are checked because they mint new version IDs.
Native Android/iOS and participant acceptance remain required before issue closure.
