# SHIFT6 store release package

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

**Proposed focused store story (not approved for submission):** Pick one goal → know today's session → train without distractions → life happens, keep going → see what actually changed → choose the next Shift. Replace older broad feature copy/screenshots only when the exact build supports it. Never advertise draft exercises/programs, provider AI, health integrations, fabricated results or unverified screenshots. Store metadata below is historical draft material.


Updated: 2026-09-16
Status: **pre-submission draft — do not publish from this file without final provider/native review**

This document turns the release requirements into copy and declaration inputs for App Store Connect
and Google Play Console. It is intentionally conservative: URLs, account-provider behaviour, remote
data retention, crash reporting, and analytics remain unresolved until the production services are
selected and verified.

## Current policy constraints

Verified against current official Apple and Google documentation on 2026-09-16:

### Apple

- app name: maximum 30 characters;
- subtitle: maximum 30 characters;
- promotional text: maximum 170 characters;
- description: maximum 4,000 characters;
- keywords: maximum 100 bytes;
- Privacy Policy URL: required;
- Support URL: required and must lead to actual user contact information;
- App Privacy answers must include data collected by SHIFT6 and integrated third-party partners;
- data processed only on-device and never transmitted off-device is not considered collected for the
  App Privacy label;
- if account creation is supported, users must be able to initiate account deletion from within the
  app. Sign in with Apple tokens must also be revoked when that account is deleted.

### Google Play

- app name: maximum 30 characters;
- short description: maximum 80 characters;
- full description: maximum 4,000 characters;
- a comprehensive privacy policy must be linked from Play Console and available in the app;
- if account creation is supported, account deletion must be available in-app and through a
  functional external web resource;
- on-device-only data does not count as collected in the Data safety form;
- all Play apps must complete the Health apps declaration;
- Health Connect access must be declared in Play Console and limited to the minimum data types needed
  for user-facing health/fitness functionality.

Official references:

- https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/support/offering-account-deletion-in-your-app
- https://support.google.com/googleplay/android-developer/answer/9859152
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/14738291
- https://support.google.com/googleplay/android-developer/answer/16558241
- https://developer.android.com/health-and-fitness/health-connect/data-types

## Proposed store identity

These values fit the current field limits but still require Cameron/design approval before
submission.

| Field | Draft |
| --- | --- |
| App name | `SHIFT6` |
| Apple subtitle | `Six weeks. One goal.` |
| Primary category | Health & Fitness |
| Secondary category | Optional; leave unset unless store strategy requires one |
| Google short description | `Pick one goal. Train with a clear plan. See what actually changed.` |
| Apple promotional text | `Choose one measurable goal, follow focused sessions, return after life interrupts, and review real progress after six weeks.` |
| Apple keywords | `fitness,workout,strength,training,exercise,gym,home gym,cardio,mobility,progress` |

Recheck platform character limits before submission; the earlier counts below described older copy:

- app name: 6 / 30;
- Apple subtitle: 29 / 30;
- Google short description: 80 / 80;
- Apple promotional text: 153 / 170;
- Apple keywords: 80 bytes / 100 bytes.

## Draft full description

SHIFT6 organizes training into focused six-week cycles so you always know what to do today, what
changed, and what comes next.

Choose one reviewed goal and record where you started. Follow today's session, log it offline,
and return after interruptions without catch-up pressure. At six weeks, compare measurements made
under the same protocol and choose what comes next. A specific result is not guaranteed.

Built around clear six-week reviews:

- Pick one reviewed Shift and follow a focused six-week plan.
- Log the measurements relevant to your Shift.
- Resume unfinished workouts and keep training without a network connection.
- See completed sessions separately from actual measured improvement.
- Pause, adjust a schedule, repeat a week or return with a suitable session.
- Review your block with or without a final test, then maintain, repeat, adjust, choose another goal or take a planned break.
- Export or delete local training data from the app.

SHIFT6 is general fitness and wellness software. It does not diagnose or treat medical conditions,
prescribe rehabilitation, or provide medication or insulin-dosing advice. Health connections are
optional, and core workout logging remains usable without health permissions.

### Copy verification before submission

Do not publish the description until all of these are true:

- every enabled Shift and referenced exercise has content review and passes the focused manifest gate;
- all named interactions are present and verified in the exact signed build;
- Apple Health / Health Connect declarations match the actual signed binaries;
- export/delete language matches both local and remote account behaviour;
- no feature named above is disabled behind an unreleased feature flag.

## Screenshot story board

Do not create final screenshots until Figma/native visual QA is approved. The recommended sequence is:

1. **Pick one goal** — reviewed Shift selection and honest baseline.
2. **Know what to do today** — one active Shift and clear next action.
3. **Train without distractions** — offline-capable focus session.
4. **Life happens. Keep going.** — pause and re-entry.
5. **See what actually changed** — comparable result, clearly separate from adherence.
6. **Choose your next Shift** — optional test, review and next choice.

Screenshot rules:

