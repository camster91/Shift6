# SHIFT6 release-readiness checkpoint

Updated: 2026-09-15

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

The exercise-detail substitution surface now explains meaningful movement, muscle, tracking, and
equipment differences for compatible alternatives instead of presenting a name-only replacement.

The repository also exposes a provider-neutral error-reporting boundary and a root render error
boundary. Error reporting defaults to a no-op and accepts only allowlisted technical context. A
production crash-monitoring provider, retention policy, and device verification remain release
configuration rather than hidden defaults.

The Coach evaluation matrix covers provider failure, missed training, plateau thresholds,
discomfort/pain, limited time, equipment changes, medication boundaries, and urgent symptoms using
the deterministic safety/progression/substitution boundaries.

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

The foundational exercise catalogue now contains 58 draft records, including eight band-native
movements so the Resistance Bands program can be structurally exercised without pretending other
equipment is compatible.

The broader 300+ exercise launch target remains a content-production goal. The current catalogue is
deliberately draft content. Technique, instructions, imagery/video, licensing/provenance, and
publication status require human review. Executable does not mean reviewed or safe for public
publication.

## Remaining in-repository product-scope gaps

The original screen/epic specifications still include two optional profile/onboarding capabilities
that are not implemented in the current data model or UI:

- onboarding movement/accessibility considerations (explicit, non-diagnostic user selections; no
  pregnancy/postpartum path should be added until vetted content exists); and
- optional manual body-metric tracking in Profile/Progress.

These must remain open under #273/#279 until implemented or explicitly descoped. They are not hidden
inside the external-verification list, and their absence must not be reported as completed work.

## Remaining external verification gates

These cannot be truthfully completed from repository-only work:

- Figma review and approval of final brand, components, icons, and production exports.
- Native iOS and Android device/simulator verification, including SQLite restart/offline recovery.
- Signed EAS preview builds with the account credentials and signing assets.
- Provider-specific authentication and a deployed authenticated backend.
- Remote account reconciliation/deletion and server conflict-resolution policy.
- Native Apple Health / Health Connect permission, revocation, disconnect, and store-declaration QA.
- Selection/configuration of production crash/error monitoring plus retention controls and
  device-level observability.
- Notification delivery/background behaviour on representative native devices.
- App Store and Google Play listing assets, privacy/data-safety declarations, staged rollout,
  rollback, and submission approval.

## Verification still required for this branch

GitHub Actions did not start for repository writes made through the connected GitHub integration,
and opening draft PR #282 also produced no CI status. The workflow now supports manual
`workflow_dispatch`, but the connected GitHub tool cannot dispatch a new run. Before merge, run
`npm run verify` (or the equivalent CI workflow) and require all repository gates to pass: format
check, lint, TypeScript, Expo Doctor, asset/secret/release validation, dependency audit, Jest, and
the web export. Static review in the repository is not a substitute for those commands.

The native/device/store evidence sequence is defined in `docs/13_NATIVE_RELEASE_VERIFICATION.md`.

## Release rule

Do not close the public-release epic or submit to either store until the external verification gates
above are evidenced. Do not close #273/#279 as fully complete while the explicitly listed product
scope remains open unless that scope is deliberately removed. Repository tests, web export, and
static configuration checks are necessary but are not substitutes for native-device or
production-provider verification.
