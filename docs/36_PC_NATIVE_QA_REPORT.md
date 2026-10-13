# Windows native Android QA and provisional assessment

Evidence collected **2026-10-12–13** (UTC captures extend into October 13;
host timezone America/Toronto). Status: **native engineering QA completed for
the observed journeys below; release acceptance remains incomplete**.

**Provisional engineering assessment: 53/100. Human-use score: unverified.**
There were **0 participant usability sessions**, no six-week cohort and no
physical-device matrix. This is not a 53% user task-success rate. The weights
come from [doc 34](34_HUMAN_USE_ACCEPTANCE.md); engineering credit reflects
demonstrated implementation and emulator behavior, not satisfaction of its
participant-based full-credit criteria. Unknown weight remains in the denominator.

## Execution and candidate identity

| Item | Observed record |
| --- | --- |
| Selected / actual computer | Local PC / `CAM-DESKTOP`; no alternate computer used |
| Host | Windows 11 Home 10.0.26200, native Android SDK/JDK tooling |
| Emulator | Pixel 7 AVD, Android 16 / API 36, serial `emulator-5554`, x86_64 |
| Acceleration | Windows Hypervisor Platform (WHPX), GPU host NVIDIA GTX 1660 SUPER |
| Automation | User-authorized ADB UI automation, screenshots/UI trees, force-stop/relaunch and exported-record inspection |
| Native runtime | Standalone installed Android release-test APK; **not Expo Go** |
| Effective task permissions | Runtime unrestricted filesystem, network enabled, approval policy never; store/paid/production actions still outside this QA instruction |
| Baseline | `4e8a2c9b`, merged guest release |
| Initial fix candidate | `ae303bd8`, setup/local-storage/catalogue/goal-unit fixes |
| Permission fix candidate | `af0d0540`, notification denial and guest copy |
| Final app source | `b131a9e66c7156b9e0d62dd5e4b66e9b10883eab`, large-text wrapping |
| Final APK SHA-256 | `FC1EC5E5EDCBEEEAC5F97AD133E43B830315E006C34D11F93053DF936C0F7E16` |
| Local final artifact | `C:\Users\camst\s6qa\android\app\build\outputs\apk\release\app-release.apk` |
| Signing | APK verification passed v2, one signer; QA signing is not proof of store distribution credentials |
| iOS | Pending on this Windows task; no Mac simulator or signed physical-iPhone candidate tested here |

The app package is `com.shift6.app`. Baseline recovery/partial/export journeys
were exercised before upgrading the same installation. Goal and optional-feature
checks used the later candidates. The final `b131a9e6` was installed with upgrade
preservation and received fresh six-step setup/private-builder smoke checks.
Do not interpret this as a complete rerun of every matrix row on the final binary.

## Observed native journeys

All records were synthetic; no physical exercise or real health data was required.
ADB activation and script assistance are automation, not independent human use.

