# Mobile guest release — 12 October 2026

The first release targets iOS and Android only. It requires no backend server.
Every EAS profile selects guest-only mode, with an empty API URL. Configuration
rejects accidentally supplying a backend URL in that mode.

## Implemented

- Six-step setup, owner-scoped draft recovery, offline logging and workout resume.
- Guest auth is unavailable, sync runtime does not subscribe or flush, and new
  local writes do not create cloud outbox records. Existing records are retained.
- Profile explains local storage and offers export and deletion.
- Local personal goals: user-declared repetitions, load for reps, hold duration, fixed-distance time, distance or completion,
  target, explicit setup/assistance, recoverable creation drafts, measured baseline,
  latest and personal best. Missing baselines are not zero.
- Corrections append records with the original measurement date; old values stay
  in history. Target revisions and review choices have a separate local journal.
  Goals are tied to an immutable plan version. Replacing a primary goal requires
  explicit confirmation and retains its history.
- Export schema 12 includes personal goal drafts and journal entries. Owner
  checks apply before mutation; deletion cascades through goal history.
- Higgsfield artwork and silent optional motion, native icons/splash, reduced
  motion, background playback stop and poster fallback. See doc 32 for earlier
  Android emulator observations and asset provenance.
- Source-tracked dependency fixes with adversarial regression checks and a
  SHA-256 inventory in vendor/. These are private forks where upstream fixes
  were unavailable; npm audit alone does not prove their correctness.
- Pull-request CI exports only mobile bundles; native validation compiles a
  test-signed Android APK and an unsigned iOS simulator app.

## Scope and limits

Self-entered goals and privately built plans do not approve the public fitness
catalogue. The public manifest remains empty pending qualified human review.
A recorded next-step choice does not automatically prescribe or start a plan.
No accounts, provider-backed Coach, cloud backup, remote analytics or remote
crash reporting are enabled in this release. Health access and reminders remain
optional native features with explicit permissions.

The earlier emulator APK/evidence in doc 32 predates the guest-only and personal
goal changes. A new native build must be used to validate these changes.

## External launch gates

1. Obtain qualified review of any public exercise/program content to be enabled.
2. Validate the final build on physical iOS/Android devices with VoiceOver/
   TalkBack, largest text, keyboard, offline restore, permissions and backgrounding.
3. Run the usability sessions in docs 18/23; record actual results and fix failures.
4. Configure Apple/Google distribution credentials and build signed store binaries.
5. Complete actual store privacy declarations, screenshots, listing, support and
   policy URLs; review store submissions before publication.

This document records engineering scope, not a 100/100 human usability score.
