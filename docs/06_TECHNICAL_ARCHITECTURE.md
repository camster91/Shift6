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

## Brand and icon boundary checkpoint — 2026-09-14

The first #271 asset increment now provides:

- an original S6 mark and app-icon SVG exploration under `assets/brand/`;
- `assets/asset-manifest.json` as the provenance, naming, and human-review handoff record;
- a semantic `Shift6Icon` registry so UI code does not depend directly on third-party glyph names;
- an explicit fallback status: Ionicons remain a temporary renderer until the Figma vector family, selected states, and production platform exports are reviewed.

This does not claim final brand approval, production app-icon raster exports, or approved exercise media. Exercise imagery remains human-technique-review required.

## Onboarding implementation checkpoint — 2026-09-13

The next #273 increment adds a real multi-step onboarding route at `app/onboarding.tsx` and keeps its decisions in the typed domain layer:

- goals, experience, equipment, schedule, session length, units, optional health preference, and Coach preferences are represented as an `OnboardingDraft`;
- `recommendPrograms` deterministically ranks compatible programs and explains goal, experience, schedule, duration, and equipment fit without AI or network access;
- native SQLite migration 2 persists a guest profile and replaceable equipment rows atomically; `getOnboardingProfile` reloads answers when the user edits setup;
- web remains an explicit preview surface and does not claim persistence or health permission support;
- the flow currently saves setup and returns to Programs. Account conversion, real health permission requests, and a populated program library remain later vertical-slice increments.

This is an implementation checkpoint, not a release claim. Native migration execution, restart persistence, and small/large iOS/Android accessibility verification still require device runtimes.

The local foundation gate passes lint, strict typecheck, formatting, Jest, asset validation, tracked-secret scanning, release-config validation, and web export. On 2026-09-14, `npm run doctor` reached 19/21 checks but its Expo schema and React Native Directory checks failed on DNS/network access (`ENOTFOUND exp.host`); `npm audit --omit=dev --audit-level=high` was likewise blocked by npm registry DNS. The last successful audit snapshot reported 14 moderate transitive advisories; rerun both network-backed checks in CI or a connected environment before release review.

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

Barbell 30's fixture now includes two optional cardio sessions with explicit time/distance tracking. Cycle weeks still count only the three required strength workouts, so cardio can enrich progress and be completed offline without making the core strength cycle impossible to finish when a user skips an optional session.

Home now refreshes its persisted cycle state on focus and marks completed workout IDs for the active week. Required strength and optional cardio schedule cards route to the matching snapshot workout; custom program copies are resolved by day when their cloned IDs differ from the template fixture.

## Exercise progress history checkpoint — 2026-09-14

The next #279 progress increment adds a deterministic exercise-history read boundary:

- migration 10 adds canonical `exercise_id` identity to completed sets; new writes persist it directly, while the progress read boundary resolves legacy null identities from the immutable program-version snapshot;
- `buildExerciseProgress` groups completed sets by session, calculates best load, best reps, volume, and a bounded Epley estimated 1RM without consulting AI or remote services;
- personal records are emitted only when a metric exceeds the previous completed session, with stable IDs derived from exercise, metric, and session;
- `getExerciseProgress` scopes history to the active cycle and selected exercise, while the Progress tab renders an accessible local strength-trend card with a text summary for screen readers;
- sessions with unsupported or missing load/repetition values remain valid history points but do not receive a fabricated estimated 1RM.

This is a first strength-history slice, not the complete Progress surface. Cardio, mobility, consistency comparisons, cycle-over-cycle trends, richer charting, and native device verification remain later work.

The Progress tab now derives a movement selector from the active program-version snapshot and local user exercise records. Rep/custom-tracked movements can be selected without changing the underlying deterministic history calculation; cardio-specific, mobility, and cycle-over-cycle trend models remain later boundaries.

Cycle-review aggregation now also joins local structured check-ins and canonical exercise history. Completed-session facts include reported effort, discomfort flags, and deterministic load/rep/estimated-1RM record IDs; malformed or missing legacy identity data is ignored rather than guessed. This keeps the Review route explainable and leaves richer cardio/mobility comparisons for a later increment.

## Cycle transition and review implementation checkpoint — 2026-09-14

The next #276/#277 vertical-slice increment closes the first deterministic cycle-lifecycle boundary:

- migration 6 snapshots `cycle_week` on each workout session so a later plan change cannot reclassify historical work into another week;
- completing the active Barbell 30 workout advances the persisted cycle only after the local database counts the completed sessions planned for the current week;
- the transition is idempotent at the cycle-week boundary, so a repeated finish action cannot advance the same cycle twice;
- Week 6 uses the program's declared `weekSixMeaning` and completes the cycle without imposing a universal deload or mandatory max test;
- the Review route derives its facts from local records and exposes explicit repeat/adjust paths; repeating creates a new private program/version namespace and local cycle snapshot while the completed cycle remains unchanged;
- Progress reads the latest cycle so a completed cycle can surface its review entry point, while the web target remains an honest non-persistent preview.

Program Detail, Builder, and Repeat cycle starts now use timestamp-derived guest program/version/cycle IDs, so starting the same program again creates a new copy-on-write snapshot instead of overwriting a prior program version or cycle row. The active-cycle pause behavior remains scoped to the user, and completed workout/history rows are not rewritten.

Workout completion, cycle advancement, both sync mutations, and draft removal now run behind one repository transaction, reducing the risk that a crash leaves a completed session on a stale cycle week. The full review still needs personal-record detail, cardio/mobility trend views, user feedback, change-program/build-new-cycle options, and native device verification.

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

## Health normalization checkpoint — 2026-09-14

The provider-independent domain boundary now lives in `src/domain/health.ts`:

- `normalizeHealthSummaries` validates finite non-negative values, non-empty source identifiers/units, valid time ranges, and canonical ISO timestamps;
- duplicate samples are collapsed by provider source plus stable sample ID with deterministic output ordering;
- `buildDailyHealthTrends` groups by UTC start day and unit without performing implicit unit conversion;
- aggregation is explicit: steps, workouts, and sleep duration sum; heart-rate metrics average; weight uses the latest sample for the day;
- the `HealthProvider` contract re-exports these normalized types, so platform adapters cannot introduce provider-specific shapes into domain consumers.

