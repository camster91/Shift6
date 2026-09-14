# SHIFT6 — Technical Architecture

## Goals

- iOS + Android from one maintainable product codebase;
- excellent native workout experience;
- offline logging;
- reliable sync;
- health integrations;
- provider-agnostic AI;
- privacy-safe analytics;
- scalable content catalogue;
- future watch apps without rewriting domain logic.

## Recommended mobile stack

- React Native + Expo + TypeScript
- Expo Router
- New Architecture enabled once dependency compatibility is verified
- React Native Reanimated for purposeful motion
- design tokens generated from Figma variables
- TanStack Query for server state
- Zustand or equivalent minimal store for local UI/session state
- Expo SQLite for durable local workout data
- SecureStore/Keychain/Keystore for tokens/secrets

Do not adopt a UI framework that makes exact Figma implementation difficult. Prefer a small internal component system backed by tokens.

## Backend

Recommended baseline:
- PostgreSQL;
- managed auth;
- object storage for exercise media/user-private media;
- server functions/API;
- row-level authorization;
- background job capability;
- push-notification worker;
- AI gateway.

Supabase is a reasonable starting implementation, but domain services must be abstracted enough to migrate if needed.

## Offline-first strategy

Workout execution is local-first.

Local database stores:
- active program snapshot;
- current cycle;
- upcoming workouts;
- exercise metadata needed for current plan;
- workout session;
- sets;
- timers/preferences;
- queued mutations.

Sync uses an outbox:
1. local write succeeds immediately;
2. mutation queued with idempotency key;
3. background sync submits;
4. server acknowledges;
5. local item marked synced.

Never block set logging on network availability.

## Conflict rules

- completed set/session records are append-oriented and idempotent;
- profile/settings use latest user-confirmed edit with server version checks;
- program edits create versions/snapshots;
- if same future plan changed on two devices, surface conflict instead of silently dropping one;
- health-import data deduplicated by external source ID + timestamp/type.

## Domain entities

Core:
- User
- UserProfile
- Equipment
- UserEquipment
- Goal
- ProgramTemplate
- UserProgram
- ProgramVersion
- Cycle
- WorkoutTemplate
- WorkoutSession
- Exercise
- ExerciseVariant
- ExerciseMedia
- ExerciseEquipment
- ExerciseMuscle
- ExerciseSubstitution
- Prescription
- SetTarget
- SetLog
- CardioSession
- MobilitySession
- CheckIn
- CoachConversation
- CoachMessage
- CoachProposal
- CoachProposalChange
- ProgressMetric
- PersonalRecord
- HealthConnection
- HealthSampleSummary
- NotificationPreference
- AppEvent

## Program immutability

When a user starts a cycle, snapshot the program version. Future edits create a new version. Completed history must never change because a template changed.

## API boundaries

Suggested modules:
- `/auth`
- `/profile`
- `/catalog/exercises`
- `/catalog/programs`
- `/programs`
- `/cycles`
- `/workouts`
- `/progress`
- `/health`
- `/coach`
- `/notifications`
- `/media`

Use generated typed API contracts.

## AI gateway

Server only.

Interface concepts:
- `generateCoachMessage(context, task)`
- `generateProposal(context, allowedChanges)`
- `summarizeCycle(structuredFacts)`
- `explainExerciseSubstitution(candidates)`

Provider adapters must return normalized structured responses. API keys never ship to mobile clients.

## Health integrations

### iOS
- Apple Health / HealthKit
- request only data required for enabled features
- support workout write-back only after separate review

### Android
- Health Connect
- same least-permission policy

Initial read targets:
- steps;
- workouts;
- heart rate summaries where available;
- resting HR;
- sleep duration where available;
- weight/body measurements if user grants.

## Notifications

- local rest timers;
- local workout reminders where possible;
- remote coach/weekly/cycle reminders only with opt-in;
- timezone-aware;
- no guilt language.

## Observability

