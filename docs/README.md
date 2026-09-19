# SHIFT6 documentation index

Use this index to distinguish durable product requirements from historical implementation notes and current release readiness.

## Product and architecture requirements

These documents define intended product behaviour and remain the source of requirements unless deliberately revised:

1. `00_MASTER_PRODUCT_PLAN.md` — vision, launch scope, principles, release definition.
2. `01_BRAND_AND_DESIGN_SYSTEM.md` — brand direction, tokens, components, accessibility intent.
3. `02_SCREEN_BY_SCREEN_SPEC.md` — mobile information architecture and capability requirements.
4. `03_SHIFT6_PROGRESSION_ENGINE.md` — deterministic six-week progression and review rules.
5. `04_AI_PT_COACH.md` — Coach behaviour, provider abstraction, safety and evaluation requirements.
6. `05_PROGRAMS_EXERCISES_EQUIPMENT.md` — canonical 20 launch programs and exercise/equipment model.
7. `06_TECHNICAL_ARCHITECTURE.md` — technical architecture plus accumulated implementation checkpoints.
8. `07_ASSET_AND_ICON_PROMPTS.md` — asset/icon production direction and provenance expectations.
9. `08_PRIVACY_ACCESSIBILITY_SAFETY.md` — privacy, accessibility, health-data and safety requirements.
10. `09_ROADMAP_AND_EPICS.md` — delivery sequence plus accumulated implementation checkpoints.
11. `10_QA_RELEASE_ANALYTICS.md` — QA, analytics, store, rollout and rollback requirements.
12. `11_MASTER_BUILD_PROMPT.md` — implementation handoff context for coding agents.

## Current implementation status

`12_RELEASE_READINESS.md` is the present-tense checkpoint for what is implemented, what remains unverified, and what must not be claimed complete.

Implementation-status paragraphs embedded in `06_TECHNICAL_ARCHITECTURE.md` and `09_ROADMAP_AND_EPICS.md` record earlier increments. They are useful history, but they can become stale as later branches land. When a historical status note conflicts with current code/tests or `12_RELEASE_READINESS.md`, verify the current branch and use the newer evidence.

## Release execution

`13_NATIVE_RELEASE_VERIFICATION.md` is the evidence checklist for repository verification, native-device QA, offline/restart durability, accessibility, HealthKit/Health Connect, notifications, auth/backend, observability, content/design approval, store submission, staged rollout and rollback.

External, credentialed, production, paid-build, store-submission and other difficult-to-reverse actions remain explicit approval gates even when this runbook describes how to perform them.

Supporting release documents on the cumulative stack:

- `15_STORE_RELEASE_PACKAGE.md` — draft store copy, data-safety inventory, screenshots and submission blockers.
- `16_ACCOUNT_DELETION_CONTRACT.md` — mobile/server deletion contract and recovery expectations.
- `17_STACKED_PR_VERIFICATION.md` — exact-head stack verification and merge sequencing.
- `18_EXERCISE_CONTENT_REVIEW.md` and `19_PROGRAM_CONTENT_REVIEW.md` — human content-review evidence gates.
- `20_COACH_PROVIDER_RELEASE_GATE.md` — provider/privacy/evaluation evidence for remote Coach.
- `21_SYNC_SERVER_CONTRACT.md` — authenticated sync/idempotency/authorization requirements.
- `22_RELEASE_CONFIGURATION_GATE.md` — strict submission-time public URL/provider configuration validator.

## Agent rule

Before implementing a supposedly missing feature:

1. read the requirement document;
2. check `12_RELEASE_READINESS.md`;
3. inspect the current code/tests on the target branch;
4. distinguish implementation from native/human/provider verification;
5. do not recreate a feature only because an older checkpoint says it was still open;
6. do not mark a release gate complete without evidence.