This remains a data-contract and deterministic read-layer increment. It does not request permissions, persist imported health samples, install HealthKit/Health Connect adapters, or send raw health data to analytics.

## Local health persistence checkpoint — 2026-09-14

Migration 12 adds a user-scoped `health_summaries` table and `src/db/healthRepository.ts`:

- imported rows are normalized before persistence and keyed by `(user_id, source, id)` for retry-safe upserts;
- health data is intentionally not written to `sync_outbox` in this increment;
- reads support type/date filtering and reuse the domain daily-trend aggregator;
- local export schema version 3 includes health summaries, and local deletion removes them transactionally;
- guest account adoption transfers health-summary ownership with the rest of the local profile, while destination conflicts still fail closed.

Native device permission verification, remote health policy, disconnect controls, and platform
release declarations remain open.

The new `/health` settings route now makes the optional choice and proposed data types visible,
loads the saved preference locally on native builds, and explicitly reports that the current
connector is unavailable. Profile links to this route; no permission request is triggered and web
preview remains non-persistent.

## Local privacy boundary checkpoint — 2026-09-14

`src/db/privacyRepository.ts` now provides two user-scoped local operations:

- `exportLocalUserData` returns a versioned JSON-ready envelope covering profiles, equipment, cycles, sessions, sets, user program snapshots, custom exercises, and Coach proposals;
- `deleteLocalUserData` removes pending sync mutations first, then dependent sets/sessions/cycles and user-owned program/exercise/proposal/profile records inside one transaction;
- Profile exposes native share-sheet export and a destructive-confirmation local-delete action, while web labels both controls as preview-only;
- the repository does not claim remote account deletion, request permissions, or upload an export; those actions require explicit account/backend and native file-sharing surfaces later.

`src/services/analytics.ts` now wraps future transports with an event/property allowlist. It preserves aggregate identifiers and counts needed for product health, but drops unknown fields and free-text workout/health notes before any event leaves the app.

## Exercise catalogue implementation checkpoint — 2026-09-14

The first #274 content increment establishes catalogue behavior without importing the archived application or unreviewed imagery:

- the taxonomy covers 23 equipment types from free weights, machines, cardio, bodyweight, accessories, and mobility;
- the first 50 foundational exercise records share the canonical schema, stable IDs, tracking types, tags, and review status;
- `searchExercises` searches names, aliases, movement patterns, muscles, and tags while optionally restricting results to the saved equipment profile;
- `findExerciseSubstitutions` ranks compatible candidates by movement pattern, shared primary muscles, and tags, with no AI or network dependency;
- the Exercise Library surface makes the draft/review boundary visible and does not present placeholder media as approved instruction.

The catalogue is not yet the 300+ launch set: content review, custom exercises, exercise detail, substitution selection, media production, and the remaining records are still required.

The catalogue surface now links each foundational record to an exercise-detail route with setup, instructions, technique cues, safety notes, visible review status, and deterministic equipment-aware substitution candidates. The detail route is still intentionally read-only until reviewed media and a user-owned substitution action are ready.

The active workout now reads user-owned custom exercise records from SQLite and resolves their tracking type before rendering fields. Unknown legacy IDs fall back from the stored set target to a conservative reps/time/distance shape; custom names and tracking metadata therefore do not require a network request or a second hardcoded catalogue.

Onboarding equipment selection now renders the full 23-item canonical equipment taxonomy instead of a demo-only subset. The saved profile still stores stable equipment IDs, so recommendation and substitution logic consume the same records as the catalogue and active workout surfaces.

The exercise detail route now reads that same saved equipment profile before ranking substitutions. Web preview keeps the local demo profile fallback; native SQLite remains the source for the user's actual setup. This keeps search, detail, builder, and active-workout substitution surfaces on one deterministic equipment boundary.

Profile now renders selected equipment from the full canonical taxonomy rather than the legacy demo subset, with a compact overflow count for larger setups. The avatar also derives accessible identity initials from the saved display name instead of a fixed fixture letter.

`src/domain/contentReadiness.ts` now separates structural cycle readiness from public publication readiness. A complete draft record can support development and local fixture workouts, but draft technique/media status remains a publication warning; missing IDs, invalid six-week phases, empty workouts, retired exercises, and incomplete safety fields are blockers.

## Program library metadata checkpoint — 2026-09-14

The Programs surface now carries metadata for the planned 20-program launch library. Barbell 30 is the only published, startable version in this increment; the other 19 entries are explicitly `metadata-draft` until their workouts, progression rules, substitutions, safety review, and six-week versions are complete. This prevents a catalogue card from implying that a plan is ready when its executable program version does not yet exist.

The Programs tab now consumes the persisted onboarding profile when native SQLite is available and falls back to the local demo profile on the web preview. It uses the deterministic `recommendPrograms` domain function to rank compatible metadata, exposes real day/session-length filters, and keeps non-published entries visibly non-startable. Recommendation copy is derived from the same goals, experience, schedule, and equipment inputs used by the domain ranking; no network or AI call is involved.

## Custom builder implementation checkpoint — 2026-09-14

The first #275 editing surface now supports a safe user-owned draft path:

- `createProgramCopy` deep-clones a curated program version into new workout, exercise, and set IDs, records `ownerId`/`sourceProgramId`, and marks the copy as non-template draft data;
- builder operations are immutable and validate set counts and reorder completeness before returning a new version snapshot;
- `createCustomExercise` creates a draft, user-owned record with the same tracking and safety fields as curated exercises;
- `app/builder.tsx` exposes a small, reviewable UI for naming a copy, adding an accessory or custom movement, saving the draft locally, and starting a cycle from that private snapshot;
- canonical templates and existing completed-session records are never mutated by these operations.

The builder does not yet publish versions or support full drag-and-drop/superset/circuit editing. Those are intentionally separate increments. Active workout routing now resolves the stored user-owned snapshot when one exists; the editing surface still needs broader workout block controls.

The builder can now append a user-named optional workout with a stable ID, selected day, mixed focus, and an empty exercise list. Empty sessions expose a starter Front plank action, so the new workout is immediately editable without changing the required `daysPerWeek` or cycle-advancement count. Required-day creation remains gated behind an explicit program-frequency update.

