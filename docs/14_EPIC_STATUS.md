# SHIFT6 epic status matrix

Updated: 2026-09-15

This file is a present-tense execution aid for issues #270–#281. It does not replace the issue acceptance criteria or `docs/12_RELEASE_READINESS.md`.

Status meanings:

- **Completed and verified** — evidence exists in the repository for the applicable non-native requirement.
- **Completed but awaiting verification** — implementation exists, but CI/native/human/provider evidence is still required.
- **In progress** — a defined in-repository scope item is still missing.
- **Blocked** — completion requires an external/provider/native/store/human-review dependency.

## #271 — Brand, Figma design system, custom icons and asset pipeline

**Status: Completed but awaiting verification / blocked on design review**

Implemented:
- token-driven colour/type/spacing/radius/elevation/motion/touch-target system;
- reusable mobile UI primitives and semantic states;
- dynamic text scaling in the shared Text component;
- semantic icon registry and original SVG handoff boundary;
- asset manifest validation in CI;
- accessible contrast tests and non-colour status patterns.

Remaining:
- final Figma variable/component review;
- custom production icon/export approval and provenance review;
- representative small/large iOS/Android visual QA;
- store screenshot art direction/assets.

## #272 — React Native/Expo app, local database, backend and CI

**Status: Completed but awaiting verification / blocked on native and provider gates**

Implemented:
- Expo SDK 57 / React Native 0.86 / TypeScript app shell and Router navigation;
- versioned SQLite migrations and local-first repositories;
- backend/auth/provider-neutral service seams;
- dev/preview/production EAS configuration;
- GitHub Actions quality workflow plus manual dispatch;
- one-command `npm run verify` repository gate;
- secret/release/asset checks, tests, Expo Doctor and web-export gates;
- provider-neutral error-reporting seam and root render error boundary.

Remaining:
- actual CI result for PR #282;
- representative native boot and SQLite restart/offline verification;
- signed EAS preview builds;
- deployed authenticated backend/auth provider;
- production error-monitoring provider and retention settings.

## #273 — Onboarding, profile, equipment and recommendations

**Status: In progress**

Implemented:
- guest-local onboarding;
- goals, experience, equipment, schedule, session length, training window and units;
- optional health preference;
- Coach tone/intervention preference;
- deterministic equipment-aware recommendations;
- editable profile/equipment preferences;
- transactional guest-data adoption seam for authenticated identity.

Remaining in repository:
- optional non-diagnostic movement/accessibility considerations from the canonical onboarding spec.

Remaining external verification:
- provider-specific sign-in/account UX;
- small/large iOS/Android, dynamic-type and screen-reader QA.

## #274 — Exercise catalogue, equipment taxonomy and substitutions

**Status: In progress / blocked on content review**

Implemented:
- typed exercise/equipment/movement/muscle schema;
- 23-item equipment taxonomy;
- 58 structurally complete draft exercise records, including eight band-native movements;
- search/filter/favourites/history foundations and 500+ record search-scale coverage;
- stable-ID exercise history;
- deterministic equipment-aware substitution ranking;
- user-facing substitution explanations for movement, muscle, tracking and equipment differences;
- private custom exercises;
- media/review-status model and publication-readiness gate.

Remaining:
- 300+ high-quality reviewed launch records;
- human technique/content review;
- reviewed media/provenance/licensing coverage.

## #275 — Program library, 20 launch programs and custom builder

**Status: In progress / blocked on fitness-content review**

Implemented:
- canonical 20-program metadata set;
- executable six-week versions for all 20 programs on PR #282;
- Barbell 30 canonical startable fixture;
- immutable program/version snapshots and copy-on-write editing;
- custom/blank builder, workout creation, reorder, sets, sections, supersets/circuits and custom exercises;
- equipment compatibility and program-detail gating;
- cycle start from a private snapshot.

Remaining:
- human fitness-content review/approval for all public launch programs;
- publication approval of their exercise content/media.

## #276 — Offline active workout logging and recovery

**Status: Completed but awaiting native verification**

