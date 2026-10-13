# Store release checklist and owner access gates

Prepared and official sources checked: **2026-10-12**. Status: **preparation only**.
No account enrollment, paid build, store upload, tester invitation, submission,
publication or production setting change was performed for this checklist.

## Candidate scope inspected

The checked-in `app.json` uses `com.shift6.app` for both platforms, version
`0.1.0`, Android version code `1`, iOS build number `1`, Android target SDK 36,
and iPad support. These values are configuration, not evidence that the owner
has reserved the identifiers or that a signed store candidate exists.

All `eas.json` build profiles are guest-only with an empty API URL. Production
disables account creation, remote Coach, analytics and crash reporting, and
produces an Android app bundle. There is no configured submission profile or
Expo project ID in these inspected files. Console ownership, current credentials,
quota and developer-account status were not inspected; do not treat old notes
about login status as a fresh account check.

The current deliverable is private local training and personal goals. The public
catalogue remains gated pending qualified, version-bound review. Full-featured
AI coaching and broader issue completion require their own implementations and
acceptance evidence; a guest candidate must not advertise them. Read
[doc 33](33_MOBILE_GUEST_RELEASE.md), [doc 34](34_HUMAN_USE_ACCEPTANCE.md),
[doc 13](13_NATIVE_RELEASE_VERIFICATION.md) and the current native QA report.
[Doc 15](15_STORE_RELEASE_PACKAGE.md) contains historical metadata drafts, not
approved copy for this candidate.

## Concrete access and decision record

Fill these fields with identifiers or evidence references, never secret values.

| Gate | Owner-provided decision/access | Acceptance evidence | Status |
| --- | --- | --- | --- |
| Publisher identity | Legal publisher, individual/organization, intended countries and contact | Matching Apple/Google console ownership and agreements | Unverified |
| Apple team | Existing Developer Program team, app access and certificate/provisioning permissions | Team ID, reserved bundle ID and App Store Connect app ID | Unverified |
| Google account | Existing Play developer account and app access; personal/organization and account creation date | Package ownership, verification and production-access status | Unverified |
| Expo project | Owner's Expo organization/project, authorized member and approved build quota | Project ID, account access and selected credential storage method | Unverified |
| Signing continuity | Existing signing assets if an app already exists; otherwise approved creation/custody | Android upload certificate digest and iOS distribution/profile identity | Unverified |
| Physical testing | iPhone/iPad and Android devices, consented testers | Signed-candidate results, TalkBack/VoiceOver and largest-text evidence | Pending |
| Fitness content | Qualified reviewer and exact versions to enable | Review records passing existing content gates | Pending |
| Public support/privacy | Owner-approved stable HTTPS pages and contact channel | Pages reachable and matching final binary behavior | Pending |
| Final release scope | Guest release versus later expanded Coach release | Implemented-feature inventory and honest screenshots/copy | Pending |
| Upload and launch | Exact binary hash, track, countries, metadata and release controls | Separate owner instruction for external action | Not performed |

Use existing accounts first. Enrollment or services that incur payment require
an explicit owner decision; this checklist does not enroll or spend on their behalf.
Apple's [enrollment documentation](https://developer.apple.com/programs/enroll/)
describes membership and identity requirements.

## Build and test distribution

1. Freeze the commit. Run `npm run verify` and the applicable release gates.
   Record source SHA, candidate hash, version, native permissions/entitlements,
   signing identity and evidence. Never replace a failing gate with invented
   review, URLs, audit references or participant results.