## Custom builder controls checkpoint — 2026-09-14

The next #275 increment turns the exercise list into an editable, accessible surface:

- up/down controls reorder only the private version and renumber exercise order through the domain operation;
- remove controls delete an exercise from the private workout copy without touching the canonical template or completed history;
- set-count controls support 1–20 sets, preserve existing set IDs/targets, and clone the last target/rest definition for added sets;
- custom exercises are tracked by stable, unique IDs in the draft UI and all saved user-owned custom records are persisted with the program version;
- the domain tests cover immutable set-count changes and invalid counts.

Drag-and-drop, supersets/circuits, target editing, and warm-up/cooldown/cardio block authoring remain separate builder increments.

The builder now also exposes deterministic substitution choices for catalogue-backed exercises. Candidates are ranked from the equipment-aware domain service and applying one changes only the draft's exercise reference while preserving the workout-exercise identity and set prescription. Active-workout substitution remains a separate boundary until one-time versus future-session history semantics are explicit.

The builder can now search and append a catalogue exercise to any private workout. Default targets are selected by the typed exercise tracking mode (conservative reps, time, distance, or combined cardio target) and remain editable through the existing target boundary; the picker does not publish draft content or bypass equipment/review status.

Programs now exposes a separate blank-builder entry point. It creates an empty private six-week version, treats newly added workouts as required for cycle advancement, and refuses to start until at least one required workout exists. Template-copy editing retains its optional-workout behavior.

Builder and active-workout substitutions, plus builder target labels, now read the persisted onboarding equipment/unit profile on native builds, with the typed demo profile retained only for web preview. The builder therefore shares the same user setup boundary as Programs, Library, exercise detail, Profile, and active workout.

Cycle Review now passes its persisted source version into Builder for private adjustment. Native Builder loads that snapshot before rendering, then creates a new copy/version namespace; a completed custom cycle therefore stays continuous into its next-cycle edit instead of silently reverting to Barbell 30. A missing source snapshot now blocks the editor behind an error state with retry rather than falling back to unrelated demo content.

Each builder mount now allocates a timestamped user-owned program/version namespace. A later builder visit cannot upsert the snapshot referenced by an earlier completed cycle, and custom exercise IDs are scoped to that namespace. This preserves the immutable-history boundary even though the current draft editor is intentionally session-scoped.

Active-workout substitution now follows the same copy-on-write rule. The replacement is written to a new private `ProgramVersion` ID, the active cycle points to that revision, and an unfinished session's version pointer is updated and re-queued. Workout/exercise/set identities are preserved inside the revision, while completed sessions continue resolving against the version they recorded.

Next-session target lookup is scoped to the active program-version ID. A revision therefore starts with a conservative prescription when there is no same-version evidence; it cannot carry a previous version's completed set across a changed movement through a legacy or missing exercise identity.

## Progress history metric checkpoint — 2026-09-14

Per-exercise progress history now preserves the completed set's timed and distance values as well as load and reps. The deterministic point builder records best duration and distance values and emits monotonic personal-record events for those metrics; the SQLite repository selects and maps the durable columns while retaining legacy exercise-identity resolution. Progress movement choices now include strength, cardio, timed, and custom movements, and the accessible history card selects a metric from the exercise's typed tracking mode without fabricating a strength estimate. Duration and distance formatting remains presentation-only; progression calculations stay in the domain layer.

The Progress history card now exposes the three most recent personal-record events from that same typed history, using metric-specific labels for load, reps, duration, distance, and estimated 1RM. It does not recalculate or infer records in the screen layer.

Cycle advancement now counts distinct completed required workout IDs within the persisted week. Repeating a single workout cannot satisfy the required schedule by itself, and optional cardio/workout IDs remain excluded from the advancement threshold.

The quality workflow now runs on every branch push as well as pull requests, keeping feature-branch checkpoints covered by formatting, lint, typecheck, Expo Doctor, dependency audit, tests, and web export before review.

The foundation CI gate now also runs `npm run check:secrets`. It scans only Git-tracked files for
high-confidence private-key and provider-token formats, leaving generated output and dependencies
out of scope. It is a release hygiene check, not a substitute for secret rotation or a hosted
repository secret scanner.

`npm run validate:release-config` now checks the stable Expo identifiers, required native plugins,
static web output, EAS development/preview/production profiles, and public environment keys. It
does not attempt a signed build or require EAS credentials; native build and store verification
remain explicit release gates.

## Builder target configuration checkpoint — 2026-09-14

The builder now exposes a tracking-aware target editor for each exercise. Reps, load, RPE, and RIR are available for rep-based movements; time and distance fields are shown for timed/cardio movements. The immutable `setWorkoutExerciseTarget` operation applies a cloned prescription to all sets in that exercise while preserving set IDs and the source version. This is an intentionally compact first target boundary: per-set overrides, rest editing, sections, supersets/circuits, warm-ups, cooldowns, and blank-workout creation remain separate increments.

## Sync outbox implementation checkpoint — 2026-09-13

The local/cloud handoff now has an explicit provider boundary without introducing a backend vendor:

- `saveWorkoutSession` and `saveCompletedSet` each enqueue an idempotency-keyed mutation in the same SQLite transaction as the local write;
- `getPendingSyncMutations` exposes stable creation order and parses the stored payload only at the sync boundary;
- `flushSyncOutbox` deletes only explicitly acknowledged rows, records rejected or unresolved rows for retry, and retains every mutation when the backend is unavailable;
- `BackendClient` remains the replaceable service contract, so network reachability, authentication, background scheduling, and a concrete backend can be added without changing domain calculations or workout logging.

No network call is made by the active workout, and no sync provider or credential is included. Background execution, conflict resolution, auth, and native offline/reconnect proof remain release gates.

`src/services/backend.ts` now provides the #272 transport skeleton: `HttpBackendClient` owns only the authenticated `/v1/sync` request and validates the response shape, while `UnavailableBackendClient` fails explicitly when auth/backend setup is absent. The token is supplied by an injected auth boundary; no credential is read from environment variables or bundled into the app. The adapter is not instantiated by the current guest shell, so local workout completion still makes no network request.

## Sync coordinator checkpoint — 2026-09-14

