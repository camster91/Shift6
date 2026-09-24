# Shift persistence and sync boundary — #306 design contract

Status: proposed shared contract for #306, #309 and #315. No migration, server support, public template or production write path exists yet. This note records the decisions needed before the additive migration; it is not an implementation or release approval.

## Existing sources of truth

- `TrainingCycle` retains active/paused/complete status, the prescribed cycle week and workout history. `ProgramVersion` remains an immutable training prescription. #315 owns elapsed calendar time, pause intervals, schedule revisions and review dates. `Shift` references these records and owns the goal, protocol, baseline reference and review choice; it must not create a second cycle clock.
- Existing cycles remain valid without a Shift. The migration creates empty tables only; it must never backfill an invented goal, baseline, result or attainment.
- One primary active Shift per owner is enforced against its linked active cycle in a single write transaction. Pausing a cycle does not create another active primary Shift; resuming or replacing one must resolve the existing primary relation explicitly. History remains readable.

## Proposed local records and write rules

1. `shifts`: stable ID, owner, cycle ID, immutable program version ID, template ID/version, objective and optional aspiration, active protocol ID/version and canonical target, baseline state/reference, review state and next choice. A unique cycle link and owner-scoped reads prevent accidental cross-user access. A single-primary constraint should be based on an explicit primary relation rather than a second status copied from `TrainingCycle`.
2. `shift_protocols`: a versioned immutable protocol snapshot (metric, unit, direction, exercise/variant, assistance, equipment/setup, rep count or fixed distance). The snapshot travels with the Shift. Once observations refer to a protocol version, changes create a new version/comparison series; editing its JSON in place is forbidden.
3. `shift_observations`: append-only stable ID, Shift/owner, protocol key, measured effort date, recorded date, source, original value/unit and optional correction parent. The DB owns typed value serialization and indexes by owner/Shift/date. No workout completion writes an observation implicitly. A `qualifying-workout` source must reference the eligible workout/session and approved protocol, while imported/historical entries retain their source label.
4. `shift_goal_revisions`: append-only target/protocol/objective changes with the previous revision reference, recorded date and reason or user action. A change never rewrites prior observations or their test context. Final review/next choice changes need an auditable revision or a separately versioned record.

The first write transaction checks that the linked cycle belongs to the same owner and program version, the selected template/protocol is eligible, IDs are unique, the owner has no competing primary active Shift, and the baseline reference is a compatible observation of that Shift. A measurement transaction checks the owner, protocol snapshot and units, amendment parent and chain, and duplicate ID semantics. Replaying the same ID with identical payload is idempotent; the same ID with different contents is a conflict, not an update. Corrections append records and leave both original and effective measurement dates traceable. Invalid entries fail without deleting previously recorded evidence.

## Sync and conflict boundary

The current `sync_outbox` and `SyncMutation` contract has no Shift entity types or documented backend acceptance. Before any production writer is exposed:

- Add `shift`, `shift-protocol`, `shift-observation` and `shift-goal-revision` (or one equivalently complete aggregate) to the versioned mobile/server protocol. Define authorization by account owner, idempotency key, dependency ordering and server responses. A server that lacks this version must reject explicitly; it cannot acknowledge and silently discard a Shift record.
- Commit local records and their outbox mutations atomically. Stable keys must survive retries, restarts, guest adoption and restore. Append-only records cannot share a mutable one-per-entity outbox key that would overwrite an unsent amendment.
- On guest adoption, require an empty destination, move all Shift records and rewrite every queued payload's `userId` in the same transaction. Existing owner/cycle links remain consistent. Duplicate server IDs, protocol revisions, divergent corrections and simultaneous primary Shifts are reviewable conflicts; do not pick a winner based on arrival time.
- Export includes raw protocol snapshots, targets/revisions, all observations and corrections with original units and dates. Delete removes owned Shift records and pending mutations before dependent cycles/profiles, without touching other owners. Account deletion and supported restore use the same coverage; product analytics and provider-backed Coach payloads do not receive raw measurements by default.

## Dependency gates

The generic schema does not set exercise prescriptions or return thresholds. #309 must select exact pilot template/protocol IDs, reviewer evidence and any qualifying-workout/test rules. #315 must define calendar projections and pause/re-entry transactions before their data is added. The migration and repository can then be implemented and tested as one coherent slice with real SQLite constraints, owner isolation, duplicate/retry/conflict, legacy-cycle migration, guest adoption, export/delete and sync protocol tests. Keep the public release manifest empty until reviewed content is approved.
