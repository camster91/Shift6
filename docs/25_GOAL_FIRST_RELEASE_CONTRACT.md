# SHIFT6 goal-first release contract

Canonical product epic: [#304](https://github.com/camster91/Shift6/issues/304). Repository reconciliation: [#305](https://github.com/camster91/Shift6/issues/305). Visual world: [#319](https://github.com/camster91/Shift6/issues/319).

**Six weeks. One measurable goal.** One primary active Shift connects a chosen goal and typed baseline to an immutable program version, today's session, comparable observations, a Week 6 review and an explicit next choice. Supporting movements do not create competing primary goals. Six weeks structures review; it never guarantees the target. Closing a block, taking a final test and reaching a target are separate facts.

## Product and measurement contract

A Shift references the existing TrainingCycle and ProgramVersion; #306 specifies its exact ownership, migration and lifecycle. Do not duplicate their sources of truth. Existing cycles without goal metadata must survive without invented baselines, achievements or changed completed snapshots. Corrections require traceable amendments.

A measurement protocol records exercise/variant, assistance, equipment/setup, units, relevant reps or distance, protocol version, source/date and whether higher, lower or completion is better. Reps, load at a specified rep count, timed hold, fixed-distance time, distance and completion are distinct types. Compare only compatible observations. Do not equate assisted with unassisted work or calculate a percentage increase from zero. Keep calendar position, completed sessions, adherence, latest comparable measurement, personal best and estimate separate. A logged session cannot advance a physical-performance marker without an actual qualifying measurement.

**The schedule follows the calendar; progression follows actual performance.** #315 defines previewed, user-confirmed pause, resume, repeat-week and re-entry dates. Missed sessions create no penalty, catch-up requirement, silent target increase or permanent old-week display. Stop/discomfort follows a separate safety path from ordinary difficulty. #311 owns deterministic progression and a one-tap difficulty response; no provider call is required.

At review, a user may maintain, repeat, adjust/progress, choose another goal or take a planned break. A postponed/declined assessment cannot block review. Early success never silently raises a target. An improved but unmet result remains improvement.

## Scope and capability map

| Capability | Focused pilot / first release | Later / condition |
| --- | --- | --- |
| Three representative Shifts | Approximately one rep, one timed, one Barbell/strength, each versioned and human content-reviewed (#309) | Exact IDs and public enablement follow review, not a numeric quota |
| Goal, baseline, Today, workout, progression, review, return | Core vertical slice #306–#312 and #315; offline capable; accessible and recoverable | Advanced views may follow evidence |
| Coach | Optional contextual explanation #313; deterministic core and local fallback | Provider-backed features only with configuration, privacy and cost review |
| Visuals | Figma-first direction and representative screens in parallel (#319); static/reduced-motion paths | Full art library and trailer after direction approval |
| Catalogue and builders | Existing architecture and user-authored private content retained; no unreviewed public startability | 20 programs, 300+ reviewed exercises, broader builders, 6–8 Shift ideas are expansion targets |
| Health, body metrics, sync/account | Existing guarded architecture preserved; actual enabled-binary permissions and backup claims require review | Never advertise unavailable or unverified capabilities |

#270–#281 retain applicable architecture, content, privacy, accessibility and native evidence requirements. No narrower scope relaxes safety. Pilot participation (#316) and public store release (#281) are separate decisions.

## Publication contract

`content/release-manifest.json` is the versioned allowlist. Draft entries remain disabled. Every enabled public Shift must have an executable immutable version, traceable program review and every referenced public exercise must pass technique, safety, provenance and implementation review. Runtime discovery, recommendations, direct routes, substitutions and offline caches must consult the same allowlist; #306/#309 implement new Shift routes against it. User-authored custom content is private and never inherits a reviewed-public label. The focused release gate deliberately fails when no Shift is enabled. CI repository verification can pass while release readiness remains blocked.

Current status: pilot IDs, measurements, human fitness reviews, Figma nodes and signed native evidence are not approved. No assets are generated in #305. A passing code export is not device verification or store readiness.

## Design and validation handoff

| Screen/state | Issue | Figma node |
| --- | --- | --- |
| Goal selection / plan versus add-on / baseline fallback | #307, #309 | Pending |
| One Shift Today / no active Shift / storage recovery | #308, #280 | Pending |
| Focus, rest, partial, stop/discomfort, completion | #310, #311 | Pending |
| Pause, repeat, re-entry, adjusted schedule | #315 | Pending |
| Measured progress, early target, optional test, review, next choice | #312 | Pending |

Use existing tokens/components (#271) and Figma for actual visual designs. Text and contracts stay in Markdown; do not invent approval or nodes. Measure first workout, continued training, return, assessment, closure and next-step start with explicit denominators under #314/#316. No raw health data or free text in general analytics.

Core training must work offline without a paid AI call. Before connected/provider features, an owner must set hosting, support, monitoring, provider and usage budgets; no amounts or purchases are approved here. Audit native permissions, entitlements, imports, disclosures, backup claims and older-client compatibility for the exact enabled binary. Preserve versioned, reversible data migration and tested rollback/forward recovery.
