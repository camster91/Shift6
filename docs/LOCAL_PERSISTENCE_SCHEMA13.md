# Local persistence foundation

SQLite migration 24 adds five tables without changing legacy exported columns.
Exports now use schema 13. Restore accepts exact schema 12 or 13; validated 12
normalizes to 13 with empty additions. No historical timing, feedback or memory is
inferred. The existing synthetic native schema-12 fixture remains unchanged.

## Frozen columns

All IDs and operation IDs are nonempty strings. Timestamp fields are ISO instants.
Owner fields refer to the current local profile. These records are local-only:
there is no outbox entity or provider activation.

- `cycle_lifecycle_events`: `id, user_id, cycle_id, kind, effective_date,
time_zone, previous_event_id, operation_id, recorded_at`. Kinds are `pause`,
  `resume`, `review-date`. Dates are explicit local `YYYY-MM-DD` dates, not
  inferred elapsed training days. One immutable chain per cycle, with a fixed
  user-confirmed time-zone anchor. Pause/resume alternate; review dates do not
  change pause state. Legacy paused cycles have no invented interval.
- `coach_memory_preferences`: `user_id, enabled, updated_at`. Missing means off.
  Restore sets enabled to zero without granting provider consent.
- `coach_memory_facts`: `id, user_id, value_json, revision, operation_id,
confirmed_at, updated_at`. `value_json` is exactly `{kind,value}`. Initial kinds:
  `training-time` (morning/afternoon/evening), `session-minutes` (integer 1–1440),
  `equipment` (unique known catalogue IDs), `coach-style`
  (concise/supportive/technical). These are explicit preferences, not health
  claims. No arbitrary prose, transcripts, photos, inferred goals or chat logs.
- `builder_recovery_drafts`: `id, user_id, snapshot_json, revision, updated_at`.
  The snapshot is exactly `{program,version,customExercises,imports}`. It contains
  an owned private program and its draft version, all referenced custom movements,
  and `{workoutId,text,previewText}` entries. Text is bounded to 10,000 characters;
  previewText is null or identical to current text. Snapshot limit is 1 MiB,
  100 workouts and 100 custom movements. Preview parsing must run again after
  recovery; recovery never applies rows, starts a cycle or publishes a program.
- `set_feedback_events`: `id,user_id,session_id,completed_set_id,difficulty,
corrects_event_id,operation_id,recorded_at`. Difficulty is
  `easier-than-expected`, `about-right`, or `harder-than-expected`. Feedback
  references an actual saved set. Revisions form one immutable correction chain
  per set. No conversion to RPE/RIR and no training threshold changes.

Camel-case contracts are in `src/domain/localPersistence.ts`. JSON validators
are exported from `src/domain/localRestore.ts` for recovery and memory callers.

## Repository requirements for subsequent UI work

Within an exclusive transaction, re-read owner/context and expected latest
event or revision. Identical operation retries return the existing record;
conflicting retries reject. Never use INSERT OR REPLACE for journal entries.
Compare-and-swap revisions guard memory and recovery edits. Append-only triggers
allow owner remapping but reject content changes. Journal root, parent and
operation indexes reject duplicate/branched writes. Foreign keys enforce saved
set/session identity; insertion/update triggers verify its cycle owner.

Memory editing replaces only its confirmed fact using the expected revision.
Forget deletes the fact and any feature-level retained value history; retries
must not retain forgotten text in tombstones. Disable excludes memory from local
context. Canonical training/goal records remain separate from memory and are not
deleted by forgetting a preference. UI must show that distinction explicitly.

Builder recovery has its own stable ID because blank builder program IDs
otherwise regenerate on launch. Recovery is separate from explicit Save draft.
Its custom media links are removed on restore; original media files are not in
the JSON backup. The imported original text remains local and unchanged until an
explicit edit/apply/clear action.

## Backup and identity boundaries

Schema 13 requires all five sections. Schema 12 rejects schema-13 sections rather
than silently accepting them. Bounds remain 20 MiB, 50,000 total rows, depth 24
and 200,000 nested nodes. Validation checks owners, missing references, journal
branches/cycles/order, dates/time zones, practical memory allowlists, draft
identity and preview freshness before any database transaction.

Restore remains empty-target, guest-only, exclusive and atomic. New tables join
empty-target checks, export counts and scoped deletion. Account adoption remaps
explicit owner columns and embedded recovery program ownership; it rejects
destination conflicts. No new sync payload is produced. Provider consent,
notification choices, health connections and memory enablement reset; backup
source files remain untouched.

## Scope and evidence

This foundation does not implement lifecycle/memory/recovery/feedback screens.
It does not implement repeat-week occurrence identity or qualified return
prescriptions. Those require separate coordinated behavior and native QA.

Regression coverage uses real SQLite: additive migration 23→24 preserves every
legacy fixture row, schema12→13 recovery and 13→13 round trips, owner adoption,
deletion, malformed graphs, stale previews, append-only/unique constraints and
late-insertion rollback. Native migration/restore and force-close checks remain
pending for the integrated candidate.