- crash reporting: Sentry or equivalent;
- structured backend logs;
- sync-failure telemetry without health payloads;
- performance traces;
- AI request metadata without unnecessary raw health data.

## Analytics

Privacy-conscious event schema. Examples:
- onboarding_completed;
- program_started;
- workout_started;
- workout_completed;
- cycle_completed;
- coach_proposal_shown;
- coach_proposal_accepted;
- custom_program_created;
- exercise_substituted;
- health_connected.

Never send free-text health notes or raw workout notes to analytics.

## CI/CD

- GitHub Actions: lint, typecheck, unit, component, schema, security checks;
- preview builds for PRs where practical;
- EAS or equivalent for signed mobile builds;
- separate dev/staging/prod environments;
- store submission requires explicit release approval;
- feature flags for risky modules.

## Testing stack

- unit: Vitest/Jest based on final Expo compatibility;
- React Native Testing Library;
- Maestro or Detox for mobile E2E;
- API contract tests;
- database migration tests;
- offline/sync fault tests;
- AI evaluation suite;
- accessibility automation plus manual VoiceOver/TalkBack.

## Performance targets

- cold launch useful UI under ~2.5s on representative mid-tier device where feasible;
- workout screen interactions <100ms perceived response;
- set completion durable immediately;
- exercise search responsive with hundreds/thousands of records;
- image/video loaded progressively;
- no workout loss on crash/restart.

## Foundation implementation record — 2026-09-13

The initial rebuild branch implements this architecture as a small, native-first foundation:

- Expo SDK 57, React Native 0.86, React 19, TypeScript, Expo Router, and the New Architecture-compatible dependency set are the current mobile baseline.
- `src/design/tokens.ts` is the first implementation token source. It mirrors the documented colour, type, spacing, radius, motion, icon-size, touch-target, elevation, and semantic-state vocabulary. Elevation uses React Native's cross-platform `boxShadow` form. A system sans fallback is used until the Figma font decision and licensed font asset are approved.
- `src/components/ui/` contains the first internal component layer. `BottomNavigation` implements the planned black floating capsule; temporary Ionicons provide semantic fallbacks while the original SHIFT6 icon family and provenance pipeline are produced under #271.
- Native builds mount `SQLiteProvider` through `src/db/LocalDatabaseProvider.tsx`. `src/db/migrations.ts` owns versioned schema changes, and `src/db/workoutRepository.ts` persists a workout session or completed set with its idempotent sync-outbox mutation in one transaction. The success UI must be downstream of that transaction when the active workout is implemented. Workout sessions also snapshot focus so later progress aggregation can distinguish cardio from strength without consulting mutable program data.
- `LocalDatabaseProvider.web.tsx` intentionally makes web a non-persistent preview surface. It prevents the current SDK 57 SQLite WASM worker packaging gap from blocking UI smoke tests and must not be treated as workout durability evidence.
- `src/domain/types.ts` uses stable string IDs, ISO timestamps, explicit program versions, cycle snapshots, immutable completed-session records, and a program-specific `CycleModel.weekSixMeaning`.
- `src/domain/equipment.ts` is the first equipment taxonomy and compatibility boundary. `src/domain/fixtures/exercises.ts` seeds 50 schema-complete foundational exercise records with stable IDs, tracking types, muscle/pattern metadata, and explicit `contentStatus: 'draft'`; no draft record is treated as technique-reviewed production media.
- `src/domain/programBuilder.ts` provides copy-on-write operations for user-owned program versions, exercise add/remove/reorder, and custom exercise creation. Migration 5 stores user program/version and custom-exercise JSON snapshots; `programRepository.ts` queues the latest snapshot through the same outbox boundary.
- `src/services/contracts.ts` exposes replaceable `BackendClient`, `CoachGateway`, and privacy-safe analytics contracts. No backend endpoint, AI provider, credential, or cloud mutation is included in this foundation increment.
- `src/config/env.ts` reads only `EXPO_PUBLIC_*` values. `.env.example` documents public configuration; secrets are not accepted by the mobile bundle.