- use real release-candidate UI, not Figma-only mockups represented as product screenshots;
- do not show placeholder exercise imagery or unreviewed technique as approved content;
- do not imply medical diagnosis, injury treatment, calorie precision, or autonomous AI decisions;
- do not show health permissions as mandatory;
- include representative large-text QA before final capture;
- keep screenshots synchronized with the build submitted for review.

## App Review / Play review notes draft

Use this as a starting point after signed builds and review credentials exist:

> SHIFT6 is a general fitness and wellness app organized around six-week training cycles. Core
> workout logging works in guest mode and without Health permissions. Health connections are
> optional and read only the specific data types shown to the user. Coach suggestions never apply a
> meaningful plan change without explicit user approval. The app does not provide diagnosis,
> rehabilitation prescriptions, or medication/insulin-dosing advice.

Add before submission:

- exact guest path from launch to first workout;
- review/demo account only if a signed build contains account-only features;
- steps for exercising offline/reconnect behaviour;
- steps for HealthKit / Health Connect permission review;
- account-deletion path after the real backend is connected;
- any feature flags or reviewer-specific staging configuration.

## Privacy and data-safety inventory

This table describes the current code boundaries. `Store declaration` is provisional because the
production backend/auth/analytics/crash/AI providers are not yet selected and their retention
behaviour is unknown.

| Data class | Current SHIFT6 handling | Leaves device today? | Provisional store treatment |
| --- | --- | --- | --- |
| Guest profile/preferences | SQLite local profile | No, unless authenticated backend sync is configured | On-device only in guest/local mode; re-evaluate for production account sync |
| Equipment inventory | SQLite; may be part of profile sync | Only when authenticated sync is configured | App functionality if retained by backend |
| Programs/workouts/set history | SQLite + idempotent sync outbox | Yes when authenticated backend sync is configured | Health & Fitness / app functionality if server-retained |
| Workout notes/check-ins | Local records; some records have sync boundaries | Potentially when backend sync is configured | User content / Health & Fitness depending final payload and retention |
| Manual weight | Local `body_metrics`; excluded from analytics and sync | No | On-device only; not collected unless future remote policy changes |
| Movement/accessibility preferences | Local `user_considerations`; excluded from analytics and sync | No | On-device only; not collected unless future remote policy changes |
| Apple Health / Health Connect summaries | Explicit opt-in import to local `health_summaries`; not placed in workout sync outbox | No by current mobile code | On-device only for store collection labels; Health Connect declaration still required for permissions |
| Coach free-text prompt | Provider gateway boundary | Yes when provider-backed Coach is configured | User Content; final collection/sharing depends provider retention/contract |
| Coach structured facts | Minimized allowlisted context | Yes when provider-backed Coach is configured | Health & Fitness / User ID as applicable; final declaration depends retention |
| Account identifier/email | Auth boundary not yet production-configured | Expected when account provider is connected | User ID / Email Address for app functionality; provider contract must be reviewed |
| Analytics events | No-op by default; strict event/property allowlist exists | No until production analytics adapter is selected | App Activity if a retained production provider is added |
| Crash/error data | No-op error reporter by default; allowlisted technical context contract exists | No until production error provider is selected | Diagnostics if a retained production provider is added |
| Precise/coarse location | Not part of current product data model | No | Do not declare/request unless product scope changes |
| Advertising/tracking identifiers | Not part of current product scope | No | No tracking intended; re-audit every production SDK |
| Payments/subscriptions | Not part of free launch implementation | No | None unless monetization is added |

### Mandatory pre-submission network audit

Store labels must reflect the signed release build, not architectural intent. Before completing Apple
App Privacy or Google Data safety:

1. run the signed iOS and Android release candidates through a network proxy/traffic audit;
2. inventory every request made by app code and every bundled SDK;
3. map each transmitted field to destination, purpose, retention, encryption, account linkage and
   deletion behaviour;
4. verify that Health summaries, manual weight, accessibility/movement preferences, private notes
   and Coach content do not leave the device except through explicitly intended boundaries;
5. reconcile the observed network behaviour with App Privacy, Data safety, the privacy policy and
   in-app disclosures;
6. repeat after adding or upgrading analytics, crash, auth, backend or AI-provider SDKs.

## Apple App Privacy provisional mapping

Do not enter this into App Store Connect until production providers are finalized.

Potential data categories if the production backend/provider retains current remote payloads:

- **Contact Info → Email Address** — account creation/authentication, if email auth is enabled;
- **Identifiers → User ID** — account and sync ownership;
- **Health & Fitness → Fitness** — synced training/workout data and minimized Coach facts if retained
  off-device;
- **User Content → Other User Content** — Coach prompts or retained notes where applicable;
- **Usage Data → Product Interaction** — only if a retained analytics adapter is enabled;
- **Diagnostics → Crash Data / Performance Data** — only after a production observability provider
  is enabled and its payload is audited.

Current local-only Health imports, manual weight, and movement/accessibility preferences are not
Apple `collected` data while they remain exclusively on-device.

Tracking/advertising: **none intended**. Do not make this declaration final until every production SDK
has been audited for secondary use or cross-app tracking.

