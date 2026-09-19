# SHIFT6 release-ready configuration gate

Updated: 2026-09-19

This gate separates ordinary repository verification from the stricter configuration needed for a signed public-release candidate.

## Why this is separate

`npm run verify` must remain useful while external release values are intentionally unresolved. It validates source, tests, Expo configuration, assets, secrets, dependency audit and iOS/Android/web bundle exports.

`npm run validate:release-ready` is intentionally stricter and should be run only against the exact environment intended for a signed release candidate. It does not submit or deploy anything.

## Release modes

- `guest-only`: no backend URL, no account creation and no provider-backed Coach. Local workout logging remains the core experience.
- `connected`: requires a real public HTTPS API. Account creation and remote Coach may then be enabled only when their additional evidence gates pass.

## Always required

- `EXPO_PUBLIC_ENVIRONMENT=production`
- `SHIFT6_RELEASE_MODE=guest-only|connected`
- a real public HTTPS `SHIFT6_PRIVACY_POLICY_URL`
- a real public HTTPS `SHIFT6_SUPPORT_URL`
- `SHIFT6_NETWORK_AUDIT_REF` pointing to evidence from the exact signed candidate

The validator rejects localhost, private-network hosts, example/test domains and URLs containing credentials.

## Conditional gates

If account creation is enabled:
- release mode must be `connected`;
- `SHIFT6_ACCOUNT_DELETION_URL` must be a real public HTTPS resource.

If provider-backed Coach is enabled:
- release mode must be `connected`;
- `SHIFT6_COACH_PROVIDER_REVIEW_REF` must identify completed provider/privacy review evidence.

If analytics or crash reporting is enabled:
- the matching provider/privacy review reference is required.

These references are evidence pointers, not credentials. Keep secrets out of release environment example files and repository documentation.

## Usage

Copy `.env.release.example` outside source control to a local release environment file, fill the real values, export them into the shell, then run:

```sh
npm run validate:release-ready
```

A passing command means only that the declared release configuration is internally consistent. It does not replace:

- `npm run verify` on the exact head;
- signed iOS and Android builds;
- native VoiceOver/TalkBack and large-text QA;
- offline/restart/sync fault testing;
- backend authorization/RLS and deletion evidence;
- provider contract/privacy verification;
- HealthKit/Health Connect QA and declarations;
- final store screenshots/data-safety answers;
- explicit approval before submission or production rollout.