`src/services/syncCoordinator.ts` adds the missing orchestration boundary around the outbox:

- an explicit offline status skips backend work and leaves the local outbox untouched;
- online or unknown connectivity delegates to the existing idempotent flush contract;
- callers receive separate `offline`, `empty`, `synced`, `partial`, and `failed` outcomes for UI/retry policy;
- contradictory backend acknowledgement/rejection responses are treated as rejected and remain queued rather than being deleted;
- connectivity, backend, and future background scheduling remain injectable rather than embedded in workout/domain logic.

The current app does not yet install a native connectivity listener or background task. Native reconnect, app-background execution, conflict resolution, and device fault testing remain release gates.

`expo-network` now supplies the runtime connectivity adapter. The active workout observes online/offline changes and renders the accessible `OfflineBanner` without blocking local logging; the persisted session records whether it was started offline. A connectivity change still does not imply successful cloud sync: the outbox coordinator and backend/auth boundary remain responsible for that separately.

## Workout pause and correction checkpoint — 2026-09-14

The local workout boundary now includes migration 8 and a `workout_drafts` table. Active workout input is debounced into the local database, the latest in-progress session for the cycle/week/workout is reused when the route is reopened, and a new attempt receives a new stable session ID after a previous attempt is complete. Completed set values are rehydrated before the screen becomes interactive. A pause/back action flushes the draft before leaving the route. Completed sets can be corrected in place; the stable set ID and idempotency key are retained while the pending outbox payload is replaced.

The database migration and repository tests cover the draft upsert, correction outbox update, and privacy deletion path. Native kill-and-reopen proof remains a device QA gate, and the web target continues to be a non-persistent preview.

The active workout now offers deterministic catalogue substitutions before the first set of a movement is completed. A selected replacement updates the user-owned program snapshot (and queues that version when native SQLite is available), while completed-set history remains untouched. Once a set exists for that movement, the action is blocked with an explanatory message; one-time versus future-session replacement semantics are therefore explicit rather than silently reclassifying history.

The active workout also flushes its current draft to SQLite when the app becomes inactive or enters the background, in addition to the short debounce used during editing. This narrows the suspension-loss window while keeping set completion and final workout completion on their existing atomic repository paths.

The active workout now maps its explicit readiness choice into the deterministic next-session target boundary. `ready` uses the normal rule, while `limited` and `rest` hold progression through the existing readiness evaluator; the UI does not silently rewrite the saved program.

## Workout session identity checkpoint — 2026-09-14

`getInProgressWorkoutSession` now resolves the latest unfinished session by cycle, week, and workout before the active route creates a new attempt. This preserves pause/reopen recovery across app restarts while allowing a completed workout to be repeated as a distinct session. The lookup and timestamp-derived attempt ID remain local-only; completed-set idempotency keys continue to be scoped to the resolved session, preventing duplicate set writes during retries.

## Post-workout summary checkpoint — 2026-09-14

Migration 9 adds a structured, user-scoped `workout_check_ins` record. The completed workout now routes to `app/summary.tsx`, which reads the local session and completed sets, resolves the workout from the session's stored program-version snapshot, presents duration/set/volume facts, captures optional energy/soreness/effort/discomfort values, and queues the check-in through an idempotent outbox mutation. Notes stay local to the workout data boundary and are not accepted by the analytics allowlist. The summary explicitly labels web as preview-only when no durable database is available.

The Review surface now exposes the deterministic cycle record in decision-ready language: completion/adherence, logged sets, volume, progression events, reported effort, cardio minutes, and discomfort flags. A completed cycle offers repeat, private-copy adjustment, or program-library selection; no AI-generated action is applied automatically.

## Home snapshot scheduling checkpoint — 2026-09-14

The Home surface now keeps its presentation tied to the local source of truth when a native profile and active cycle exist:

- the saved onboarding display name is used for the greeting;
- the active cycle's stored `ProgramVersion` snapshot supplies today's workout and the seven-day schedule;
- schedule entries reflect completed local workouts and the device's current weekday while preserving recovery/rest fallback labels for days without a workout;
- the web preview continues to use typed Barbell 30 fixtures because it intentionally has no durable SQLite provider.

The schedule selector is pure domain logic with deterministic tests. Calendar-driven reminders, user-selected training weekdays, and multi-workout-per-day presentation remain later product surfaces.

The native Home boundary also treats a missing local onboarding profile as a first-run state and routes to onboarding before showing the demo shell. The web provider deliberately has no database and therefore remains a navigable preview surface rather than pretending to implement first-install persistence.

Profile saves now queue the complete user-confirmed onboarding snapshot in the same SQLite transaction as the profile and equipment rows. The mutation uses a stable user-scoped idempotency key and replaces its pending payload on later edits, so offline setup changes remain local-first and retry-safe without creating duplicate profile mutations.

The private builder now exposes immutable workout metadata edits (name, weekday, focus, duration), shared rest-period configuration, and bounded exercise notes. These fields stay inside the user-owned `ProgramVersion` snapshot; the public template and completed session history remain unchanged.

Workout exercises can also be assigned to the typed warm-up, working, cooldown, cardio, or mobility sections. Section changes preserve the exercise/set identities and remain private to the edited version; they do not infer or rewrite completed history.

Superset and circuit grouping now use explicit `groupType` plus a stable `supersetGroupId` on each selected workout exercise. The builder offers pairwise superset grouping, whole-workout circuit grouping, and ungrouping; the domain validates membership and requires at least two exercises before writing a group.

Workout preflight now records optional readiness context (`ready`, `limited`, or `rest`) on the in-progress session, alongside a deterministic check against the user's saved equipment profile. The selection is persisted and re-queued through the session mutation boundary; it does not block local logging, infer medical status, or alter the program.

Starting the curated Barbell 30 template now creates a uniquely identified private program/version snapshot (with the public template recorded as `sourceProgramId`) before persisting the cycle. This keeps the public fixture/template separate from user edits and gives later cycle history a stable version reference from the moment the cycle begins.

## Recovery-context review checkpoint — 2026-09-14

The cycle review read model now carries the optional pre-workout readiness label (`ready`, `limited`, or `rest`) from persisted workout sessions into deterministic cycle facts. The review surface presents counts as training context, not as a medical or composite readiness score. Sessions without a selection remain unclassified, and the existing conservative next-target rules remain the only progression authority.

