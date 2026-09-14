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
- Native builds mount `SQLiteProvider` through `src/db/LocalDatabaseProvider.tsx`. `src/db/migrations.ts` owns versioned schema changes, and `src/db/workoutRepository.ts` persists a completed set and its idempotent sync-outbox mutation in one transaction. The success UI must be downstream of that transaction when the active workout is implemented.
- `LocalDatabaseProvider.web.tsx` intentionally makes web a non-persistent preview surface. It prevents the current SDK 57 SQLite WASM worker packaging gap from blocking UI smoke tests and must not be treated as workout durability evidence.
- `src/domain/types.ts` uses stable string IDs, ISO timestamps, explicit program versions, cycle snapshots, immutable completed-session records, and a program-specific `CycleModel.weekSixMeaning`.
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

This is not yet the full #276 release gate: network reachability detection, background sync execution, crash/restart device proof, correction workflow, substitutions, notes, cardio blocks, and VoiceOver/TalkBack end-to-end review remain outstanding.

## Cycle start implementation checkpoint — 2026-09-13

The next vertical-slice increment connects the selected Barbell 30 program to a real six-week cycle boundary:

- `createTrainingCycle` snapshots the selected `ProgramVersion` into six program-specific `CycleWeek` records, preserving the Week 6 meaning defined by that program;
- native SQLite migration 3 persists cycle status, current week, start time, and the serialized week snapshot;
- starting a cycle pauses any other active cycle for the guest user inside one transaction, preventing multiple active plans in the local profile;
- `app/program.tsx` provides a real Barbell 30 detail/start surface, and Home plus the active workout resolve the persisted active cycle rather than always using the demo cycle;
- the stable cycle and session identifiers establish the boundary needed for later progress aggregation and sync idempotency.

Web remains a preview surface without SQLite persistence. Native cycle migration/restart behavior and the full cross-platform accessibility pass remain device verification work.
