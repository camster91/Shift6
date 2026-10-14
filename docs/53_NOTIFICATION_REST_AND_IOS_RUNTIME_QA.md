# Notification, rest and iOS runtime QA increment

14 October 2026. Synthetic guest data only. The provisional engineering score
remains **53/100** under [doc 34](34_HUMAN_USE_ACCEPTANCE.md), using the dated
[doc 45 score](45_NATIVE_SCHEDULE_QA.md). Human acceptance is unknown. The
reconciled **55 issues remain open**; this report does not close issues or
authorize distribution.

## Exact candidates and source checks

Android app source is `0f2f44eddd9226ffb573d1cc8e257baeb9af3764`. Its full
`npm run verify` passes **1,270 tests / 146 suites**, Doctor **21/21** and both
exports. Its standalone guest release APK is x86_64, staging, with an empty API
base URL and dotenv disabled. SHA256:
`2e37891e3f521ab64a95b3538902ece28ff022fd17d4c165a26efee679919cab`.
The update install succeeds without clearing local data, and the installed
candidate matches the frozen artifact. Android device evidence identifies
`emulator-5554`, Google `sdk_gphone64_x86_64`, **Android 16 / API 36**, font scale
1.0. This is an emulator build, not a Samsung ARM or store-signed release.

Source fixes make workout reminder title/body generic, validate SDK default
notification actions and request/date identity, deduplicate cached/live taps
within the current mounted context and open Home rather than starting a
session. Owner/database/mount actors invalidate old callbacks and filter old
status immediately. Workout refreshes capture their input and serialize stale
cleanup before a successor; rest scheduling/cancellation preserves per-session
call order. Skip rest uses a render-bound context guard, clears the live timer
and requests cancellation. Cancellation failures show feedback only in the
current context. These changes preserve actual values and deterministic dose.

Independent source review initially requested Skip entry guards and refresh
actor/status fixes; the final source is accepted. Deferred native scheduling,
stale owner/database/ABA callbacks, immutable inputs and queue cleanup have
source regression coverage. Passing these checks is not native delivery proof.

- [Full verification receipt](qa/2026-10-14-coach-review/verify-integrated-0f2f44ed.status.json)
- [Native build receipt](qa/2026-10-14-coach-review/build-integrated-0f2f44ed.status.json)
- [Update install receipt](qa/2026-10-14-coach-review/coach-review-notification-install-0f2f44ed.json)
- [Independent source re-review](qa/2026-10-14-coach-review/notification-rest-rereview-0b997f90.json)

## Android observed passes and interrupted checks

All rows below use the exact Android candidate/device above. Expected behavior
is compared with actual observation rather than inferred from a filename.

| Check / reproduction                                                                                    | Expected                                                   | Observed evidence and limits                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Update install, resume the existing synthetic session, export and open JSON in the outside-app receiver | Keep all local records and entered values                  | Schema 17, 36 arrays and 1,084 records. Every saved value is unchanged; only `updated_at` in one workout draft and its load-unit map changes. The receiver is observed.                                                                                                              |
| Save a synthetic set, inspect the live rest card, then tap its fresh enabled Skip rest bounds           | Remove the running timer immediately; retain the saved set | Fresh before capture shows `90s`, REST TIMER and `1 of 5 sets`. Actual Skip tap is recorded. About 2.6 seconds later the timer and Skip control are absent while `1 of 5 sets` remains. This could not be explained by a natural 90-second expiry.                                   |
| Earlier `86a26c44` rest attempts                                                                        | Observe a live Skip action before assessing the app        | First helper loses its ordinary dump after Save; another uses the wrong observer class key; the timer subsequently expires. No safe Skip tap occurs. These are harness interruptions, not a reproduced native Skip failure.                                                          |
| First `0f2f44ed` helper and captures named `running-recovery` / `skipped-recovery`                      | Tap Skip and capture its result                            | The helper stops after Save when the ordinary dump is unavailable. A later bounds-type error occurs before tapping. Both named captures still show the timer; `skipped-recovery` is not evidence of a Skip action or recovery pass. The later positive receipt is separate evidence. |

The native notification permission is denied and reminder/rest preferences are
Off. **Device cue delivery, delayed delivery, native notification cancellation
and tap routing remain untested.** The observed live in-app timer pass does not
establish those checks. Source cancellation covers scheduled triggers; it does
not retract an already delivered tray entry. A native promise that never settles
can block serialized work, and cached-tap consumption is not durable across
restart. No timing or durable-delivery guarantee is claimed.