This record is an implementation checkpoint, not a release claim. Native boot, signed EAS builds, backend connectivity, SQLite restart durability on device, and full offline workout completion remain later verification gates.

## Onboarding implementation checkpoint — 2026-09-13

The next #273 increment adds a real multi-step onboarding route at `app/onboarding.tsx` and keeps its decisions in the typed domain layer:

- goals, experience, equipment, schedule, session length, units, optional health preference, and Coach preferences are represented as an `OnboardingDraft`;
- `recommendPrograms` deterministically ranks compatible programs and explains goal, experience, schedule, duration, and equipment fit without AI or network access;
- native SQLite migration 2 persists a guest profile and replaceable equipment rows atomically; `getOnboardingProfile` reloads answers when the user edits setup;
- web remains an explicit preview surface and does not claim persistence or health permission support;
- the flow currently saves setup and returns to Programs. Account conversion, real health permission requests, and a populated program library remain later vertical-slice increments.

This is an implementation checkpoint, not a release claim. Native migration execution, restart persistence, and small/large iOS/Android accessibility verification still require device runtimes.

The foundation quality gate currently passes lint, strict typecheck, formatting, Jest, Expo Doctor, high-severity production-dependency audit, and web export. `npm audit --omit=dev` still reports 14 moderate transitive advisories whose forced remediation would introduce breaking Expo changes; this is a release-hardening risk to revisit during dependency maintenance, not a reason to apply an unreviewed forced upgrade now.

## Active workout implementation checkpoint — 2026-09-13

The first active-workout increment replaces the preview at `app/workout.tsx` with a typed Barbell 30 set surface:

- native startup creates or resumes an in-progress session and reloads completed sets by stable IDs;
- completing a set calls the SQLite repository before the UI marks it done, preserving the idempotent completed-set/outbox transaction;
- the web preview keeps set state in memory and labels that limitation instead of claiming native durability;
- reps, optional load, duration, distance, RPE, and RIR fields have accessible labels; a timestamp-based rest timer recalculates after app backgrounding;
- finishing is disabled until all fixture sets are complete and then marks the local session complete before returning Home.
- the route accepts a typed workout ID for the Barbell 30 version, and the next session derives target overrides from the latest completed local workout without rewriting the program snapshot;
- Program Detail can open each of the three Barbell 30 workouts through that same route boundary.

This is not yet the full #276 release gate: network reachability detection, background sync execution, crash/restart device proof, correction workflow, substitutions, notes, cardio blocks, and VoiceOver/TalkBack end-to-end review remain outstanding.

## Cycle start implementation checkpoint — 2026-09-13

The next vertical-slice increment connects the selected Barbell 30 program to a real six-week cycle boundary:

- `createTrainingCycle` snapshots the selected `ProgramVersion` into six program-specific `CycleWeek` records, preserving the Week 6 meaning defined by that program;
- native SQLite migration 3 persists cycle status, current week, start time, and the serialized week snapshot;
- starting a cycle pauses any other active cycle for the guest user inside one transaction, preventing multiple active plans in the local profile;
- `app/program.tsx` provides a real Barbell 30 detail/start surface, and Home plus the active workout resolve the persisted active cycle rather than always using the demo cycle;
- the stable cycle and session identifiers establish the boundary needed for later progress aggregation and sync idempotency.

Web remains a preview surface without SQLite persistence. Native cycle migration/restart behavior and the full cross-platform accessibility pass remain device verification work.

## Local progress implementation checkpoint — 2026-09-13

The first progress read boundary now derives the scorecard from the same local records written by the active workout:

- migration 4 snapshots `workout_focus` on each workout session, preserving enough context to classify completed cardio duration without consulting a mutable template;
- `getCycleProgressSummary` joins local sessions and completed sets by stable IDs, maps only completed sessions into cycle review facts, and keeps logged-set count separate from workout adherence;
- `buildCycleProgressSummary` remains pure deterministic domain logic and exposes completion rate, training volume, cardio minutes, records, and logged-set count for the Progress surface;
- `buildNextSessionTargets` uses the latest completed set values plus the selected program strategy to produce per-exercise next targets; missing performance data holds the target rather than inventing a progression event;
- the Progress tab resolves the active persisted cycle and renders local facts, while the web target continues to show an explicitly non-persistent preview.

