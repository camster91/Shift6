# SHIFT6 mobile guest release verification

Updated: 2026-10-12. Current delivery scope: **iOS and Android, guest-only,
local storage**. [Doc 33](33_MOBILE_GUEST_RELEASE.md) records implementation and
build evidence; [doc 34](34_HUMAN_USE_ACCEPTANCE.md) defines human-use acceptance.
The [goal-first contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) remains the product
ambition. This runbook does not claim that every ambition is already delivered.

No backend, account provider, web export, remote Coach or remote telemetry is
required for this release. Their historical contracts apply only if those
features are deliberately enabled later. Store submission is a separate action.

## 1. Freeze the candidate and verify engineering

Use Node 22 and the committed lockfile in a clean checkout:

```bash
npm ci
npm run verify
npm run validate:release-assets
```

The verify command checks formatting, lint, types, Expo Doctor, assets, secrets,
release configuration, production dependencies at moderate severity, private
vendor source integrity, security regressions, Jest, and **iOS/Android** exports.
Record the SHA and complete results. See doc 33 for existing successful runs.
Re-run after relevant source/configuration changes, not merely to increase counts.
Private dependency forks need independent review; zero audit findings is not a
security certification.

## 2. Build and identify native artifacts

The native-validation workflow compiles a test-signed Android APK and an unsigned
iOS simulator app. It installs and cold-launches the iOS app. Neither artifact is
a store distribution build, and a simulator process does not prove usability.

For physical iOS testing and store distribution, link the owner's Expo project
and configure Apple/Google signing. This environment is not logged into EAS.
Use the owner's accounts and approved build quota; never put credentials in chat
or the repository. Record build ID, source SHA, artifact hash, signing identity
and application ID (`com.shift6.app`). Inspect the exact binary's permissions,
entitlements, dependency contents and network behavior.

Keep the public manifest empty until qualified review approves exact content
versions. `npm run validate:release-ready` is a **submission** gate: production
configuration, real public policy/support URLs, actual network audit evidence,
content review and final assets are required. Repository verification passing
does not imply this stricter gate passes.

## 3. Physical-device matrix

Use a small supported iPhone, a current large iPhone, and low/mid-range and current
Android phones. Record model, OS, build ID, installation method and enabled
settings. Test both platforms with default and largest accessibility text,
VoiceOver/TalkBack, reduced motion and keyboard visible. Check a tablet-sized
layout if distribution permits tablets. Capture each critical state; black,
loading or cropped screenshots are not accepted evidence.

## 4. End-to-end guest journey

Use a fresh install and a **private user-authored plan**, or an explicitly
reviewed enabled public plan. Do not bypass the empty public manifest for testing
or assume an old public program is startable.

1. Complete six-step setup, skipping optional health access. Confirm optional
   permissions and details can be revisited without restarting setup.
2. Create a simple private plan and start a cycle. Note any guidance required;
   inability to get to a first session is a product blocker.
3. Open Personal goal and review. Choose a metric, setup/assistance and target;
   provide required rep count or fixed distance. Establish or defer a baseline.
4. Start a workout, log a set, clear an input and make a correction. Confirm
   suggestions are distinguishable from actual recorded effort and measurements.
5. Turn off connectivity, continue logging, background, force-close and reopen.
   Compare every saved value and draft with the pre-interruption record.
6. Finish partially, then test completed and skipped outcomes separately. They
   must not become equivalent records or overwrite completed history.
7. Enter an explicit dated goal measurement. Test zero where valid, invalid
   values, future dates, and explicit yes/no for completion. Correct a mistake;
   verify original history remains and the correction date is preserved.
8. Revise a target with a reason. Review the completed cycle; postpone or decline
   measurement and select a next choice. A recorded choice must not imply a new
   plan has been started. Test older-history access and comprehension too.
9. Return after a missed week. Observe the actual calendar and return controls;
   do not assume the full pause/re-entry ambition is implemented. Record friction.
10. Export a large history as a JSON file through native sharing. Open the received
    file outside SHIFT6 and check completeness. Explain that export is not an
    in-app restore feature or a cloud backup.
11. Delete local records and cached export copies. Check that old local records
    cannot reappear. Recipient copies outside the app remain the user's property.

Repeat the critical journey with screen readers and large text. Any lost data,
unsafe comparison, unusable primary action or inability to reach the first
workout blocks release. Tests and screenshots supplement observed behavior.

## 5. Optional permissions and motion

Test health skip, deny, grant and OS-level revoke on supported devices. Verify
read-only declared types, explicit import, duplicate handling, accurate sources,
disconnect and removal of local summaries. Core logging must remain usable.

Test reminders and timer cues with permission denied and granted; check Android
13+ channel creation before permission, deep links from cold/background states,
expired/cancelled reminders and timer behavior through interruptions. Verify no
permission denial blocks training.

Higgsfield media must display its poster when playback fails. Test reduced-motion
changes, backgrounding, navigation away and audio behavior. Optional silent
playback must not obstruct a task or imply reviewed exercise technique.

## 6. Privacy, content and store gates

Inspect traffic from the exact distribution candidate during setup, workout,
health import, export and deletion. Record destinations and payload categories
without retaining personal records. Confirm account, sync, provider Coach,
remote analytics and crash reporting remain disabled. Local SQLite uses OS
sandboxing, not app-level database encryption. Verify OS backup disclosures.

Use [exercise review](24_EXERCISE_REVIEW_CHECKLIST.md) and program review evidence
before enabling public content. Review the *enabled* native capabilities and
third-party behavior before completing Apple privacy, Google Data safety and
health declarations. Use actual screenshots and a working public policy and
support destination. Historical store copy in doc 15 is not final guest copy.
Never advertise cloud backup, approved starter plans or automatic next-plan
transitions when unavailable.

## 7. Rollout, recovery and evidence

Before submission, define support ownership, a limited rollout, stop criteria
and a replacement-build path that preserves local data. With no remote feature
switch or backend, stopping rollout cannot remotely repair installed copies.
Test upgrades from the prior supported schema and forward recovery; never use
local-data deletion as routine rollback. Do not promise in-app export restoration.

Retain source SHA, verification logs, binary IDs/hashes, device matrix, journey
recordings, accessibility and permission results, network review, content
approvals, final listing/declarations and rollout decisions. Use doc 34 to record
unverified and failed checks explicitly. No human result or approval is implied
by a green CI run.