The Health Connections route now reads the same normalized local summaries through `getDailyHealthTrends` and presents the latest seven persisted daily points after an explicit import. Empty, unavailable, and web-preview states remain explicit; this UI does not fabricate samples or send health data to sync or analytics.

## Auth and service composition checkpoint — 2026-09-14

The #272 foundation now has an explicit `AuthProvider`/`AuthSession` contract and an `UnavailableAuthProvider` for the guest/unconfigured state. `createAppServices` composes that provider with the vendor-neutral HTTP sync transport and the replaceable Expo connectivity adapter. The backend receives access tokens only through the injected auth boundary; no auth vendor, credential, sign-in UI, or network request was added to the guest shell. This keeps account conversion and backend selection as isolated future adapters while preserving local-first workout behavior.

`SecureAuthProvider` now stores the validated session envelope through Expo SecureStore, removes malformed or expired sessions, and exposes sign-out without leaking tokens to domain or analytics code. The default sync runtime uses this secure provider on native builds but remains signed out until a future auth adapter explicitly establishes a session; web preview treats secure storage as unavailable.

`migrateLocalUserToAccount` provides the later account-conversion seam. It adopts guest-owned profile, equipment, program, exercise, cycle, proposal, and queued-mutation ownership in one transaction after validating that the destination is empty; malformed queued payloads and implicit account merges fail closed. Workout/session/set IDs remain unchanged, preserving local history and idempotency.

Profile now surfaces the sync runtime's offline, syncing, partial, and failed states through the shared accessible banner. A guest or web-preview state remains quiet; no banner claims cloud success when no authenticated backend session exists.

## Coach approval application checkpoint — 2026-09-14

Coach proposals now have a pure, fail-closed application boundary for precisely scoped target, exercise-substitution, and set-count changes. Applying a proposal requires a validated pending proposal and produces copy-on-write program data; ambiguous movement identity, unsupported schedule/program changes, invalid numeric values, and unsafe effort ranges are rejected without mutating the source. The Coach surface records approval together with a new private program-version revision, active-cycle pointer, and proposal/program/cycle outbox mutations in one SQLite transaction. Rejection remains a local decision with no plan mutation. A provider or account is still not connected.

Approval now also re-reads the persisted active cycle inside that transaction and refuses a stale proposal when the cycle is missing, no longer active, owned by another user, or already points at a different program version. The screen-level context check remains a fast failure; the repository check is the authoritative race-safety boundary.

## Cycle comparison checkpoint — 2026-09-14

Progress now resolves the immediately prior local cycle by timestamp and stable ID, derives its summary with the same deterministic fact builder, and presents cycle-over-cycle deltas for completed workouts, adherence, logged sets, training volume, cardio minutes, and personal records. The UI labels when the saved program version changed so aggregate comparisons are not presented as movement-equivalent evidence; movement history remains scoped to canonical exercise identities within the selected cycle.

## User exercise catalogue checkpoint — 2026-09-14

The Exercise Library and detail route now merge the foundational catalogue with user-owned custom exercise records loaded from SQLite. The library refreshes on focus so a custom movement created in the builder becomes discoverable, searchable, and equipment-filterable without duplicating catalogue logic. Custom records are labelled private and remain distinct from public technique/media review status; substitutions can use the merged local set while never implying that draft content has passed human review.

## Authenticated sync runtime checkpoint — 2026-09-14

`SyncRuntimeProvider` now centralizes foreground, app-resume, and connectivity-reconnect sync attempts behind `runAuthenticatedSync`. It reads the injected auth session before invoking the outbox coordinator, so the default guest shell leaves queued mutations untouched and makes no backend request. Runtime state distinguishes idle, offline, syncing, synced, partial, and failed outcomes for future status UI. A native background task, token refresh, conflict resolution, concrete backend, and device fault proof remain release-gated work.

Runtime triggers now pass through a single-flight guard in `src/services/syncRuntime.ts`. A reconnect, foreground transition, or manual retry arriving during an existing attempt reuses that promise; a later trigger can retry after completion or failure. This prevents overlapping outbox flushes without changing the underlying idempotency contract.

## Active workout presentation checkpoint — 2026-09-14

The active workout now renders the private snapshot's section label, superset/circuit grouping cue, and bounded exercise note next to the same set controls that persist locally. Custom exercises are resolved from the merged user catalogue for both names and substitution ranking. These are read-only workout cues; set identity, correction, rest timing, and copy-on-write history boundaries are unchanged.

## Offline Coach explainer checkpoint — 2026-09-14

`src/services/localCoach.ts` provides a deterministic, provider-free explainer for the guest shell. It answers workout, weekly-review, cycle-review, shortening, and substitution prompts from a bounded `CoachContext`; it reuses the deterministic safety classifier and returns a safety route before training guidance for red-flag prompts. It cannot create or mutate a plan. A provider-backed `CoachGateway`, server-side model routing, conversation persistence, and structured proposal generation remain separate #278 work and are not implied by this offline fallback.

Cycle facts now also include completed training days and the number of active cycle weeks represented by completed sessions. Progress and Review surface these as consistency context without calculating a punitive streak or inferring missed-workout intent.

Active workout effort capture now renders RPE/RIR fields when the saved target requests them. Values are optional but validated locally (RPE 1–10, RIR 0–10) before a completed set is written, so the RPE/RIR progression strategy can consume actual user input without weakening the local-first write boundary.

## Notification preferences checkpoint — 2026-09-14

The notification boundary now includes a user-scoped SQLite preference row for workout reminders, rest-timer cues, weekly review, cycle review, and Coach messages. Preferences default to off, save atomically with a replaceable `notification-preference` outbox mutation, appear in local export/delete, and transfer with the guest identity adoption path. The settings route uses `expo-notifications` only for native permission status/request handling; web preview explicitly reports delivery as unavailable. Scheduling policy, notification deep links, remote push credentials, and background delivery remain separate #280/#281 work and are not implied by these settings.

## Schedule preference checkpoint — 2026-09-14

