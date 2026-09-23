# SHIFT6 launch program fitness-content review workflow

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

For focused v1, every enabled Shift/version requires traceable fitness review and all referenced exercises must be publication-ready. Twenty executable historical catalogue entries do not mean 20 reviewed launch Shifts. The count gate below describes the former broad launch goal, retained as future catalogue ambition; [the manifest](../content/release-manifest.json) defines the actual focused release.

Review evidence must name both `programId` and the exact immutable `programVersionId`. A later version of the same program needs its own human review before publication. The runtime start gate also checks that every referenced public exercise appears in the enabled release allowlist.


Updated: 2026-09-16

This document defines the evidence required before a historical catalogue program can count as
fitness-content reviewed and publication-ready. It does not approve any current program.

## Current state

The repository contains the 20 canonical launch program entries and each currently has an executable
six-week version. That is an engineering milestone, not a content-review milestone.

Barbell 30 remains the canonical startable fixture used to exercise the product flow. Its catalogue
`published` label means it is the current startable canonical template inside the app; it is not, by
itself, evidence that the program and all referenced exercise content have completed release-level
fitness review.

`assessLaunchProgramCatalogue()` separates four counts:

- total launch catalogue entries;
- executable six-week versions;
- programs with traceable fitness-content review evidence;
- programs whose version and referenced exercises are publication-ready.

The historical broad-catalogue gate required at least 20 in each relevant category, unique program IDs/slugs, valid
metadata, and no unresolved publication blockers.

## Review evidence

A completed program review is represented by `ProgramContentReviewEvidence`:

- `programId` — the stable program identifier;
- `reviewedAt` — when the human review was completed;
- `reviewReference` — a traceable internal review record, issue, document reference, or other
  auditable identifier.

The canonical evidence list remains empty until real review has happened. Do not add placeholder
reviews simply to make the launch gate green.

A timestamp without a review reference does not count as completed evidence. Duplicate evidence for
the same program and evidence referencing an unknown program are both release blockers.

## Program review checklist

For every launch program, review the actual executable version—not just the catalogue card copy.
Confirm at minimum:

1. The stated goals match the workout structure and progression strategy.
2. The target audience and experience range are appropriate for the movements and progression rate.
3. Required and optional equipment accurately describe what the workouts use.
4. Days per week and expected session duration are realistic for the version being shipped.
5. The six-week phase structure is coherent and Week 6 behaviour matches the program intent.
6. Exercise selection, order, set/rep/time/distance targets, rest periods, and optional sessions are
   internally consistent.
7. Every referenced exercise is itself publication-ready under the exercise-content gate.
8. Progression rules fit each target type and do not create unsupported load, volume, intensity, or
   cardio jumps.
9. Warm-up, cooldown, mobility, conditioning, and recovery elements do not imply medical treatment
   or individualized rehabilitation.
10. Equipment substitutions and program edits preserve the intended training stimulus or clearly
    explain meaningful differences.
11. The program does not rely on display names as history identifiers; stable program/version,
    workout, exercise, and set IDs remain intact.
12. User-visible descriptions accurately match what the executable version actually does.

## Barbell 30 canonical check

Barbell 30 must continue to match the canonical plan in
`docs/05_PROGRAMS_EXERCISES_EQUIPMENT.md`. Treat changes to its workout structure, progression rules,
equipment requirements, or six-week interpretation as content changes requiring renewed review,
not as incidental implementation edits.

## Personal programs and builder content

User-created or duplicated personal programs are private by default and do not count toward the 20
curated launch-program review target. Editing a personal snapshot must not mutate its source template
or historical completed sessions.

The public launch review process therefore applies to the curated template versions, not to every
private variation a user can build later.

## Review procedure

For each program:

1. Keep the executable version in its current draft/review state while engineering work proceeds.
2. Run repository validation to catch structural, ID, equipment, and exercise-reference failures.
3. Review the complete six-week plan with a qualified human fitness-content reviewer.
4. Resolve content feedback in the source version and repeat structural validation.
5. Verify every referenced exercise passes the exercise publication gate.
6. Record a durable review reference and completion timestamp.
7. Add review evidence only after the reviewer signs off on the resulting version.
8. Re-run the 20-program catalogue readiness gate.
9. Verify the reviewed program in program detail, preflight, active workout, progression, summary,
   and next-cycle flows on representative native builds.
10. Require renewed review when a later change materially alters exercise selection, targets,
    progression, weekly structure, audience, safety framing, or program intent.

## Release non-claims

A passing repository test does not establish that:

- a human fitness reviewer approved the program;
- the reviewer is qualified for the content being assessed;
- an earlier review still applies after material program changes;
- every exercise has completed its own technique/media review;
- the program has been validated for an individual user's medical situation;
- native-device, accessibility, health-integration, or store review is complete.

Those require separate evidence before #275 or the public-release epic can be closed.