This checkpoint does not yet calculate the full personal-record set, reconcile sync outbox rows in the background, or provide the complete review narrative and next-cycle decision matrix. Those require additional domain events and later vertical-slice increments.

The next-session target surface is now covered for the Barbell 30 fixture. It is still a native-data path until a device-level workout completion and reload test can run.

## Cycle transition and review implementation checkpoint — 2026-09-14

The next #276/#277 vertical-slice increment closes the first deterministic cycle-lifecycle boundary:

- migration 6 snapshots `cycle_week` on each workout session so a later plan change cannot reclassify historical work into another week;
- completing the active Barbell 30 workout advances the persisted cycle only after the local database counts the completed sessions planned for the current week;
- the transition is idempotent at the cycle-week boundary, so a repeated finish action cannot advance the same cycle twice;
- Week 6 uses the program's declared `weekSixMeaning` and completes the cycle without imposing a universal deload or mandatory max test;
- the Review route derives its facts from local records and exposes explicit repeat/adjust paths; repeating creates a new local cycle snapshot while the completed cycle remains unchanged;
- Progress reads the latest cycle so a completed cycle can surface its review entry point, while the web target remains an honest non-persistent preview.

The two SQLite transactions currently separate workout completion from cycle advancement. A future reliability increment should combine those writes behind one repository operation before native crash/restart verification is considered complete. The full review still needs personal-record detail, cardio/mobility trend views, user feedback, change-program/build-new-cycle options, and native device verification.

## Coach safety boundary checkpoint — 2026-09-14

The first #278 increment adds `src/services/coachSafety.ts` without selecting a model or provider:

- deterministic red-flag routing handles urgent symptoms, professional-evaluation language, and medication/insulin requests before any coach generation;
- actionable `CoachProposal` changes are runtime-validated against an allowlist of fields and must carry explicit user confirmation;
- migration 7 stores pending proposals with user/cycle scope, and accepted/rejected decisions update the local record and enqueue one idempotent `coach-proposal` mutation;
- the safety classifier returns matched signals and an explainable response so the eventual UI can distinguish facts, safety routing, and ordinary training guidance;
- no credentials, network calls, health data, or program mutation were added; the existing `CoachGateway` remains the replaceable provider boundary.

The Coach tab now reads pending proposals for the active local cycle and records explicit decisions through `CoachProposalCard`. Provider adapters, structured context minimization, proposal application to a new program version, and the versioned evaluation set remain later #278 increments.

## Health integration boundary checkpoint — 2026-09-14

The first #279/#280 health increment defines `HealthProvider` and typed permission/sample contracts in `src/services/health.ts`:

- HealthKit and Health Connect remain replaceable platform adapters behind the same interface;
- the onboarding `not-now` choice resolves to no requested data types;
- the current `UnavailableHealthProvider` returns explicit unavailability and no fabricated samples;
- no health permission is requested during app startup, and no native health dependency or raw health data is sent to analytics.

Native permission flows, least-privilege read adapters, local sample deduplication, user-facing disclosure, and device verification remain release-gated work.

## Local privacy boundary checkpoint — 2026-09-14

`src/db/privacyRepository.ts` now provides two user-scoped local operations:

- `exportLocalUserData` returns a versioned JSON-ready envelope covering profiles, equipment, cycles, sessions, sets, user program snapshots, custom exercises, and Coach proposals;
- `deleteLocalUserData` removes pending sync mutations first, then dependent sets/sessions/cycles and user-owned program/exercise/proposal/profile records inside one transaction;
- Profile exposes native share-sheet export and a destructive-confirmation local-delete action, while web labels both controls as preview-only;
- the repository does not claim remote account deletion, request permissions, or upload an export; those actions require explicit account/backend and native file-sharing surfaces later.