Onboarding now records a user's preferred training window (`morning`, `afternoon`, or `evening`) in the durable profile and profile sync payload. Existing profiles migrate safely to the conservative morning default, and Profile surfaces the saved choice. This is a coarse preference rather than an exact alarm time; reminder scheduling must still use an explicit local schedule, permission state, and platform delivery adapter.

## Local workout reminder scheduling checkpoint — 2026-09-14

The notification boundary now reconciles a bounded seven-day set of one-shot workout reminders from the active cycle snapshot and the user's preferred training window. `src/domain/notificationSchedule.ts` owns deterministic date selection, stable identifiers, workout deep-link payloads, and cycle/version matching; `src/services/notificationScheduler.ts` cancels only SHIFT6-managed reminders before scheduling the replacement set. The native `ExpoNotificationProvider` now owns local scheduling, foreground presentation policy, and permission-gated delivery while the web/unavailable adapter remains explicit.

The root notification runtime refreshes on native database availability and app foreground transitions, and the settings save path refreshes immediately after a preference change. It also validates SHIFT6-owned notification responses, including a cold-start response, before routing a workout tap back to the active workout surface. Reminders remain local-only and one-shot; remote push, exact user-selected alarm times, weekly/cycle review delivery, background task guarantees, and native device verification remain separate release-gated work.

The active workout now treats rest-timer delivery as a best-effort local side effect after the completed set transaction succeeds. A single stable session cue is cancelled/replaced as sets progress and is cancelled when the workout is paused or leaves the route. Permission denial, unavailable delivery, or scheduling failure cannot prevent the local set write or the in-app timer.

## Cycle dashboard checkpoint — 2026-09-14

`app/cycle.tsx` is the first dedicated signature-cycle surface. It reads the active `TrainingCycle` and immutable `ProgramVersion` snapshot from local SQLite on native builds, derives the current week's required-workout completion and seven-day schedule from local history, and presents all six week states through the shared `SixWeekIndicator`. Workout links route to the same active logging surface, while the week-six meaning is read from the program's deterministic cycle model. The web target remains a typed fixture preview; calendar rescheduling and multi-workout date planning remain separate work.

The #271 asset boundary now has a dependency-free `npm run validate:assets` check. It validates manifest schema/source-of-truth, unique family IDs, explicit review gates, safe repository-relative paths, referenced implementation files, and basic SVG roots/viewBoxes before CI proceeds. It does not mark an asset approved; Figma review, provenance, accessibility, technique review, and store-size validation remain human gates.

## Native health adapter checkpoint — 2026-09-14

The first native #279/#280 connector increment now implements the existing `HealthProvider` contract
without leaking platform types into the domain:

- `src/services/platformHealthProvider.ios.ts` reads HealthKit steps, workouts, heart rate, resting heart rate, sleep duration, and body mass after an explicit permission request;
- `src/services/platformHealthProvider.android.ts` reads the corresponding Health Connect records and maps them into the same normalized `HealthSummary` shape;
- `src/services/healthSync.ts` requests access, reads only the granted types, normalizes/deduplicates summaries, and persists them through the user-scoped local repository in that order;
- HealthKit is configured with a share-only usage description, no update permission, and no background-delivery entitlement; Android declares only the six corresponding read permissions and uses the documented Health Connect SDK levels;
- the `/health` route provides an explicit Connect and import action, keeps the workout experience independent, and reports unavailable, denied, failed, and imported states accessibly;
- Jest maps the native modules to minimal test doubles because this checkout does not contain a native binary; web continues to resolve the unavailable provider.

This is a source/configuration increment, not native device proof. A rebuilt iOS custom development client, an Android build with Health Connect available, real permission-denial/revocation tests, privacy review, and App Store/Google Play health declarations remain release gates. Imported health summaries remain local-only and are not added to the sync outbox.

## Health disconnect and local removal checkpoint — 2026-09-14

The health settings surface now implements the local lifecycle controls required by the screen
specification:

- `updateHealthConnectionPreference` changes the saved preference and replaces the profile outbox
  snapshot inside one SQLite transaction, so a later sync cannot restore a stale connected state;
- Disconnecting stops future SHIFT6 requests/imports but deliberately does not claim to revoke
  Apple Health or Health Connect permission, which must be verified and controlled through the
  platform settings surface;
- `deleteHealthSummaries` is a separate, confirmed local deletion action that removes only the
  normalized summaries stored by SHIFT6 and leaves the source health platform unchanged;
- no health payload enters analytics, the workout outbox, or remote storage through this control.

This closes the local disconnect/data-control boundary. Native permission-revocation behavior,
account-scoped remote deletion, and store privacy declarations remain release gates.

## Active workout notes checkpoint — 2026-09-14

Migration 18 adds an optional, bounded `workout_sessions.note` field. The active workout saves the
note locally with a debounced update and flushes it on background, pause, and completion, replacing
the same idempotent workout-session outbox payload. The summary reads the saved note from the
session record, and notes remain inside the existing local export/delete boundary without entering
analytics. The web preview exposes the field but correctly labels persistence as unavailable.

## Provider-backed Coach boundary checkpoint — 2026-09-14

`src/services/coach.ts` now provides a vendor-neutral HTTP adapter for `/v1/coach/message` and `/v1/coach/proposal`, reusing the injected auth token and a bounded allowlist of structured facts. Message responses are size/type validated and unsafe generated text is rerouted through the deterministic safety classifier. Proposal responses must be pending, actionable, explicitly user-confirmed, and valid under the existing Coach schema before they can reach the local approval repository. The Coach tab falls back to the deterministic offline explainer when the provider, auth session, network, or backend is unavailable; no provider credential or automatic plan mutation was added.

## Cycle reflection checkpoint — 2026-09-14

The end-of-cycle review now has a small persisted feedback boundary:

- migration 15 creates one user-scoped `cycle_reviews` row per cycle with an optional 1–5 rating, next-block focus, and bounded free-text note;
- `cycleReviewRepository.ts` upserts the reflection and queues a stable `cycle-review` outbox mutation, so edits replace the pending payload rather than creating duplicates;
- the Review route reloads and saves the reflection, records the user's explicit repeat/adjust/change-program choice when those paths are used, and leaves derived facts and program snapshots unchanged;
- privacy export/delete and guest-to-account adoption include the new row and its queued mutation.