| Requested check | Observed result and limits | Evidence |
| --- | --- | --- |
| Six setup steps | Completed goal, experience, equipment, schedule/training time, units and summary/save. Required-field guidance was observed after fixes. Force-close during setup restored selections and the current step. Final candidate repeated all six steps, including 200% text guidance on steps 1–3 and force-close recovery at step 3. | [Time guidance](qa/2026-10-13/candidate-step4-time-guidance.png), [recovery](qa/2026-10-13/candidate-setup-force-close-recovered.png), [summary](qa/2026-10-13/candidate-step6-local-summary.png) |
| Private program | Used blank private builder, named a plan, added `QA Session`, added custom timed movement `QA Hold`, saved a 30-second target and 20-second rest, then started a cycle. Actual exported program/version/custom-exercise records confirmed additions. Public content gate stayed intact. | [Workout added](qa/2026-10-13/baseline-workout-added.png), [custom movement](qa/2026-10-13/baseline-custom-added.png), [private entry](qa/2026-10-13/candidate-public-gate-private-entry.png) |
| Personal goal | Imperial load-for-five-reps goal: target 100 lb, explicit baseline 80 lb, later 90 lb measurement, correction to 88 lb preserving original measurement date, target revision to 110 lb with reason, and recorded maintain review. Export confirms canonical kg values and append-only events. | [Imperial choices](qa/2026-10-13/candidate-imperial-goal-units.png), [created](qa/2026-10-13/candidate-goal-created.png), [correction](qa/2026-10-13/candidate-goal-correction.png), [revision](qa/2026-10-13/candidate-goal-revision.png), [review](qa/2026-10-13/candidate-goal-review.png) |
| Saved and unsaved workout recovery | Entered/saved 35 seconds for set 1, entered 45 seconds in set 2 without completing it, disabled connectivity, force-stopped and reopened. Both saved value and draft input reappeared; resume remained available. | [Recovered values](qa/2026-10-13/baseline-offline-sets-recovered.png) |
| Partial completion | Stopped early using time-limited reason. Export records one 35-second completed set and `status: partial`, week 1, rather than inventing completion of remaining sets. Completed workout drafts subsequently clear. | [Partial saved](qa/2026-10-13/baseline-partial-saved.png), exported-record inspection |
| External JSON export | Native sharing delivered a JSON file to a separate local receiver app, which opened and parsed it. Baseline: schema 12, 9 records. Later candidate: schema 12, 22 records, 17,474 bytes. This is export, not a tested restore feature. | [Outside-app reader](qa/2026-10-13/candidate-export-opened-outside.png) |
| Local deletion | Confirmed deletion, displayed a deletion-success notice; force-close/relaunch then returned to fresh setup. A later export verified old goal, journal, observations, set, session and private-plan IDs were gone; only the new synthetic setup/plan/cycle remained (7 records). The receiver's separate export copy remained byte-identical and readable. Deletion does not retract files already shared outside the app. | [Deletion success](qa/2026-10-13/candidate-deleted-fresh-setup.png), [after relaunch](qa/2026-10-13/candidate-deleted-force-close.png) |
| Navigation/keyboard | Core journeys traversed native screens with scrolling, keyboard entry and tab/back navigation. Offscreen/focus harness failures were corrected by observed-state targeting. Final candidate entered/read back a workout name with the keyboard at 200% text; the Home duration badge and card footer were visually retested after wrapping fixes. | [Harness focus observation](qa/2026-10-13/harness-focus-observation.png) |
| Notifications | Actual Android permission prompt denied once, reproducing incorrect status. After fix, denial displays Denied and an explicit retry; a grant succeeded and saving preferences honestly reported no upcoming workout reminders for this synthetic cycle. This does not prove scheduling or delivery. Delivery/tap-through at the scheduled time and reboot/timezone matrix remain untested. | [Before](qa/2026-10-13/candidate-notification-denied.png), [fixed denial](qa/2026-10-13/candidate-notification-fixed-status.png), [local copy](qa/2026-10-13/candidate-notification-fixed-local-copy.png), [no upcoming reminders](qa/2026-10-13/candidate-notification-scheduled.png) |
| Optional health | Android Health Connect availability, consent UI, denial and allowed empty import observed. No real health records existed; pagination/deduplication, partial grants and revoked-access recovery are not established by the empty import. | [Empty import](qa/2026-10-13/candidate-health-empty-import.png) |
| Large text/accessibility | 2x text reproduced a clipped home duration label; final code allows home/workout label wrapping. Fresh setup remains usable in observed captures. Final 2x Home/card and keyboard retests passed visually. TalkBack was bound with touch exploration enabled, but ADB could not reliably dismiss its own notification prompt; app screen-reader journeys remain blocked by this harness. System reduced motion removed the optional play control and restoring the setting brought it back. Original emulator font/motion/service settings were restored. | [Before clipping](qa/2026-10-13/candidate-large-text-home.png), [final setup](qa/2026-10-13/candidate-b131-fresh-setup.png) |
| Media | Existing Higgsfield artwork and optional animation controls observed. Native Play/Stop controls, user Stop, and immediate background-stop behavior were exercised. Separate captured video frames were also retained; error/corrupt-media fallback was not exercised. Custom movement has no media in this fixture; user-supplied media playback remains untested. | [Play state](qa/2026-10-13/candidate-motion-frame1.png), [user Stop](qa/2026-10-13/candidate-motion-user-stopped.png), [reduced motion](qa/2026-10-13/candidate-reduced-motion-home.png) |

The external schema-12 record was independently parsed during report preparation.
It contains six personal-goal journal entries (creation, three measurements,
target revision and review), the original 90 lb measurement plus its 88 lb
correction, one 35-second set and one time-limited partial session. Display units
are pounds while stored goal values are kg (80 lb = 36.2873896 kg; 110 lb =
49.8951607 kg). These are entered records, not measured fitness outcomes.

## Reproduced findings and fixes

All findings below share the device/OS above. Captures retain their original
synthetic contents and filenames. No public fitness approval was fabricated.