## Exercise catalogue implementation checkpoint — 2026-09-14

The first #274 content increment establishes catalogue behavior without importing the archived application or unreviewed imagery:

- the taxonomy covers 23 equipment types from free weights, machines, cardio, bodyweight, accessories, and mobility;
- the first 50 foundational exercise records share the canonical schema, stable IDs, tracking types, tags, and review status;
- `searchExercises` searches names, aliases, movement patterns, muscles, and tags while optionally restricting results to the saved equipment profile;
- `findExerciseSubstitutions` ranks compatible candidates by movement pattern, shared primary muscles, and tags, with no AI or network dependency;
- the Exercise Library surface makes the draft/review boundary visible and does not present placeholder media as approved instruction.

The catalogue is not yet the 300+ launch set: content review, custom exercises, exercise detail, substitution selection, media production, and the remaining records are still required.

The catalogue surface now links each foundational record to an exercise-detail route with setup, instructions, technique cues, safety notes, visible review status, and deterministic equipment-aware substitution candidates. The detail route is still intentionally read-only until reviewed media and a user-owned substitution action are ready.

## Program library metadata checkpoint — 2026-09-14

The Programs surface now carries metadata for the planned 20-program launch library. Barbell 30 is the only published, startable version in this increment; the other 19 entries are explicitly `metadata-draft` until their workouts, progression rules, substitutions, safety review, and six-week versions are complete. This prevents a catalogue card from implying that a plan is ready when its executable program version does not yet exist.

## Custom builder implementation checkpoint — 2026-09-14

The first #275 editing surface now supports a safe user-owned draft path:

- `createProgramCopy` deep-clones a curated program version into new workout, exercise, and set IDs, records `ownerId`/`sourceProgramId`, and marks the copy as non-template draft data;
- builder operations are immutable and validate set counts and reorder completeness before returning a new version snapshot;
- `createCustomExercise` creates a draft, user-owned record with the same tracking and safety fields as curated exercises;
- `app/builder.tsx` exposes a small, reviewable UI for naming a copy, adding an accessory or custom movement, saving the draft locally, and starting a cycle from that private snapshot;
- canonical templates and existing completed-session records are never mutated by these operations.

The builder does not yet publish versions or support full drag-and-drop/superset/circuit editing. Those are intentionally separate increments. Active workout routing now resolves the stored user-owned snapshot when one exists; the editing surface still needs broader workout block controls.

## Sync outbox implementation checkpoint — 2026-09-13

The local/cloud handoff now has an explicit provider boundary without introducing a backend vendor:

- `saveWorkoutSession` and `saveCompletedSet` each enqueue an idempotency-keyed mutation in the same SQLite transaction as the local write;
- `getPendingSyncMutations` exposes stable creation order and parses the stored payload only at the sync boundary;
- `flushSyncOutbox` deletes only explicitly acknowledged rows, records rejected or unresolved rows for retry, and retains every mutation when the backend is unavailable;
- `BackendClient` remains the replaceable service contract, so network reachability, authentication, background scheduling, and a concrete backend can be added without changing domain calculations or workout logging.

No network call is made by the active workout, and no sync provider or credential is included. Background execution, conflict resolution, auth, and native offline/reconnect proof remain release gates.

## Sync coordinator checkpoint — 2026-09-14

`src/services/syncCoordinator.ts` adds the missing orchestration boundary around the outbox:

- an explicit offline status skips backend work and leaves the local outbox untouched;
- online or unknown connectivity delegates to the existing idempotent flush contract;
- callers receive separate `offline`, `empty`, `synced`, `partial`, and `failed` outcomes for UI/retry policy;
- connectivity, backend, and future background scheduling remain injectable rather than embedded in workout/domain logic.

The current app does not yet install a native connectivity listener or background task. Native reconnect, app-background execution, conflict resolution, and device fault testing remain release gates.