Reflection data is local-first and remains optional. Native migration execution and end-of-cycle device QA remain open verification gates.

## Privacy-safe analytics checkpoint — 2026-09-14

The app-service composition now exposes an injected `AnalyticsClient` with a no-op default, so
instrumentation does not add a vendor, credential, network dependency, or guest-shell side effect.
`PrivacySafeAnalyticsClient` sanitizes every event at the transport boundary using a typed event
name/property allowlist and rejects non-finite numbers. The initial routes emit the documented
six-week funnel milestones (`onboarding_started`, `onboarding_completed`, `program_started`,
`workout_started`, `workout_completed`, `week_2_reached`, `cycle_completed`, and
`next_cycle_started`) plus health-connection, exercise-substitution, custom-program, and Coach
proposal-display/approval events. Free-text notes, coach text, raw health samples, email, and
location are not accepted by the allowlist. A concrete crash/analytics provider, retention policy
implementation, and production observability backend remain release-gated work.

## Sync conflict checkpoint — 2026-09-14

The sync result contract now distinguishes typed `version-conflict`, `ownership-conflict`, and
`validation-conflict` outcomes from ordinary rejected or failed mutations. The outbox retains
conflicted rows, never deletes an ID reported as both acknowledged and conflicted, and records a
safe review-required error for retry/inspection. Coordinator/runtime state exposes `conflict`, and
Profile renders an accessible “Sync needs review” banner so a future-plan collision is not hidden
as a successful sync. Conflict resolution UI and server-side version policy remain separate work;
the mobile client does not auto-merge or auto-overwrite user plans.

## Complete review-choice checkpoint — 2026-09-14

The Review route now exposes all six cycle outcomes already represented by the typed domain model:
repeat, progress via a private progression copy, adjust, change exercises via a private copy,
change program, and build a new program from a blank draft. Each non-repeat path persists the
user's explicit `nextAction` before navigation; the builder receives a source version only for
copy-based paths and never mutates the completed cycle snapshot. The progress-copy label is
intentionally honest: automatic cross-cycle load carryover remains a separate deterministic rule
to design and test.

The deterministic cycle suite now also walks a complete six-week Barbell 30 sequence, asserting
that each week completes exactly once, the next current week is selected in order, and Week 6
finishes the cycle without a universal deload or max-test assumption.

## Versioned progression-rule checkpoint — 2026-09-14

`src/domain/progressionRules.ts` now provides the first typed deterministic rule catalogue. The
Barbell 30 `ProgramVersion` rule ID resolves to unit-aware load increments and the existing
time/distance increments; active workout and Progress callers pass the version's rule IDs into
`buildNextSessionTargets`. Missing or not-yet-reviewed rules use conservative deterministic
defaults, while the selected strategy and all safety/readiness gates remain owned by
`progression.ts`. This keeps progression calculations independent of AI and makes future program
versions able to change rules without rewriting completed history.

## Executable program catalogue checkpoint — 2026-09-14

`ProgramCatalogueEntry` now optionally carries an executable `ProgramVersion`. The Program Detail
route resolves and snapshots that version through the same copy-on-write path, rather than checking
for the Barbell 30 ID in the screen. The catalogue still exposes only Barbell 30 as startable; this
boundary makes future reviewed versions additive and keeps metadata-only entries honest.

## Equipment manager checkpoint — 2026-09-14

`app/equipment.tsx` provides a searchable, accessible equipment inventory editor from Profile. It
loads the persisted profile, updates only the user-owned equipment IDs, and saves through the
existing atomic profile/equipment/outbox repository. Web remains an explicit non-persistent
preview. Programs and substitution ranking continue to consume the same profile boundary rather
than maintaining a second equipment state.

## Sync review surface checkpoint — 2026-09-14

`getPendingSyncIssues` exposes only local outbox metadata and sanitized issue classification, not
mutation payloads. The Profile conflict banner now links to `app/sync-review.tsx`, which explains
that local plan data remains safe and offers an explicit retry. The route deliberately has no
keep-local/keep-server default: a real resolution action still requires a backend version policy
and a user-visible diff, so the client cannot silently merge or discard a future plan.

## Training-volume breakdown checkpoint — 2026-09-14

The Progress surface now derives a local-first `TrainingVolumeBreakdown` from complete workout
sessions in the active cycle. `getCycleCompletedSetRecords` reads durable set values and resolves
legacy null exercise IDs through the immutable program-version snapshot before handing records to
the pure domain function. The domain groups completed sets by exercise, movement pattern, and
primary muscle, and reports load volume only when positive load and reps are both present.

Muscle totals are intentionally described as approximate: a completed set is credited to every
primary muscle on the exercise, so categories can overlap. This is a training-orientation view,
not a medical measurement or a claim of physiological stimulus. The UI keeps an empty state for a
new cycle, exposes an accessible text summary, and renders only the top categories; the complete
breakdown remains available in the typed domain result for later chart/detail surfaces.

## Cardio progress checkpoint — 2026-09-14

`getCycleCardioRecords` reads complete cardio-session set measurements from the local cycle and
`buildCardioProgress` groups interval rows by stable session ID before producing cycle totals and
weekly minutes. The Progress surface presents total time, deduplicated session count, optional
distance, and the most recent four active weeks. Missing duration/distance values remain absent;
the card does not infer cardio from HealthKit, Health Connect, or strength volume.

## Free-form Coach question checkpoint — 2026-09-14

`CoachGateway.generateMessage` accepts an optional bounded question in addition to the typed task.
`HttpCoachGateway` trims and validates the question, runs deterministic safety routing before any
provider request, and sends the question separately from the minimized structured context. The
default guest gateway remains unavailable, so the Coach tab falls back to a local task inference
for common questions without adding a network dependency or a plan mutation path. A real chat
history store and connected provider remain open #278 work.

## Exercise catalogue filtering checkpoint — 2026-09-14

`searchExercises` now keeps catalogue filtering in the typed domain layer. It combines the
equipment-compatibility filter with difficulty, stance, movement classification, and
mobility/power/cardio category predicates, and includes classification in text search. The
Exercise Library renders the filters as token-driven accessible chips; no query requires a
network request or changes user data.

## Custom exercise authoring checkpoint — 2026-09-14