## Google Play Data safety provisional mapping

Do not submit this mapping until the production network audit is complete.

Potential collected categories when remote services are active:

- Personal info: email address and user IDs for account functionality;
- Health and fitness: workout/training data retained by the authenticated backend;
- App activity: app interactions only if a production analytics service retains them;
- App info and performance: crash/diagnostic data only if a production observability service retains
  it;
- Other user-generated content: retained Coach prompts or free-text notes where applicable.

Current Health Connect reads, local manual weight and local consideration preferences remain
on-device in the current architecture and therefore are not `collected` for the Data safety form.
However, SHIFT6 still uses Health Connect permissions and must complete the Health apps declaration
and Health Connect access declarations.

Sharing must be evaluated separately from collection. A production service provider may qualify for
policy exceptions in some cases, but do not assume an exception; document each recipient and verify
Google's current definition when completing the form.

## Health Connect declaration inventory

Current Android adapter requests read access only to the supported user-selected types:

- Steps;
- ExerciseSession / workouts;
- HeartRate;
- RestingHeartRate;
- SleepSession;
- Weight.

Before Play submission:

- confirm every requested type still appears in the signed Android manifest/config;
- justify each requested type with a visible user-facing feature;
- remove any permission without a live feature;
- complete the Health apps declaration in Play Console;
- complete Health Connect data-type access declarations;
- verify explicit opt-in, partial grant, denial, revocation, disconnect and deletion behaviour;
- ensure the privacy policy names each accessed health/fitness category and describes local storage,
  retention and deletion accurately.

## Account deletion release blocker

SHIFT6 currently supports local guest-data deletion, but production remote account deletion remains
unverified. Do **not** ship account creation until this gate is closed.

Required before public account creation:

### iOS

- a clear in-app path to initiate deletion of the complete account and associated deletable data;
- backend deletion of associated data rather than only local deletion/deactivation;
- clear handling of any legally retained data;
- if Sign in with Apple is supported, revoke the user's Sign in with Apple tokens.

### Google Play

- a clear in-app account deletion path;
- a public web resource where a user can request deletion without reinstalling the app;
- the deletion-resource URL entered in Play Console's Data safety/account-deletion fields;
- associated user data deleted from SHIFT6 and applicable service providers, subject only to clearly
  disclosed legitimate retention requirements.

Until remote account deletion exists, either keep account creation out of the public release build or
complete the deletion implementation before store submission.

## Required URLs — unresolved blockers

Do not invent or point these at unrelated pages.

- Privacy Policy URL: **REQUIRED — not yet supplied/verified**
- Support URL with real contact information: **REQUIRED — not yet supplied/verified**
- Google external account-deletion URL: **REQUIRED if account creation ships — not yet supplied**
- Optional Apple Privacy Choices URL: **recommended once web privacy controls exist**
- Marketing URL: optional
- Apple accessibility URL: optional but useful after the accessibility audit is published

## Legal/policy copy that must exist before release

The public privacy policy must match actual production behaviour and cover at minimum:

- identity of the developer/operator;
- categories of account, training, health, Coach, analytics and diagnostics data actually handled;
- what remains on-device versus what is transmitted off-device;
- purposes for each transmitted data class;
- third-party processors/providers and their roles where required;
- retention/deletion rules;
- account deletion process;
- local export/delete controls;
- HealthKit / Health Connect permissions and how imported summaries can be disconnected/removed;
- AI/Coach processing and whether prompts/context are retained or used for provider training;
- security practices at an accurate, non-misleading level;
- user contact/support method;
- applicable regional privacy rights after legal review.

Do not publish a legal privacy policy generated solely from this technical inventory without legal
review appropriate to the release jurisdictions.

## Store submission blockers checklist

- [ ] PR #282 verified and merged.
- [ ] PR #283 verified and merged if the optional local profile/body-metric scope ships.
- [ ] `npm run verify` and CI green on the final release candidate.
- [ ] Every enabled Shift and referenced exercise has traceable human content review and is reachable only through the focused release manifest.
- [ ] All public programs and exercise technique/media reviewed.
- [ ] Final Figma/icon/store artwork approved.
- [ ] Signed iOS and Android release candidates pass the native QA matrix.
- [ ] Production auth/backend configured and security/RLS checks passed.
- [ ] Remote account deletion works end to end.
- [ ] Production AI provider/model/privacy/retention configuration verified.
- [ ] Production analytics and crash-reporting providers audited, or intentionally remain disabled.
- [ ] HealthKit / Health Connect native permission and deletion flows verified.
- [ ] Notification/background behaviour verified on representative devices.
- [ ] Privacy Policy URL live and accurate.
- [ ] Support URL live with real contact information.
- [ ] Google account-deletion web resource live if accounts ship.
- [ ] App Privacy and Data safety forms reconciled against a signed-build network audit.
- [ ] Health apps / Health Connect declarations completed.
- [ ] Final screenshots and descriptions match the submitted build.
- [ ] Explicit Cameron approval obtained before store submission or production rollout.