- [Upgrade export comparison](qa/2026-10-14-coach-review/coach-review-notification-upgrade-comparison-0f2f44ed.json)
- [Outside-app upgrade receiver](qa/2026-10-14-coach-review/coach-review-notification-upgrade-receiver-settled-0f2f44ed.png)
- [Live timer before actual tap](qa/2026-10-14-coach-review/coach-review-rest-live-before-tap-0f2f44ed.png)
- [Fresh before nodes](qa/2026-10-14-coach-review/coach-review-rest-live-before-tap-0f2f44ed.json)
- [After actual Skip](qa/2026-10-14-coach-review/coach-review-rest-after-actual-skip-0f2f44ed.png)
- [Positive tap receipt](qa/2026-10-14-coach-review/coach-review-rest-positive-0f2f44ed.json)
- [Positive helper log](qa/2026-10-14-coach-review/coach-review-rest-positive-0f2f44ed.log)
- [Earlier interruption classification](qa/2026-10-14-coach-review/coach-review-rest-before-fix-interruptions-86a26c44.json)
- [First new helper interruption](qa/2026-10-14-coach-review/coach-review-rest-after-fix-0f2f44ed.log)
- [Misleadingly named untouched-timer capture](qa/2026-10-14-coach-review/coach-review-rest-skipped-recovery-0f2f44ed.png)

## Later synthetic cycle and final export

The root operator finishes all five sets in QA Cycle B week 1, reviews a move
of only week 2 from 20 October to 14 October with the displayed time zone, starts
week 2 and saves its first actual hold as 14 seconds. The final outside-app JSON
is received and opened: schema 17, 36 arrays, **1,088 records**, exported at
`2026-10-14T16:12:23.658Z`. All 12 prior actual records retain their values; there
is exactly one new `duration_seconds: 14` actual, completed at
`2026-10-14T16:10:28.856Z`, for the week-2 session.

Seven arrays change: workout draft load units, schedule baselines, schedule
revisions, training cycles, workout sessions, completed sets and workout drafts.
The root operator's exact delta audit passes: the other 29 arrays, prior
baselines/revisions and all prior actuals remain unchanged. Only B advances from
week 1 to 2 with its weeks JSON; its prior session becomes complete with a
completion timestamp, and one new B week-2 session is in progress. One reviewed
20 October to 14 October move uses America/New_York and creates a new baseline.
The draft and unit map move to the new session with exact duration 14. These
bounded lifecycle/storage observations do not establish the full
repetition/return-prescription acceptance matrix.

The first receiver transition has no verified foreground and the first
comparison uses the wrong actual-duration field name. They remain harness
failures. The later settled receiver and comparison use the correct
`duration_seconds` field; this is a separate successful observation.

- [Final comparison](qa/2026-10-14-coach-review/coach-review-rest-final-comparison-0f2f44ed.json)
- [Settled final outside-app receiver](qa/2026-10-14-coach-review/coach-review-rest-final-export-receiver-settled-0f2f44ed.png)
- [Settled receiver native nodes](qa/2026-10-14-coach-review/coach-review-rest-final-export-receiver-settled-0f2f44ed.json)

## iOS: partial observations on older source