2. After authorized project/signing setup, a production Android build must be a
   signed **AAB**; the emulator/test APK is not the Play submission artifact.
   Play App Signing separates Google's app-signing key from the developer's
   upload key. Preserve existing key continuity and recovery custody.
   [Google signing](https://support.google.com/googleplay/android-developer/answer/9842756).
3. iOS requires a distribution-signed **IPA**, with the appropriate distribution
   certificate and provisioning profile. An unsigned simulator app cannot be
   installed on an iPhone. EAS supports uploading iOS binaries from Windows;
   that does not provide a local iOS simulator or replace iPhone testing.
   [Expo submission overview](https://docs.expo.dev/deploy/submit-to-app-stores/).
4. For direct preview distribution, Android uses an APK; iOS ad hoc provisioning
   includes the allowed device UDIDs at build time. EAS internal URLs are
   accessible to anyone holding the URL by default. Review the owner's intended
   access before sharing; do not change its access setting without authorization.
   [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/).
5. TestFlight internal testing and external beta testing are separate from App
   Store publication. The first external beta build requires TestFlight review.
   Record the approved testers and test information; do not send invitations
   without instructions. [Apple external testing](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/).
6. Google personal developer accounts created after **2023-11-13** require a
   closed test with at least **12 testers opted in continuously for 14 days**,
   followed by an application for production access. Determine whether this
   applies from the owner's actual account. It does not replace doc 34's
   usability sessions. [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

Do not run `--auto-submit` during build preparation. EAS Build and EAS Submit
are distinct actions. The build profile name alone does not authorize an upload.

## Privacy and health declarations

- Complete Apple App Privacy for the exact candidate, including third-party
  SDK behavior. Data processed solely on-device is outside Apple's collection
  disclosure; transmission or derived off-device data needs a fresh assessment.
  [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/).
- Complete Google Data safety from an actual network/data inventory, including
  SDKs. Solely on-device processing is outside collection; even ephemeral
  off-device processing needs form assessment. Review user-initiated exports
  against Google's sharing exceptions, rather than automatically calling every
  export either collection or sharing. [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469).
- Complete the Google Health apps declaration for the fitness features. The
  requirement also applies to closed/open test tracks. [Health declaration](https://support.google.com/googleplay/android-developer/answer/14738291).
- Match Health Connect permissions to actual user-facing needs and provide the
  required access justification. Current source requests steps, exercise,
  heart rate, resting heart rate, sleep and weight. Verify each need and the
  final manifest; optional consent does not justify unused types. Explicitly
  assess sharing imported health data before any later remote Coach launch.
  [Google sensitive-permissions policy](https://support.google.com/googleplay/android-developer/answer/16558241).
- Check final iOS privacy manifests/SDK disclosures, HealthKit entitlements,
  permission text, export compliance, age rating and supported devices. Current
  `supportsTablet: true` means iPad presentation needs validation unless the
  owner approves a supported-device configuration change. Answer the actual
  [Apple age-rating questionnaire](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/).
- Audit OS backup behavior and explain local deletion versus recipient export
  copies. Local guest storage must not be described as app-level encrypted or
  SHIFT6 cloud-backed without evidence. Publish the approved policy draft only
  through an authorized hosting change.

## Reviewable upload and publication controls

Prepare this packet before requesting the external action: SHA/hash, signed
binary, track, version numbers, approved metadata, screenshots, permissions,
privacy answers, reviewer steps, support/policy URLs, QA failures and remaining
gates. It must identify whether the action is a private test upload, external
beta submission, store review submission or public launch.

For EAS Android submission, assign an authorized Google service-account key
to the app through credential settings. Current Expo documentation says the
first EAS submission can create an internal-track release; a manual first upload
is an alternative, not a universal prerequisite. Use `releaseStatus: draft` in
an approved submission profile to avoid rolling out that upload. No submission
profile was added here. [Expo Android submission](https://docs.expo.dev/submit/android/).

For automated iOS upload, configure the App Store Connect API key and numeric
`ascAppId` through the supported credential workflow. Keep keys out of chat and
Git. EAS upload does not complete store metadata or App Review.
[Expo iOS submission](https://docs.expo.dev/submit/ios/).

Apple's current review controls are **Add for Review**, then **Submit for Review**;
the required role is Account Holder, Admin or App Manager.
[Apple submission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/).
Use **Manually release this version** when authorized to prepare a controlled
release; public launch later uses **Release This Version** and confirmation.
[Apple release options](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/).
For Google, inspect the actual publishing overview and review/publishing state
before any production change; managed publishing and test-track states must not
be mistaken for a guaranteed hold on every initial release.
[Google publication](https://support.google.com/googleplay/android-developer/answer/9859751).

## Expanded Coach release is a separate candidate

Complete and retest issue implementations before marketing a full-featured
Coach. Inventory conversational onboarding, goal/context memory, actionable
proposals, session/weekly/cycle reviews and voice/import shortcuts against
actual source and native behavior; an issue being filed does not deliver it.

On-device assistance can preserve the local guest model. Remote Gemini or
another provider requires an explicit release-contract change, a private
server-secret boundary, request minimization/consent, provider retention and
cost decisions, failure and safety evaluation, and updated privacy declarations.
See [doc 20](20_COACH_PROVIDER_RELEASE_GATE.md) and
[doc 22](22_RELEASE_CONFIGURATION_GATE.md). The current guest production gate
intentionally rejects remote Coach or a backend URL. No backend is needed to
complete the current native QA work.

No store acceptance, clinical efficacy, qualified content approval or human-use
score is asserted by this checklist. Recheck live requirements and console
state immediately before the owner authorizes an exact submission candidate.
