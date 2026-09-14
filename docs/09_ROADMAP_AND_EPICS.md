# SHIFT6 — Roadmap & Engineering Epics

## Delivery philosophy

Build the smallest complete vertical slice first: onboarding → program → workout → progress → cycle review. Do not build 300 exercise media assets before the logging engine works.

## Phase 0 — Foundation

Epic 1: Product/design system
- Figma token system
- logo/app icon
- navigation
- core components
- accessibility baselines

Epic 2: Repository/app bootstrap
- Expo TypeScript app
- environments
- lint/typecheck/tests
- CI
- routing
- local database
- backend skeleton

Epic 3: Auth/profile
- guest mode
- account conversion
- Apple/Google/email auth
- units/goals/equipment/schedule

Exit gate: app boots on representative iOS/Android devices, CI green, design tokens implemented.

## Phase 1 — Workout core

Epic 4: Exercise catalogue
- schema
- search/filter
- seed 50 foundational exercises first
- detail screen
- media placeholders

Epic 5: Program model
- templates
- custom program builder
- workout builder
- versioning

Epic 6: Active workout
- offline set logging
- timer
- notes
- substitutions
- pause/resume
- summary

Exit gate: complete Barbell 30 entirely offline and retain data after app restart.

## Phase 2 — SHIFT6 differentiation

Epic 7: Six-week engine
- cycle creation
- progression strategies
- cycle dashboard
- week transitions
- review facts

Epic 8: Progress
- strength charts
- records
- consistency
- cardio minutes
- cycle comparison

Epic 9: AI coach
- provider-agnostic gateway
- structured context
- chat
- weekly review
- proposal diff/approval
- safety evaluation suite

Exit gate: user can complete a full simulated six-week cycle and approve/reject coach changes.

## Phase 3 — Breadth

Epic 10: 20 curated programs
- content review
- equipment filters
- recommendation logic

Epic 11: 300+ exercise catalogue
- exercise QA
- substitution graph
- media production

Epic 12: Cardio/mobility/power/balance
- session types
- interval builder
- mobility routines

Epic 13: Health integrations
- Apple Health
- Health Connect
- permissions
- import/dedup
- health trend UI

## Phase 4 — Public-release hardening

Epic 14: Notifications
Epic 15: Data export/delete/privacy
Epic 16: Analytics/crash/performance
Epic 17: Accessibility audit
Epic 18: Security review
Epic 19: Store assets/privacy disclosures
Epic 20: Release pipeline and staged rollout

## Post-launch

- Apple Watch
- Wear OS
- localization
- trainer/client tools
- richer nutrition/protein/hydration
- voice coach
- additional device integrations
- community only after privacy/abuse design

## Issue-writing rule

Every implementation issue should include:
- objective;
- user value;
- source doc links;
- in scope;
- out of scope;
- technical notes;
- data changes;
- analytics events;
- accessibility requirements;
- acceptance criteria;
- mobile QA (small iPhone, large iPhone, representative Android small/large, tablet if affected);
- offline behaviour;
- error states;
- security/privacy notes;
- rollback/migration considerations;
- screenshots/Figma links once available.

## Recommended build order

1. Design tokens + component primitives
2. Local DB + domain models
3. Onboarding/equipment
4. Exercise catalogue 50-core seed
5. Program templates
6. Active workout offline
7. Barbell 30
8. Program builder
9. Cycle engine
10. Progress
11. Coach
12. More programs/exercises
13. Health integrations
14. release hardening

## First foundation execution sequence — #271 + #272

The reset repository has no application code, so the first two epics are delivered as small, independently reviewable slices:

