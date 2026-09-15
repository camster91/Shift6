# SHIFT6 release-readiness checkpoint

Updated: 2026-09-15

## What this checkpoint proves

The rebuild foundation is implemented on the React Native / Expo architecture and the launch
catalogue now has executable six-week versions for all 20 planned launch programs. Barbell 30 is
the canonical startable fixture; the other 19 versions remain explicit content drafts. Those
versions use the existing local-first workout, cycle, builder, progress, sync, privacy, health,
notification, and Coach boundaries. Every supported progression strategy has an explicit
deterministic rule, and mixed-modality targets route to a compatible deterministic strategy instead
of blindly inheriting an incompatible program-level rule.

The non-canonical executable versions are intentionally still catalogued as `metadata-draft`. They
are available for engineering and content validation, but the public UI must not treat them as
publication-ready until exercise/program review gates are completed.

The repository now also exposes a provider-neutral error-reporting boundary and a root render error
boundary. Error reporting defaults to a no-op and accepts only allowlisted technical context. A
production crash-monitoring provider, retention policy, and device verification remain release
configuration rather than hidden defaults.

## Remaining product-content gate

The foundational exercise catalogue now contains 58 draft records, including eight band-native
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
- Remote account reconciliation/deletion and server conflict-resolution policy.
- Native Apple Health / Health Connect permission, revocation, disconnect, and store-declaration QA.
- Selection/configuration of production crash/error monitoring plus retention controls and
  device-level observability.
- Notification delivery/background behaviour on representative native devices.
- App Store and Google Play listing assets, privacy/data-safety declarations, staged rollout,
  rollback, and submission approval.

## Verification still required for this branch

GitHub Actions did not start for repository writes made through the connected GitHub integration.
Before merge, run the normal CI workflow or its equivalent and require all repository gates to pass:
format check, lint, TypeScript, Expo Doctor, asset/secret/release validation, dependency audit, Jest,
and the web export. Static review in the repository is not a substitute for those commands.

## Release rule

Do not close the public-release epic or submit to either store until the external verification gates
above are evidenced. Repository tests, web export, and static configuration checks are necessary but
are not substitutes for native-device or production-provider verification.