The builder uses the typed `createCustomExercise` factory for user-owned movements. It normalizes
list fields, requires a name, primary muscle, and equipment option, stores optional instructions
and private notes in the JSON snapshot, and derives the initial workout target from tracking type.
Custom data remains draft/private and is covered by the existing local repository, outbox, export,
delete, and account-adoption boundaries.

The builder loads persisted user-owned exercises into its picker in addition to foundational
records. The merge is additive and user-scoped, so a private movement can be reused in a later
workout without mutating a public exercise or a completed-cycle snapshot.

## Partial workout checkpoint — 2026-09-14

The local workout boundary now supports an explicit early-stop path for the canonical “shorten a
session” requirement. After at least one set is persisted, the user can choose a bounded reason:
time-limited, readiness, discomfort, equipment, or other. Migration 16 adds the nullable
`completion_reason` column to `workout_sessions`; `finishWorkoutSessionPartially` updates only an
in-progress row, queues the updated session through the existing idempotent outbox, and removes the
draft in one transaction.

Partial sessions are intentionally not treated as complete: they do not count toward required
workout adherence, do not advance the active cycle week, and do not create a completed-session
progression baseline. The summary preserves the reason and logged-set count and tells the user
that the cycle remains on the current week. Existing completed history is untouched. Web preview
uses validated route parameters to display the same state because its documented no-persistence
provider cannot reload a native session.

The same internal boundary supports `skipped` sessions when no set has been logged. A skipped
session uses the same bounded reason vocabulary and atomic outbox/draft cleanup, remains out of
adherence, cycle advancement, and completed-session progression, and is retained as an explicit
user decision for history and later sync.

## Deterministic next-cycle progression checkpoint — 2026-09-14

The Review → progression-copy path now loads complete-cycle set records with workout identity,
readiness, and discomfort context. `buildCycleProgressionCopy` applies the existing version-owned
progression rule only when `calculateNextTarget` returns an ordinary non-confirmation decision;
the builder renders the resulting changes as editable starting targets. Copy versions retain an
immediate `sourceWorkoutId` so repeated program namespaces resolve history without conflating
duplicated exercises. No cross-cycle change is applied for missing evidence, limited/rest
readiness, discomfort, or strategies that require confirmation.

## Calendar and rescheduling checkpoint — 2026-09-14

The first calendar surface uses a cycle-scoped `workout_schedule_overrides` table rather than
mutating the versioned program snapshot. Each occurrence is identified by cycle, week, and workout
ID, and stores its original local date plus the user-selected scheduled date. The local write and
its stable sync mutation are atomic and retry-safe.

`src/domain/calendar.ts` is the source of truth for date arithmetic and status projection. It uses
device-local `YYYY-MM-DD` keys to avoid UTC midnight shifts, derives the six-week schedule from the
cycle start date, and projects complete/partial/skipped/in-progress/missed/current/upcoming states
from local session history. Home and the cycle dashboard use the current-week projection; the
calendar route exposes the full six-week plan and allows bounded one-day moves without changing
cycle-week identity or completed history.

Schedule overrides are included in local export/delete and guest-to-account adoption boundaries.
The web provider intentionally remains non-persistent; native SQLite and reconnect/device proof
remain release-gated. Multi-workout date planning, drag interactions, server conflict resolution,
and calendar notifications that honor overrides remain follow-up work.

## Workout history checkpoint — 2026-09-14

`src/db/historyRepository.ts` now provides a user-scoped read model over immutable workout sessions
and completed sets. It joins the cycle and program-version snapshot, aggregates completed-set count,
load volume, cardio duration, and distance without rewriting history, and keeps partial/skipped/
in-progress states explicit. Malformed snapshots fall back to a stable workout ID label.

`/history` exposes that read model with status filters and an accessible summary for each session.
The route uses the same local database boundary as Progress and remains usable without a network;
the web preview uses typed demo records because its provider is intentionally non-persistent.

## Plate calculator checkpoint — 2026-09-14

The optional barbell utility is implemented as a pure domain calculation in
`src/domain/plateCalculator.ts`. It accepts the total target, barbell weight, and editable total
plate inventory; it searches bounded symmetric pairs, prefers an exact result, and otherwise
returns the closest safe load without overshooting. Imperial and metric defaults are convenience
fixtures only and are resettable by the user.

`/plate-calculator` is an accessible route from barbell workouts and remains independent of the
workout persistence path. It is a loading aid rather than a progression authority: target values
still come from the versioned workout and deterministic progression engine, and the UI includes a
safe-setup disclaimer. Native device layout and keyboard verification remain release-gated.

## Active workout revision checkpoint — 2026-09-14

The active workout now reuses the pure `reorderWorkoutExercises` and
`setWorkoutExerciseSetCount` domain operations for accessible move-up, move-down, and add-set
controls. Every change creates a new private program-version revision and updates the active cycle
and in-progress session pointer; the canonical template and completed history remain unchanged.
Reordering retains stable workout-exercise/set IDs, and the active surface only adds sets so an
existing completed-set key cannot be reassigned. The SQLite writes use the existing idempotent
program, cycle, and session outbox boundaries through one `saveActiveWorkoutRevision` transaction.
Removing sets during an active session remains intentionally deferred until a completed-set-aware
edit contract exists.

The active route now requests a non-blocking `SyncRuntimeProvider.flushNow()` after a durable set,
readiness, revision, pause, completion, partial, or skipped-session write. The single-flight
runtime still checks authentication and connectivity, so the user-facing local transaction never
waits on the network and guest/offline outbox rows remain available for a later retry.

`LocalDatabaseProvider` now handles SQLite open or migration errors with a retryable local-storage
screen. It does not expose raw database errors or render the workout shell without a usable local
database. A retry remounts the provider so a transient initialization failure can recover without
requiring a force-quit.

The active route maps the shared sync runtime to the same accessible banner states used by Profile:
offline, syncing, retry-paused, and conflict. A synced/idle state stays quiet, and the banner never
blocks local workout controls.

When an unfinished exercise is substituted, the active route clears draft input values and any
exercise-level next-target override for that stable workout-exercise ID before rendering the new
movement. The operation remains blocked after a completed set, so stable history IDs are not
reinterpreted as a different exercise.
