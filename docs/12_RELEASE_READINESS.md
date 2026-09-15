# SHIFT6 release-readiness checkpoint

Updated: 2026-09-15

## What this checkpoint proves

The rebuild foundation is implemented on the React Native / Expo architecture and the launch
catalogue now has executable six-week draft versions for 19 of the 20 planned programs. Those
draft versions use the existing local-first workout, cycle, builder, progress, sync, privacy,
health, notification, and Coach boundaries. Every supported progression strategy has an explicit
version-owned deterministic rule.

The executable drafts are intentionally still catalogued as `metadata-draft`. They are available
for engineering and content validation, but the public UI must not treat them as publication-ready
until exercise/program review gates are completed.

## Remaining product-content gate

`Resistance Bands` remains metadata-only because the current foundational exercise catalogue has no
band-specific exercise records. Do not pretend that bodyweight or dumbbell movements are
band-compatible. Add reviewed band exercise records first, then author and validate its six-week
version.

The broader 300+ exercise launch target also remains a content-production goal. The current
foundational catalogue is deliberately draft content. Technique, instructions, imagery/video,
licensing/provenance, and publication status require human review.

## Remaining external verification gates

These cannot be truthfully completed from repository-only work:

- Figma review and approval of final brand, components, icons, and production exports.
- Native iOS and Android device/simulator verification, including SQLite restart/offline recovery.
- Signed EAS preview builds with the account credentials and signing assets.
- Provider-specific authentication and a deployed authenticated backend.
- Remote account reconciliation/deletion and server conflict-resolution policy.
- Native Apple Health / Health Connect permission, revocation, disconnect, and store-declaration QA.
- Production crash/error monitoring, retention controls, and device-level observability.
- Notification delivery/background behaviour on representative native devices.
- App Store and Google Play listing assets, privacy/data-safety declarations, staged rollout,
  rollback, and submission approval.

## Release rule

Do not close the public-release epic or submit to either store until the external verification
gates above are evidenced. Repository tests, web export, and static configuration checks are
necessary but are not substitutes for native-device or production-provider verification.