| Finding / source | Reproduction | Expected versus actual before fix | Fix and retest evidence |
| --- | --- | --- | --- |
| Guest draft sync promise, baseline `4e8a2c9b` | Save a private draft in guest mode. | Expected honest local persistence; actual “queued for sync” despite disabled sync. Dev storage absence could also produce a saved badge. | `ae303bd8`: local/no-cloud/export copy; real storage required; failed retries clear prior success. Four focused component regressions passed. [Before](qa/2026-10-13/baseline-guest-sync-copy.png). Candidate saved-banner screenshot not available here; do not infer a native visual retest from component checks. |
| Required training time hidden, baseline `4e8a2c9b` | Setup step 4: select days and duration without scrolling to time choice. | Expected explanation of missing requirement; actual disabled Continue without guidance. | `ae303bd8`: reachable missing-field hint includes usual time and scroll instruction. Native final candidate observed guidance and successful continuation. [Before](qa/2026-10-13/baseline-step4-missing-time.png), [after](qa/2026-10-13/candidate-step4-time-guidance.png). |
| Guest account promise, baseline `4e8a2c9b` | Read setup summary. | Expected no account/cloud promise; actual promised future account migration in an account-disabled release. | `ae303bd8`: conditional guest device-only/account-unavailable/export copy. [Before](qa/2026-10-13/baseline-setup-step6.png), [after](qa/2026-10-13/candidate-step6-local-summary.png). |
| Empty catalogue misdiagnosed as filters, baseline `4e8a2c9b` | Open Programs with empty public approval manifest. | Expected review boundary and workable private route; actual offered clearing filters to see a nonexistent launch catalogue. | `ae303bd8`: honest review message, prominent blank private-builder CTA, inactive filter/template-copy controls hidden. Manifest unchanged. [Before](qa/2026-10-13/baseline-programs.png), [after](qa/2026-10-13/candidate-public-gate-private-entry.png). |
| Imperial personal-goal inputs ambiguous, baseline `4e8a2c9b` | Set Imperial preferences, create load/distance goal. | Expected pounds/miles displayed consistently; actual canonical kg/meters choices could confuse entries. | `ae303bd8`: explicit preference-aware input labels/conversion; recovered drafts retain their declared units. Native pounds entry and canonical export verified. [Before](qa/2026-10-13/baseline-imperial-goal.png), [after](qa/2026-10-13/candidate-imperial-goal-units.png). |
| Notification denial mislabeled, initial fixed candidate `ae303bd8` | Deny first Android notification request; OS returns denied with canAskAgain true. | Expected Denied with user-controlled retry; actual Not requested because mapping used retry capability as status. | `af0d0540`: honors denied OS status, recognizes iOS provisional status, retains explicit retry and no automatic prompt. [Before](qa/2026-10-13/candidate-notification-denied.png), [after](qa/2026-10-13/candidate-notification-fixed-status.png). |
| Notification guest sync promise, `ae303bd8` | Read notifications footer in guest mode. | Expected local-only choices; actual authenticated-sync promise. | `af0d0540`: guest local/no-cloud footer, connected disclosure retained. [Before](qa/2026-10-13/candidate-notification-sync-copy.png), [after](qa/2026-10-13/candidate-notification-fixed-local-copy.png). |
| Large-text clipping, `af0d0540` | Set emulator font scale to 2 and open active-cycle home/workout card. | Expected visible duration/actions; actual duration badge extends outside card. | `b131a9e6`: home/workout label layouts wrap. [Before](qa/2026-10-13/candidate-large-text-home.png). [After](qa/2026-10-13/candidate-large-text-home-fixed.png): native 2x retest confirms badge stays within the viewport and footer labels wrap onto separate lines. |

## Automation and setup failures are separate findings

The initial native UI-control tool timed out; the user authorized ADB automation.
ADB then controlled this PC's accelerated emulator. Wrong labels, offscreen
controls, keyboard focus/idle timing and a failed workout-name action were
harness failures until fresh UI/record inspection established what the app saved.
An apparent action success was never accepted as proof a workout existed; the
exported workout, movement, cycle, set and journal records provide that check.

One focused component test timed out under simultaneous native-build host load;
an unchanged rerun passed in 6.733 seconds. This is not an app usability defect.
Local npm subprocess PATH needed the observed Node directory prepended for that
process. Android SDK/tool setup and Windows native build path-length failures
were resolved with installed tooling and a fresh short-path checkout. A generated
cache-deletion action was rejected by automatic approval review; no identical
retry or security-setting bypass was made. Work continued in the fresh checkout,
preserving the original source changes. These setup operations do not validate iOS.

## Source regression and build evidence

`verify-b131.log` in the sibling `shift6-native-qa` evidence directory records:

- `npm run verify`: formatting, lint and TypeScript passed.
- Expo Doctor **21/21**, asset/secret/release-configuration checks passed.
- Production dependency audit: **0 known vulnerabilities**; not a security certification.
- Vendored source/license inventory: **79 files**; security regressions **5 passed**.
- Jest: **524 tests in 88 suites passed**.
- iOS and Android Hermes bundle exports succeeded; exports are not native iOS QA.

`native-build-b131.log` records Android BUILD SUCCESSFUL (715 actionable tasks).
Final APK hash was read directly from the artifact and matches the identity above.
`candidate-signature-final.txt` confirms v2 verification with one Android Debug
signer, certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
ADB installed this final APK successfully with `-r`. None of this implies approved store signing or acceptance.

