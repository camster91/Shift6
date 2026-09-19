# SHIFT6 release-readiness checkpoint

Updated: 2026-09-16

## Status precedence

This file is the current implementation/readiness checkpoint. Requirement sections in the canonical
planning documents remain authoritative, but accumulated implementation-status paragraphs in
`docs/06_TECHNICAL_ARCHITECTURE.md` and `docs/09_ROADMAP_AND_EPICS.md` describe earlier increments
and may use historical wording such as `metadata-only`. When those historical notes conflict with
this checkpoint, verify the current code/tests and use this file for present-tense readiness.

## What this checkpoint proves

The rebuild foundation is implemented on the React Native / Expo architecture and the launch
catalogue now has executable six-week versions for all 20 canonical launch programs defined in
`docs/05_PROGRAMS_EXERCISES_EQUIPMENT.md`. Barbell 30 is the canonical startable fixture; the other
19 versions remain explicit content drafts. Those versions use the existing local-first workout,
cycle, builder, progress, sync, privacy, health, notification, and Coach boundaries. Every supported
progression strategy has an explicit deterministic rule, and mixed-modality targets route to a
compatible deterministic strategy instead of blindly inheriting an incompatible program-level rule.

The non-canonical executable versions are intentionally still catalogued as `metadata-draft`. They
are available for engineering and content validation, but the public UI must not treat them as
publication-ready until exercise/program review gates are completed.

The exercise-detail substitution surface explains meaningful movement, muscle, tracking, and
equipment differences for compatible alternatives instead of presenting a name-only replacement.

The repository also exposes a provider-neutral error-reporting boundary and a root render error
boundary. Error reporting defaults to a no-op and accepts only allowlisted technical context. A
production crash-monitoring provider, retention policy, and device verification remain release
configuration rather than hidden defaults.

The Coach evaluation matrix covers provider failure, missed training, plateau thresholds,
discomfort/pain, limited time, equipment changes, medication boundaries, and urgent symptoms using
the deterministic safety/progression/substitution boundaries.

The optional profile-scope gaps identified during the 2026-09-15 audit have explicit local-first
implementations on `feat/profile-considerations-body-metrics`: structured movement/accessibility
preferences and manual weight history. Both are excluded from analytics and the sync outbox by
default, included in local export/delete, and adopted during guest-to-account conversion. The
consideration screen makes no diagnosis or hidden program inference; manual weight is stored in a
canonical kilogram value and displayed in the user's selected unit system.

The account-deletion follow-up branch adds the mobile half of the remote deletion contract without
pretending a production server exists. `BackendClient` exposes authenticated remote deletion;
non-confirmed responses fail closed; Profile distinguishes guest local deletion from authenticated
account deletion; and a SecureStore recovery marker lets the app resume local cleanup/sign-out after
an app restart without repeating a confirmed destructive server request. The production server,
provider revocation and public web deletion resource remain release blockers. See
`docs/16_ACCOUNT_DELETION_CONTRACT.md`.

The Coach privacy follow-up makes provider-backed Coach processing an explicit local opt-in that is
disabled by default. When disabled, provider message and plan-proposal methods are not called and the
deterministic local Coach remains available. The provider-bound context also excludes local user,
cycle and program-version identifiers in addition to raw health samples, private workout notes,
manual body metrics, movement/accessibility preferences and analytics payloads. Production provider
identity, retention/model-training terms and end-to-end provider evaluation remain release blockers.

The accessibility-primitives follow-up hardens shared controls rather than claiming a completed
native accessibility audit. Buttons expose disabled/busy state consistently, icon buttons no longer
announce themselves as enabled when no action exists, selected chips include a visible non-colour
check cue, and interactive program/workout cards expose one labelled focus target instead of nested
accessible targets. Regression tests also guard app text font scaling, bounded progress semantics,
minimum touch targets and functional text/status colour contrast. VoiceOver/TalkBack, critical-flow
large-text behaviour and representative-device verification remain mandatory external evidence.

## Current Expo compatibility check

The dependency baseline was checked against Expo's current SDK 57 documentation on 2026-09-15.
SHIFT6 uses Expo `~57.0.22`, React Native `0.86.3`, React `19.2.3`, and React Native Web `~0.21.0`,
which matches the SDK 57 compatibility line. Expo's SDK 57 changelog also identifies React Native
0.86.3 / Expo 57.0.17+ as the fix level for the Hermes regressions that affected apps importing
Reanimated or Worklets; this repository is above that Expo fix level.

References:

- https://docs.expo.dev/versions/latest/
- https://expo.dev/changelog/sdk-57

Expo Doctor and native-build verification still remain mandatory release gates; this compatibility
check does not replace either one.

## Remaining product-content gate

The foundational exercise catalogue contains 58 draft records, including eight band-native
movements so the Resistance Bands program can be structurally exercised without pretending other
equipment is compatible.

The broader 300+ exercise launch target remains a content-production goal. The current catalogue is
deliberately draft content. Technique, instructions, imagery/video, licensing/provenance, and
publication status require human review. Executable does not mean reviewed or safe for public
publication.

## Remaining external verification gates

These cannot be truthfully completed from repository-only work:

- Figma review and approval of final brand, components, icons, and production exports.
- Native iOS and Android device/simulator verification, including SQLite restart/offline recovery.
- Signed EAS preview builds with the account credentials and signing assets.
- Provider-specific authentication and a deployed authenticated backend.
- Deployed remote account-deletion/cascade endpoint, provider authorization revocation, retention
  policy and Google external deletion resource.
- Server conflict-resolution policy and production row-level authorization evidence.
- Native Apple Health / Health Connect permission, revocation, disconnect, and store-declaration QA.
- Selection/configuration of production crash/error monitoring plus retention controls and
  device-level observability.
- Notification delivery/background behaviour on representative native devices.
- App Store and Google Play listing assets, privacy/data-safety declarations, staged rollout,
  rollback, and submission approval.

## Verification still required for these branches

GitHub Actions are disabled at repository level as of 2026-09-19, so rebuild-era branches and draft
PRs have no CI status beyond separate security checks. The workflow supports manual
`workflow_dispatch`, but it cannot run until Actions are enabled. Before merge, run
`npm run verify` (or the equivalent CI workflow) and require all repository gates to pass: format
check, lint, TypeScript, Expo Doctor, asset/secret/release validation, dependency audit, Jest, and
the web export. Static review in the repository is not a substitute for those commands.

The dependent profile/body-metric branch adds migration 19 plus new repository/UI tests. The
account-deletion branch adds backend-protocol, cleanup-order and SecureStore recovery tests. The
Coach privacy branch adds migration 20, privacy-gate and provider-payload tests. The accessibility
branch adds shared component semantics and colour/touch-target regression tests. Each branch requires
the same verification gate after its prerequisite branch is validated.

The native/device/store evidence sequence is defined in `docs/13_NATIVE_RELEASE_VERIFICATION.md`.
The stacked repository verification order through PR #301 is defined in
`docs/17_STACKED_PR_VERIFICATION.md` and must be extended for any later dependent PR before merge
approval.

## Release rule

Do not close the public-release epic or submit to either store until the external verification gates
above are evidenced. Repository tests, web export, and static configuration checks are necessary but
are not substitutes for native-device, accessibility, provider, content, account-deletion server,
or production-release verification.
