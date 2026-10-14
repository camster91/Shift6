# Inactive week-run storage seam

Prepared 2026-10-14 on CAM-DESKTOP Windows. Source branch preserves inactive domain commits `26a6c888`/`5786c481` and merged accepted root `501be370` without conflicts. This is preparation, not a shipped repeat feature. No migrations, export/restore/deletion, readers, UI, native app, network or GitHub state were changed.

## What the repository prototype does

`src/db/weekRunRepository.ts` reports an unconditional unavailable production capability. `prepareLocalWeekRepeat` and `confirmLocalWeekRepeat` reject before accessing SQLite. Installing hypothetical tables cannot make this capability available. No production adapter or runtime action exists.

A future transaction-store interface loads the owned source context, canonical owner history and an operation receipt. The preview seam reads only. The confirm seam freezes caller data, requires current-owner/context callbacks, reads exact operation receipts first and verifies their owned row bindings. A new operation rechecks the frozen cycle/version/week/history/cursor/predecessors and explicit date/timezone through the pure domain contract, inserts only the receipt and root event, then reads back and corroborates both exact payload and history. Exact retry tolerates stale source/focus/date while still checking owner, source ownership/version binding and canonical historical evidence. Changed payload under a used operation rejects.

The caller must provide one genuine exclusive transaction; the seam itself cannot prove that an arbitrary injected object is transactional. Production entry points remain unavailable until an actual Expo SQLite exclusive adapter and all reader/recovery changes are implemented. Current-context callbacks must bind owner, database, focus, selected source and timezone. No set, cycle, goal, baseline, phase, dose, provider packet or sync writer is invoked.

## Isolated SQLite evidence and limits

Tests use actual Node SQLite in-memory databases with foreign keys enabled and `BEGIN IMMEDIATE`/commit/rollback. Their explicitly named `qa_sources`, `qa_receipts` and `qa_events` are disposable test fixtures, not proposed application tables or migrations. Canonical source JSON represents owned context and actuals only for testing this seam; it does not validate the future production reader's SQL joins.

Checks cover unavailable capability without database access, read-only preview/cancel boundary, source-row equality after confirmation, exact retry, changed payload, fresh-context refusal, foreign/missing source, invalid confirmation day, mandatory ownership during queued writes, missing/altered saved receipt/root, caller mutation and exact readback payload. Failures after receipt insertion, after root insertion, during receipt readback and during history readback roll back all new records. The source cycle/actuals/cursor remain byte-equivalent in these tests. This is not migration, export/restore, native or participant acceptance.

## Required production storage graph

Allocate the next migration/export versions only after checking the current integration head; inspected root ends at migration 28/export schema 17. No number is reserved here.

- Immutable owned repeat receipt: operation ID and unique run ID, source cycle/version/week, predecessor run ID, explicit confirmed timestamp, exact canonical request bytes including private prescription, original history cutoff/witness IDs, lifecycle/schedule predecessor and frozen prior cursor. Composite ownership/version bindings must join real training cycle/private program-version records. Predecessors require owned same-cycle/version/week bindings; prevent roots/branches/cycles and overlapping active intervals.
- Append-only run events: unique event/operation identity, owned run FK, predecessor FK, kind/start/pause/resume/complete/abandon and canonical timestamp. One root must bind the confirmation exactly. Enforce terminal immutability, chronology and owner-compatible migration/remapping. A paused run reserves the cursor. Persisting a new event must be idempotent and exclusive.
- Unique session-to-run bindings: session FK plus owned cycle/version/week/run cross-checks. Insert the binding in the same transaction as a new repeated session. Every repeated session has exactly one binding; unbound legacy sessions remain original via deterministic identity. No timestamp-based reassignment. Original saved sets, draft/provenance, actual times and session IDs stay unchanged.
- Run date baseline and append-only occurrence date revisions: owned run/version/workout identity, explicit timezone/start date/day-slot offsets, revision predecessor and unchanged original schedule baseline. Moves refuse a completed/started occurrence. No training-dose side effects.
- Cursor reservation/selection: an exclusive owner-wide single open run or compatible original cycle context, including concurrent finish-versus-confirm checks and unresolved workouts across the owner. Returning from a completed/abandoned repeat must revalidate the frozen prior cursor; do not resume or replace a newer context blindly.