Implemented:
- workout preflight and tracking-aware set UI;
- load/reps/time/distance/RPE/RIR;
- rest timer and plate calculator;
- notes, substitutions, add/reorder sets/exercises;
- pause/resume, partial and skipped sessions;
- local-first draft/completed-set/session durability;
- crash/reopen recovery boundary;
- offline completion and sync outbox;
- check-in/summary and explicit correction flow;
- offline/sync/conflict/error states.

Remaining:
- real-device app-kill/restart/offline proof;
- timer/background proof on iOS/Android;
- VoiceOver/TalkBack full-workout completion proof.

## #277 — Deterministic six-week progression engine

**Status: Completed but awaiting CI/merge verification**

Implemented:
- cycle creation/week state and program-specific Week 6 behaviour;
- linear, double, rep-target, RPE/RIR, volume, density, time, distance, cardio and skill strategies;
- explicit version-owned deterministic rule catalogue;
- mixed-modality target routing;
- readiness/discomfort holds;
- plateau detection requiring comparable adherent sessions;
- deterministic cycle facts/review and next-cycle choices;
- no LLM dependency for calculations.

Remaining:
- PR #282 repository verification/CI and merge review.

## #278 — Provider-agnostic AI PT Coach

**Status: Completed but awaiting provider evaluation/deployment**

Implemented:
- provider-neutral mobile Coach gateway and HTTP adapter;
- bounded structured context and free-text limits;
- offline deterministic explainer;
- red-flag safety routing;
- validated structured proposals requiring explicit user confirmation;
- proposal persistence/diff/accept/reject and stale-plan revalidation;
- evaluation matrix covering provider failure, missed training, plateau, discomfort/pain, limited time, equipment changes, medication boundaries and urgent symptoms.

Remaining:
- deployed server-side provider/model implementation;
- model/provider evaluation against real configured candidates;
- production privacy/retention policy for provider processing.

## #279 — Progress, cardio, mobility and health trends

**Status: In progress / awaiting native health verification**

Implemented:
- cycle dashboard and six-week comparison;
- strength/e1RM/rep/load PR history;
- volume and consistency summaries;
- cardio session logging/progress;
- typed mobility/power/balance/recovery workout support;
- optional HealthKit/Health Connect adapters;
- normalized/deduplicated local health summaries and trend cards;
- explicit import/disconnect/removal controls and source labels.

Remaining in repository:
- optional manual body-metric tracking from Profile/Progress.

Remaining external verification:
- native health permission/revocation/import QA and store declarations.

## #280 — Privacy, accessibility, export/delete and security

**Status: In progress / blocked on backend and native accessibility gates**

Implemented:
- SecureStore-backed auth-session seam;
- health-data least-permission boundary;
- analytics allowlist/redaction boundary;
- local user-data export/delete and guest-account adoption coverage;
- minimal Coach context and safety boundaries;
- shared dynamic type, accessible labels/states, touch-target and contrast baselines;
- dependency audit, secret scan and release-config checks;
- error reporting limited to allowlisted technical context.

Remaining:
- deployed backend row-level authorization and server-side access audit;
- verifiable remote account deletion;
- VoiceOver/TalkBack and accessibility-text-size device audit;
- production provider/data-retention security review.

Reduced motion remains a native QA requirement. The current app does not contain a deliberate animated training surface, so there is no product animation to disable in repository code today.

## #281 — Public App Store and Google Play readiness

**Status: Blocked on release evidence and approval**

Prepared:
- release/analytics/rollback requirements;
- native/release verification runbook;
- EAS build profiles and stable identifiers;
- notification and health permission controls;
- provider-neutral crash/error seam;
- privacy-safe analytics funnel;
- staged-release and rollback expectations.

Remaining:
- green repository verification/CI;
- signed iOS/Android candidate builds;
- representative native E2E/fault/accessibility QA;
- live auth/backend/crash monitoring;
- content/design approvals;
- privacy/support URLs and store data declarations;
- screenshots/listing copy/assets;
- staged rollout/rollback evidence;
- explicit approval for store submission and production release.

## #270 — Master rebuild

**Status: In progress**

The core local-first six-week training platform is implemented. The master remains open because the launch gate still depends on reviewed content scale, native/device verification, provider/backend production configuration, accessibility proof, and store-release evidence.
