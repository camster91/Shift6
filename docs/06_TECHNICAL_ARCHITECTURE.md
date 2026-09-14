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
