# Mobile guest release — 12 October 2026

The first release targets iOS and Android only. It requires no backend server.
Every EAS profile selects guest-only mode, with an empty API URL. Configuration
rejects accidentally supplying a backend URL in that mode.

## Implemented

- Six-step setup, owner-scoped draft recovery, offline logging and workout resume.
- Isolated native SQLite transactions enable foreign keys on every connection and refuse unsafe goal writes.
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
- Export schema 12 includes personal goal drafts and journal entries. Native sharing uses a JSON file, not a potentially oversized Android text payload. Temporary copies are stored in owner-scoped private cache folders and removed during local deletion; later exports age out copies older than a day. Owner
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
   TalkBack, largest text, keyboard, offline recovery, permissions and backgrounding.
3. Run the usability sessions in [doc 34](34_HUMAN_USE_ACCEPTANCE.md); record actual results and fix failures.
4. Configure Apple/Google distribution credentials and build signed store binaries.
5. Complete actual store privacy declarations, screenshots, listing, support and
   policy URLs; review store submissions before publication.

This document records engineering scope, not a 100/100 human usability score.

## Verification and review handoff

The final implementation at 94c8fd82 passes all 502 tests in 84 suites,
formatting, lint, TypeScript, Expo Doctor (21/21), mobile bundle exports,
asset/release configuration and vendor source inventory checks. The production
npm audit reports zero known vulnerabilities. Private dependency forks still
require independent review; that result is not a general security certification.

The goal remains reachable from Progress after a cycle completes, and completed
cycles use the latest owned cycle for review. Measurement choices expose their
selected state to assistive technology. Unknown inherited object names cannot
be accepted as measurement metrics.

[Draft PR 330](https://github.com/camster91/Shift6/pull/330) contains the reviewable
change. [Final source quality run](https://github.com/camster91/Shift6/actions/runs/38296497279)
is green. [Final native run](https://github.com/camster91/Shift6/actions/runs/38296497294)
builds the test-signed Android APK and unsigned iOS simulator app; its job results
and downloadable artifacts are the authoritative build evidence.

The prior native run at 7454ca88 compiled both platforms, installed and cold-launched
the iOS app, verified a live process and saved an iPhone simulator screenshot.
The screenshot shows the six-step setup with its fixed Continue footer. This is
not evidence of physical-device VoiceOver, health permissions or complete user
journeys. Earlier workflow failures were validation-script problems (missing
ripgrep and incompatible Xcode architecture arguments), corrected in the branch.

Android local compilation succeeded for arm64 and x86_64. A saved test APK passed
signature, ZIP alignment and 16 KB ELF page checks for 48 native libraries. That
first saved APK predates the final file-export and review changes; use the final
native run's artifact for the completed implementation. The installed first APK's
hash matched its saved file. This session's AOSP ATD software emulator produced
black captures for both SHIFT6 and a separate minimal native control Activity;
its captures cannot establish visual readiness. No crash appeared in the sampled
crash buffer. Physical Android layout and accessibility testing remain required.

Expo CLI reports "Not logged in" in this environment, and no EAS project is linked
in app.json. Signed distribution builds require the owner's Expo project and
Apple/Google distribution setup. Public fitness content remains blocked by the
empty release manifest. No review timestamps, user-study results, network-audit
references or store approvals were invented to pass those gates.