[Runtime run 38586889996](https://github.com/camster91/Shift6/actions/runs/38586889996)
fails on older source `0b997f90ff43370a655830eb72c3494a665d0a7f`, using native build
run `38583313337`. The source/payload manifest is preserved. Device is **iPhone
17 Pro simulator, arm64** on the hosted Mac. Appium reports platform version
**26.4**; Xcode's destination records **iOS Simulator 26.4.1**. Both recorded
strings are retained rather than assuming a different OS version.

The preserved result and 28 journey captures show partial native interaction:

- All six setup screens and required rhythm choices; force-close/reopen retains
  setup before final continuation.
- Public catalogue gate retained; private workout name and custom QA Hold
  movement added, draft saved, and dated/time-zone cycle confirmation followed
  by an active private cycle. Its captured start preview is 14 October / GMT.
- Imperial preference offers the pound-labelled goal type. The synthetic hold
  goal is saved without an invented baseline, then explicitly measured at zero,
  measured at 20 seconds, corrected to 25, revised to a 40-second target and
  review postponed. These are UI observations, not independent SQLite readback.
- Before force-close, the helper enters/saves set 1 as 20 seconds and enters
  unsaved set 2 as 12. Home offers Resume after restart. The failure hierarchy
  then shows focused set 2 with 12, `1 of 3 sets` and the Review all control.

The old helper waits for `Edit QA Hold set 1` before opening Review all. Focus
mode intentionally shows the current unfinished set; the saved-set control is
hidden until that explicit review action. The failure is an obsolete harness
expectation, not proof that the saved record was lost. **Saved set 1's 20 seconds
after restart has not yet been observed on iOS.** Partial completion, outside-app
JSON receipt and deletion are not reached by this failed journey.

- [iOS result](qa/2026-10-14-coach-review/ios-runtime-38586889996/results.json)
- [Actual native source manifest](qa/2026-10-14-coach-review/ios-runtime-38586889996/native-source.json)
- [Setup recovery](qa/2026-10-14-coach-review/ios-runtime-38586889996/09-setup-recovered-after-force-close.png)
- [Private cycle confirmation](qa/2026-10-14-coach-review/ios-runtime-38586889996/16-private-cycle-date-timezone-confirmation.png)
- [Goal correction](qa/2026-10-14-coach-review/ios-runtime-38586889996/23-goal-corrected-progress.png)
- [Target and postponed review](qa/2026-10-14-coach-review/ios-runtime-38586889996/24-goal-target-and-postponed-review.png)
- [Pre-restart actual/draft](qa/2026-10-14-coach-review/ios-runtime-38586889996/26-workout-saved-set-and-unsaved-draft.png)
- [Failure hierarchy](qa/2026-10-14-coach-review/ios-runtime-38586889996/28-failure-state.xml)
- [Failure screenshot](qa/2026-10-14-coach-review/ios-runtime-38586889996/28-failure-state.png)
- [Appium OS/source observations](qa/2026-10-14-coach-review/ios-runtime-38586889996/appium.log)

## Corrected helper and remaining acceptance

The new helper first reads the restored focused 12, explicitly opens Review all,
then requires saved 20 and unchanged draft 12. It does not weaken the assertions
or invent saved values. Bounded SQLite diagnostics use a fixed table/query
whitelist, guest/QA record filters, read-only URI, `query_only`, closed connections,
10-row and 8,192-character bounds with explicit truncation/counts.

Diagnostics default to skipped. Only the intended fresh hosted macOS workflow,
verified source/payload and visible initial setup step one arm collection;
unconfirmed runs do not even invoke the container locator. Its scope explicitly
includes synthetic guest setup/profile and the named QA workout/goal. Independent
source/privacy review accepts exact helper SHA
`D19960A6632D461CC5872CBF18C0DABC67B132589892AD6E10128F79851867C9`
and test SHA `1D962ACE9253D4321AD3CD276EA1EAC780BDDEB757293E391833A8D9B3E2204E`.
**16 offline tests** pass; these are not native iOS acceptance. Earlier fixture,
test-loading and connection harness failures stay preserved. A fresh native run
with the corrected helper is pending.

Physical Samsung S25 Ultra/iPhone, current-source complete iOS journey,
notification permission/delivery/tap matrix, large-text rest controls, spoken
TalkBack/VoiceOver traversal, user comprehension and a consented six-week cohort
remain unverified here. Qualified public-content review stays gated. No source
test, simulator subset or corrected harness raises the score or closes issues.

- [Helper final scope receipt](qa/2026-10-14-coach-review/mobile-runtime-synthetic-scope-final-receipt.json)
- [Independent privacy closure](qa/2026-10-14-coach-review/mobile-runtime-helper-rereview-d19960a6.json)

## Run the exact Android candidate

```powershell
$qaAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$qaApk = "C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\app-release-0f2f44ed-x86_64.apk"
Get-FileHash -Algorithm SHA256 -LiteralPath $qaApk
& $qaAdb devices -l
& $qaAdb -s emulator-5554 install -r $qaApk
& $qaAdb -s emulator-5554 shell am start -n com.shift6.app/.MainActivity
```

Confirm the hash above and the verified emulator serial before installing. This
standalone native release needs neither Expo Go nor Metro nor a backend. Update
the existing package with `-r`; do not clear/uninstall it when preserving local
data. Use an ARM build for a Samsung phone, and separate signed artifacts and
explicit approval for store distribution.
