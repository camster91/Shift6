# SHIFT6 native and release verification runbook

Updated: 2026-09-15

This runbook turns the remaining external release gates into an evidence-based checklist. It does not authorize store submission, production deployment, paid build usage, credential changes, or backend/account changes. Those remain explicit approval actions.

## 1. Repository quality gate

Use a clean checkout of the exact candidate commit with Node 22 and the committed lockfile.

```bash
npm ci
npm run verify
```

`npm run verify` must pass all of the same gates as CI:

- Prettier check;
- ESLint with zero warnings;
- TypeScript `--noEmit`;
- Expo Doctor;
- asset-manifest validation;
- tracked-secret check;
- release-config validation;
- production dependency audit at `high` severity;
- Jest/unit/component tests;
- static web export smoke test.

Record the candidate commit SHA and the complete command result. Do not merge PR #282 while this gate is unknown or failing.

## 2. Native build gate

A custom native build is required because SHIFT6 uses SQLite, SecureStore, notifications, HealthKit, and Health Connect native capabilities.

Before starting a signed EAS preview build, confirm explicit approval because it uses external build infrastructure/account credentials and may consume plan quota.

Required evidence:

- iOS preview build identifier and candidate commit SHA;
- Android preview build identifier and candidate commit SHA;
- app launches without a migration/bootstrap error;
- configured bundle/package IDs remain `com.shift6.app`;
- no secrets are embedded in the client build.

## 3. Representative device matrix

Verify at minimum:

- a smaller supported iPhone;
- a larger current iPhone;
- a smaller Android phone;
- a larger Android phone;
- one tablet-sized layout where practical.

For every device, capture OS version, build ID, and pass/fail evidence.

## 4. Critical end-to-end journey

On a fresh install:

1. Continue as guest.
2. Complete onboarding without granting health access.
3. Confirm recommendations reflect goals, schedule, session length, and equipment.
4. Open Barbell 30 and start a six-week cycle.
5. Start the first workout while online.
6. Log at least one set and confirm it is visible immediately.
7. Disable network access and continue logging.
8. Background and reopen the app; confirm draft values and completed sets survive.
9. Force-close and relaunch; confirm the active workout recovers without losing completed sets.
10. Complete the workout offline; confirm summary/progress remain available.
11. Restore connectivity; confirm local logging stays usable while sync resolves.
12. Repeat a workout and confirm completed history is not overwritten.
13. Exercise partial-session and skipped-session flows and verify they do not incorrectly advance the cycle.
14. Complete enough synthetic/manual sessions to reach cycle review and verify repeat/progress/adjust/change/build-new paths preserve historical snapshots.

Release blocker: any reproducible completed-set or workout-history data loss.

## 5. Workout-system fault testing

Verify:

- local DB bootstrap failure shows a bounded retry state;
- duplicate sync attempts do not duplicate sets/sessions;
- network loss never blocks local set completion;
- sync conflicts remain review-required and do not overwrite local plan/history automatically;
- exercise substitution is blocked after completed-set history exists for that movement;
- substitution before completion clears stale draft inputs and explains meaningful differences;
- rest timers remain correct through foreground/background transitions within platform limits;
- notification denial never blocks workout logging.

## 6. Accessibility gate

Run the critical journey with:

- VoiceOver on iOS;
- TalkBack on Android;
- larger accessibility text sizes;
- reduced-motion enabled at OS level;
- colour differentiation unavailable as the only status cue.

Confirm:

- interactive controls have useful labels/state;
- focus order is logical;
- the active workout can be completed with a screen reader;
- timers, forms, charts, banners, and errors have text alternatives;
- primary controls retain usable touch targets;
- layouts remain operable at large text sizes.

The current UI has no deliberate animated training surface, but reduced-motion mode must still be checked for platform/navigation behaviour before release.

## 7. Health integration gate

Test separately on supported iOS and Android devices.

Verify:

- the app remains fully usable when health access is skipped or denied;
- only the declared read types are requested;
- an explicit import stores normalized summaries locally;
- duplicate imported samples do not create duplicate summaries;
- source/type/time ranges remain correctly labelled;
- disconnect stops future SHIFT6 imports;
- local summary removal deletes only SHIFT6-stored normalized health summaries;
- OS-level permission revocation is reflected accurately after returning to the app;
- no raw health samples or health/free-text notes enter analytics or the workout sync outbox.

Store privacy/data-safety declarations must match the verified behaviour before submission.

## 8. Notification gate

Verify opt-in, denial, and disabled states for:

- workout reminders;
- rest-timer cues;
- weekly review;
- cycle review;
- Coach messages where supported.

Confirm scheduled reminders deep-link to the intended workout without mutating the plan. Verify foreground, background, cold-start, and expired/cancelled reminder behaviour on both platforms.

## 9. Authentication/backend gate

This gate cannot pass until an auth provider and authenticated backend are deliberately selected and deployed.

When configured, verify:

- guest mode remains usable without an account;
- guest data adopts transactionally into an empty authenticated identity;
- provider sign-in persists through SecureStore-backed session recovery;
- expired/malformed sessions fail safely;
- sign-out does not silently destroy local training history;
- sync is row/user scoped server-side;
- version/ownership/validation conflicts are returned explicitly;
- remote account deletion is verifiable;
- server logs redact sensitive payloads;
- Coach credentials remain server-side only.

Backend/provider selection, deployment, secrets, DNS, billing, and production account changes require explicit approval.

## 10. Observability gate

Select a crash/error-monitoring provider only after privacy and retention settings are reviewed.

Verify on-device that:

- a controlled non-sensitive test error reaches the provider;
- reports contain only allowlisted technical context;
- tokens, workout notes, Coach prompts, raw health data, and other sensitive free text are absent;
- crash-free and sync/auth health can be monitored before rollout;
- retention/access settings match the published privacy policy.

## 11. Content/design approval gate

Before a public release:

- Figma variables/components/icons and production exports receive final design review;
- temporary Ionicons fallbacks are either approved or replaced;
- every public exercise used by launch programs receives human technique/content review;
- exercise media receives provenance/licence and technique review;
- all 20 program versions receive fitness-content review;
- unreviewed draft records remain visibly gated from public startability;
- store screenshots contain no placeholder/unapproved content.

The 300+ exercise target is a reviewed-content target, not a reason to generate hundreds of unreviewed near-duplicates.

## 12. Store release gate

Prepare but do not submit without explicit approval:

- App Store and Google Play listing copy;
- screenshots/assets;
- support/privacy URLs;
- Apple privacy nutrition/data-use answers;
- Google Play Data safety answers;
- health-data declarations;
- account-deletion instructions;
- release notes;
- staged-rollout percentages;
- rollback/kill-switch plan.

A public release is ready only when the repository gate, native-device gate, content/design approval, privacy/security checks, and store declarations all agree with the same candidate build.

## 13. Rollback requirements

Before rollout, document:

- the prior known-good mobile build;
- backend compatibility with both the prior and candidate client versions;
- how a staged rollout is stopped;
- how a bad client build is replaced without deleting local user data;
- how migrations remain forward-safe and do not require destructive rollback;
- which feature/provider integrations can be disabled independently.

Never use local-data deletion as a routine rollback mechanism.

## Evidence package

For the release candidate, retain:

- commit SHA;
- `npm run verify` result;
- iOS/Android build IDs;
- device/OS matrix;
- critical-journey recordings or screenshots;
- accessibility results;
- health/notification permission results;
- sync/offline/restart fault-test results;
- content/design approvals;
- privacy/store declaration review;
- staged-rollout and rollback approval.

Only evidence-backed gates should be marked complete.
