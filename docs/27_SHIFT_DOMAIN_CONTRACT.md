# SHIFT6 Shift and measurement contract — #306 working slice

This is the first #306 implementation slice, stacked on #305. It defines pure, deterministic domain types and comparisons. It does **not** migrate user data, enable a Shift in the release manifest, or complete #306. #309 must approve exact pilot protocols and #315 must settle calendar/re-entry transitions before persistence or UI integration.

## Ownership and lifecycle

`TrainingCycle` remains the canonical training schedule/status and `ProgramVersion` remains the immutable prescription. A `Shift` references both stable IDs, an owner, a template, a current block objective, an optional longer-term aspiration, a versioned measurement protocol and an optional baseline. The linked cycle is the only source for active/paused/completed training state; review/test/attainment are independent outcomes. Existing cycles have no Shift record and remain readable as legacy training, without inferred goals or baseline. Its current week is a training-cycle position, **not** calendar position; #315 owns elapsed time and revised dates.

The pure model does not manufacture an active Shift from a cycle. The future repository transaction must enforce one primary active Shift per owner while retaining older cycles. A completed block may have an optional/declined/postponed test; it does not automatically meet the goal. Target changes should produce a traceable goal revision, never rewrite completed observations or program snapshots. An amendment keeps the original measurement's effective date while retaining both records and a separate correction timestamp in persistence.

## Measurement

Protocols are immutable comparison keys: stable ID/version, metric, exercise, variant, assistance, equipment/setup, canonical unit, relevant rep count/fixed distance and direction. Rep count, load for specified reps, timed hold, fixed-distance time, distance and completion use distinct protocol types. An observation records its entered value/unit, timestamp, source and the exact protocol key. Explicit qualified assessment/workout observations are required; a completed session does not create one.

The pure evaluator rejects non-finite/negative values, invalid units and incompatible context without altering the input. It normalizes compatible lb/kg, minutes/seconds and km/m/metres/miles for comparison, retaining original entry. Zero can be a valid measured baseline; an unavailable or deferred baseline is separately represented. For zero baseline, show absolute change only. Last measured value/date, personal best/date and any future estimate are separate. Target attainment uses the latest comparable observation; a stale best cannot imply current ability. An already-met baseline is a separate flag, so a later lower result cannot masquerade as current attainment.

## Pending integration

1. #309 selects exact protocols, target predicates, test/return safety rules and human reviewer evidence for three templates. No universal fitness threshold is invented here.
2. #315 owns calendar projection, pause/resume/repeat and review dates. Do not put a competing week clock in `Shift`.
3. Add a versioned SQLite migration and atomic owner-scoped repositories for Shift metadata, immutable observations and amendment history, with one-primary-active enforcement, before UI consumption.
4. Extend export/delete, guest adoption, outbox idempotency, sync conflict and restore contracts and tests with those records. Do not publish a partial persistence implementation.
5. #307/#308/#312 consume the resulting projections with accessible missing/non-comparable states; #281 supplies exact-device evidence.