1. **Repository and runtime bootstrap (#272):** Expo SDK 57 project metadata, TypeScript strictness, public environment example, dependency alignment, and a quality CI workflow.
2. **Design-token baseline (#271):** implementation tokens for colour, typography, spacing, radius, elevation, motion, icons, touch targets, and semantic states; keep the Figma variable names aligned with the code vocabulary.
3. **Core primitives (#271):** `Screen`, `Text`, `Button`, `IconButton`, `Card`, `ProgramCard`, `WorkoutCard`, `Chip`, `ProgressIndicator`, `SixWeekIndicator`, `BottomNavigation`, `EmptyState`, `ErrorState`, `OfflineBanner`, and `LoadingSkeleton`, including accessible labels and non-colour state cues.
4. **Domain and local durability boundary (#272):** stable typed entities, Barbell 30 fixture data, a versioned SQLite migration, and an atomic completed-set/outbox repository. Do not connect UI success states until the active workout uses this repository.
5. **Navigation and real fixture surfaces (#271/#272):** Home, Programs, Coach, Progress, and Profile tabs; a six-week cycle motif; a typed Barbell 30 Home card; and an honest active-workout route that makes the local durability boundary visible.
6. **Verification gate:** lint, format, typecheck, unit/component tests, Expo doctor, web bundle and accessibility smoke tests; then native simulator/device boot, signed preview build, and native SQLite restart/offline tests before calling the foundation device-verified.

Current branch status: steps 1–5 are implemented; #271 now has token-driven primitives plus a semantic icon registry and original SVG asset handoff boundary, while Figma approval and final exports remain open; #272 now also has a vendor-neutral authenticated HTTP sync transport skeleton with explicit unavailable behavior and response validation, but no backend/auth provider is connected; the first #273 onboarding increment is implemented with deterministic recommendations and a native profile/equipment persistence boundary, and the Programs surface now ranks the 20-program metadata catalogue from those saved preferences with real schedule/duration filters; the first #274 increment adds a 23-item equipment taxonomy, 50 draft exercise records, searchable catalogue behavior, deterministic substitutions, a read-only exercise detail route, a content-readiness gate that separates runnable drafts from publication-approved content, runtime resolution of user-owned custom exercise names/tracking types in active workouts, and a safe active-workout substitution path before first-set completion; #275 now carries metadata for all 20 planned launch programs while keeping only Barbell 30 startable, plus an immutable custom-copy/custom-exercise builder, local version snapshots, a private-copy cycle start path, accessible exercise reorder/remove/set-count controls, deterministic substitution choices, tracking-aware target configuration, and optional empty-workout creation with a starter movement in the private builder; the first #277 deterministic progression increment is implemented and unit-tested, with next-session targets now derived from the latest completed local workout and applied to routed Barbell 30 sessions; the first #276 active-workout path now persists unfinished inputs, resumes the latest in-progress session across route/app reopen, creates a distinct session for a repeated completed workout, supports in-place set correction through the same idempotent outbox, routes completion to a persisted check-in summary, observes runtime offline state without blocking local logging, excludes optional sessions from cycle advancement, exposes two optional Barbell 30 cardio sessions, and renders tracking-aware time/distance inputs; the first cycle-start increment now persists a program-version snapshot and links Home/workout reads to the active cycle; Home now also resolves the persisted profile greeting, current weekday workout, and completed-aware weekly schedule from the active version snapshot; the first progress increment now derives cycle facts from local session/set records, the next progress increment now derives per-exercise strength history, deterministic personal records, and next-session trend context from canonical completed-set identities, cycle-review aggregation now includes persisted effort/discomfort check-ins and record IDs, and Review now exposes those facts plus explicit next-cycle choices; cycle completion now advances from persisted weekly counts and exposes a deterministic review boundary; the sync outbox now has an explicit idempotent flush contract behind `BackendClient`, plus a connectivity-aware coordinator that leaves offline mutations queued; #278 now has a provider-neutral safety classifier, proposal validator, scoped local proposal store, and a Coach surface that reads pending proposals and records explicit decisions; #279/#280 now have a provider-neutral optional health contract with an explicit unavailable adapter, a user-scoped local export/delete repository surfaced from Profile, and privacy-safe analytics filtering. CI now also runs Expo Doctor and web export. Step 6 is partially verified on the web/tooling surface. Native device verification and the signed preview build still require the corresponding local runtimes/EAS credentials and must not be inferred from a web export.

The onboarding increment intentionally stops at saving preferences and returning to the Programs surface. Native Home now routes a fresh local install into that onboarding flow, while the web preview remains ungated because it has no durable database. Profile edits now queue a stable, replaceable profile snapshot in the local-first outbox in the same transaction as the local profile/equipment write. The increment does not claim account conversion, health permission requests, or a fully populated program library. Cycle creation is now covered for the Barbell 30 fixture; multi-program cycle selection and a populated library remain later boundaries. Starting the curated template now creates a private snapshot with a unique program/version namespace; builder visits receive unique private program/version IDs so completed-cycle snapshots cannot be overwritten by a later edit, active-workout substitutions create a new revision while preserving unfinished-session continuity, the builder can add searched foundational catalogue movements with tracking-aware default targets and persisted equipment/unit preferences, active workout substitution ranking also uses that profile, Programs now exposes a guarded blank six-week builder path, Review can launch a private adjustment from the completed cycle's own program snapshot with a blocking retry state if that snapshot is unavailable, and the builder now edits workout metadata, shared rest, bounded exercise notes, typed workout sections, and validated superset/circuit groups through immutable domain operations.

Do not start store submission until data deletion, privacy disclosure, crash monitoring, accessibility audit, and offline workout reliability are complete.