## Additional finding awaiting the next candidate

A private draft named `QA Saved Draft` saved successfully at `b131a9e6`, but
Programs exposes only the public catalogue/private blank-builder route. After
returning and force-close/relaunch, no saved-plan entry is available. Expected:
a user can find their own saved plan without an active cycle or a hidden route.
This is a discovery/access defect; do not describe the absence of a list as deleted
records. An isolated follow-up is adding owner-scoped discovery with explicit
immutable-copy semantics. [Saved](qa/2026-10-13/candidate-private-draft-saved.png),
[after relaunch](qa/2026-10-13/candidate-private-draft-after-relaunch.png).

## Provisional weighting and coverage

| Doc 34 area | Credit / weight | Engineering evidence and missing acceptance |
| --- | ---: | --- |
| Useful first experience | 12 / 20 | Six steps/private first session reachable; no independent intended-user completion or comprehension evidence |
| Training/measurement integrity | 16 / 20 | Real records, append-only correction, units, partial status and review inspected; full physical/comprehension matrix missing |
| Reliability/recovery | 9 / 15 | Emulator offline/force-close/upgrade/export/deletion observed; large-history and physical faults missing |
| Accessibility/ergonomics | 4 / 15 | Guidance, keyboard/label checks and clipping fix; full screen-reader/one-handed/device coverage missing |
| Privacy/user control | 6 / 10 | Guest boundaries, native consent/export/deletion; signed-candidate traffic audit and disclosures still pending |
| Visuals/motion | 4 / 5 | Real readable synthetic Android captures; motion/playback/reduced-motion and full device matrix incomplete |
| Fitness content/expectations | 1 / 5 | Review gate and private route honestly exposed; no approved public starter content or comprehension study |
| Sustained usefulness | 0 / 5 | No six-week cohort; unknown rather than a demonstrated product failure |
| Distribution/support | 1 / 5 | Native QA artifact and release preparations; store signing, acceptance and support rehearsal missing |
| **Total** | **53 / 100** | **Provisional engineering judgment; not human-use acceptance** |

Evidence coverage: **one Android emulator**, **zero physical devices**, **zero
iOS runtime checks in this task**, **zero recruited participants**, **zero
six-week pilot participants**, and **zero store acceptance results**. Automated
passing counts cannot fill those missing observations. Release remains blocked
by device/accessibility validation, qualified content review, human acceptance,
signed-candidate privacy/store requirements and any unresolved critical defect.

## Pending and untested work

1. Complete actual TalkBack critical journeys with a reliable harness and physical
   screen-reader users; the emulator service being enabled is not task success.
2. Run physical Android and signed iPhone/iPad matrix, including screen readers,
   permissions/revocation, reminder delivery/actions, offline faults and upgrades.
3. Verify user-supplied/corrupt media and error fallback, and repeat the observed
   bundled Higgsfield controls/background/reduced-motion checks on physical devices.
4. Test nonempty Health Connect records, duplicates, pagination and revocation;
   test restore only after an actual restore implementation exists.
5. Perform final candidate network/backup/privacy audit, qualified catalogue
   review, doc 34 moderated sessions and separately authorized six-week pilot.
6. Complete owner access/signing/support/store gates in
   [doc 38](38_STORE_RELEASE_CHECKLIST.md). No submission/publication occurred.

The broadened AI/voice/import/review backlog is a separate implementation scope.
No issue is considered closed by this QA report and no merged/published launch
or provider-backed Coach delivery is claimed.

## Exact local run paths

To install the already-built standalone QA APK on the current emulator:

```powershell
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $adb devices
& $adb -s emulator-5554 install -r 'C:\Users\camst\s6qa\android\app\build\outputs\apk\release\app-release.apk'
& $adb -s emulator-5554 shell monkey -p com.shift6.app -c android.intent.category.LAUNCHER 1
```

Verify the SDK location and serial on another PC; do not assume this fixed path
or emulator ID applies there. This QA signing may not match a store-installed
version; do not uninstall a user's records simply to solve a signing mismatch.

For a source run, preserve local changes, install the lockfile dependencies,
keep guest-only configuration/API URL empty and use `npm run android` (native
build) followed by `npm start` for Metro sessions. Follow
[doc 35](35_PC_QA_HANDOFF.md). Windows cannot run the iOS Simulator; iOS testing
requires the authorized Mac or an appropriately signed physical-device build.

Portable screenshots are in `docs/qa/2026-10-13/`, with byte sizes and SHA-256
inventory in [screenshots.json](qa/2026-10-13/screenshots.json). Raw actions,
UI trees, build logs and synthetic exports remain in the local sibling
`shift6-native-qa` directory; no private user records are included in this report.