The actual adapter must read these tables and canonical cycle/session/version/lifecycle/schedule data in a coherent snapshot, enforce verified FKs, parse strict stored DTOs and validate byte bindings. In-memory context JSON and interface tags are not substitutes for authoritative database ownership or transaction proof. Strict JSON parsing/field/size limits and account remapping still need production implementation.

## Recovery and activation gates

Export all repeat receipts/events/bindings/baselines/revisions with section counts in one schema increment. Deletion order must respect their FKs and verify zero records. Restore remaps owners in row and embedded witnesses, preserves IDs, checks original source history in both directions, rejects omitted/altered earlier source sessions and clock ambiguity, verifies every repeated session link and whole predecessor/cursor graph, and inserts everything atomically. Old backups normalize to empty repeat sections and original identities without invented dates or confirmation timestamps. Real SQLite upgrade and exact export/delete/restore/re-export tests remain required.

Before any runtime repeat action, the seven boundaries in `repeat-week-contract-draft.md` must share the run-aware cursor: calendar/status/moves, completion versus original six-week advancement, workout route/resume/drafts, calendar session identity, Home/Coach/Progress/review witnesses, reminders including response handling, and strict storage/export/restore. Initial repeat targets come from the explicitly frozen private prescription; no undisclosed progression or return-dose recommendation. Preserve privacy, qualified content gates, canonical goals/actuals and reduced motion.

Required native evidence remains: real completed private week, Cancel external JSON equality, atomic Confirm, force-close recovery, partial/new-try logging, run completion returning its prior cursor without source advancement, two distinct repeats, stale route/reminder refusal, external export/delete/restore equality, large text/keyboard/navigation/accessibility. Keep Android emulator, physical Samsung, iOS and actual participant evidence separate. Pure or prototype SQLite tests do not prove the feature is activated or ready to launch.

## Prototype validation receipt

Repository preparation commit `0006d688d376801fad473c1166a0056c85b07c82`: 18 focused actual isolated SQLite/seam tests passed; existing inactive domain 29 tests passed in the paired run before the final two repository additions. Typecheck, scoped ESLint, formatting and staged diff checks passed. The final two cases verify inconsistent recovered lookup bytes and fresh source-version refusal. No full verify, native build or runtime acceptance was performed for this preparation.


## Independent review correction: canonical owner-wide history

Review of inactive `0006d688` found that the confirm seam loaded canonical `history.sessions` but passed only the separately loaded source-context sessions to the domain validator. It could accept a foreign, orphan or duplicate canonical record; a closed receipt from another owned cycle instead failed due to its missing source witness. The new regressions reproduced those failures before implementation changes.

The correction validates the complete owner-wide receipt/event/session graph before new writes and again during final readback, compares the current-cycle canonical subset in both directions with the source-context snapshot using stable identity order, and rejects disagreement. It validates the prospective full graph before insertion, preserving global no-overlap/open-reservation invariants. Only after full validation does the domain confirmation receive cycle-scoped receipts/events, so closed history in other cycles remains valid while an open/paused run in another cycle still reserves the owner-wide cursor. Operation identity stays owner-wide: reusing another cycle's operation refuses.

These checks use both loaded sources rather than silently preferring the cleaner one. Exact retry still validates the whole canonical graph and lookup bytes. A faulty canonical reader at final readback causes the actual isolated transaction to roll back receipt and root. Production capability remains unavailable; actual migration/strict persisted DTOs/adapter/reader/export/restore/native acceptance are still pending.

Correction receipt: `fe0d8c01bf05c90e3e8fb9940fb818af50f4d66c`, 28 repository tests plus 29 inactive domain tests passed (57 total); typecheck, scoped lint, formatting and diff checks passed. Only the two repository files changed in Git; the QA draft records preparation evidence. No production/native activation or full verify was performed for this correction.
