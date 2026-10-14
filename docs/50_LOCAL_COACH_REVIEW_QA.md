# Local Coach review, continuation and recovery QA

14 October 2026. Provisional engineering score remains **53/100** under
[doc 34](34_HUMAN_USE_ACCEPTANCE.md). Human acceptance is unverified. These are
synthetic operator checks on CAM-DESKTOP's WHPX/host-GPU Pixel 7 emulator,
Android 16/API 36 x86_64. ADB automation was authorized. No Expo Go, backend,
participants, physical Samsung device or local iOS runtime was used.

## Exact candidates

| Source                                     | Scope and evidence                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db4e8c290d8a801d5305ca57ffed414ecbd1d2dc` | Earlier installed candidate from doc 49. Dated review choices and the original recreation failure below.                                                                                                                                                                            |
| `7b93db4825dc6271a0a890bda1f2f470f00383b8` | Native confirmation modal and recovered continuation; full verify 1,158 tests / 142 suites, Doctor 21/21, both mobile exports. APK SHA-256 `fee779b18f083719ef4e1c7fda1e066a170c8423a2bd684b7e928642db4099e6`.                                                                      |
| `b00e62accb7258adb8df46f18b83fc21e35ff72e` | Promoted receipt/action, editable guided setup destination and owned database initialization. Full verify 1,173 tests / 144 suites, Doctor 21/21, both mobile exports. Native release build passed; APK SHA-256 `f0c4dcdc42fed84fe369a324242c2a3a04903586e30d40e6b47ed00c0de65428`. |

Source and build receipts/logs, external synthetic exports, screenshots and fresh
UI trees are in the [hashed evidence manifest](qa/2026-10-14-coach-review/manifest.json).
APKs are retained locally outside Git. Remote CI at `3738e8f3` completed Android
and unsigned iOS compilation, producer proof and iOS simulator cold launch
([terminal receipt](qa/2026-10-14-coach-review/native-ci-terminal-3738.json)).
That older CI result does **not** cover these new app changes or full iOS journeys.

## Observed passes

1. **Owned partial-session evidence.** On db4, Home > saved cycles > inspect
   the older private plan > Resume cycle > confirm, then Coach > Review recent
   training. The selected cycle has one actual time-limited partial session,
   one saved timed set and no personal goal. Review shows zero complete, one
   partial, zero skipped and zero in progress for the selected local dates.
   Summary shows 43 minutes elapsed since start, explicitly including time away
   and pauses; active exercise time is unmeasured. No completion or cycle advance
   is inferred. This is a different session from the earlier 588-minute example.
2. **Explicit dated decisions.** Skip question > Keep plan > Cancel leaves the
   journal unchanged. Editing the end date removes an existing preview; rereading
   those dates and confirming Keep plan adds one receipt with no optional answer.
   Answer Review available time > Review availability > Confirm adds one more
   receipt linked to its predecessor. Cold history retains both. From the cancel
   export to those confirmations, only `coachReviewJournal` changes; all 35 other
   arrays, including actuals, goals and versions, remain identical. Resuming the
   cycle earlier accounts separately for the 1,076→1,077 record change. See the
   [db4 comparison](qa/2026-10-14-coach-review/coach-review-conditional-comparison-db4.json).
3. **Modal and cold continuation.** On 7b, Keep plan opens a full-screen native
   confirmation with visible Confirm and Cancel at normal text size. Native Back
   cancels. Cold review recovers the most recent actionable dated intent; tapping
   Continue does not duplicate a receipt or save setup. Both external exports
   preserve all 36 arrays / 1,079 records. The route still led to the traditional
   ten-step setup, and the action required two scrolls; these were improved next.
4. **Action visible and direct editable destination.** On b00, cold review shows
   Latest saved dated intent and Continue to setup without scrolling, at normal
   and 200% text. Continue opens the editable guided summary with the actual
   Imperial/Morning/60-minute profile and explicit Confirm and save. Merely opening
   it preserves all 36 arrays / 1,079 records. See
   [entry](qa/2026-10-14-coach-review/coach-review-promoted-entry-b00.png),
   [large text](qa/2026-10-14-coach-review/coach-review-promoted-large-entry-b00.png)
   and [destination](qa/2026-10-14-coach-review/coach-review-guided-destination-b00.png).
5. **Scoped recreation stress.** Three foreground font-change rounds on b00 each
   verify the fresh recreated activity before routing: large Profile with actual
   60 minutes, large Summary with actual 43-minute elapsed explanation, normal
   Profile. All nine fresh screen assertions pass. The external export preserves
   all 36 arrays / 1,079 records. Font scale ends at 1.0. This proves only the
   tested sequence; see [stress receipt](qa/2026-10-14-coach-review/coach-review-database-stress-b00.json).
6. **Newest choice supersedes continuation.** On b00, Skip question > Keep plan >
   Confirm and save intent, then force-close and reopen. The latest Keep plan
   remains in history and no older Continue to setup action is offered. External
   JSON received and opened outside the app contains 1,080 records: exactly one
   new predecessor-linked receipt, with all other 35 sections unchanged. See
   [cold screen](qa/2026-10-14-coach-review/coach-review-keep-plan-cold-no-continuation-b00.png)
   and [comparison](qa/2026-10-14-coach-review/coach-review-keep-plan-comparison-b00.json).

## Failure, corrections and harness distinctions

On db4, a rapid foreground font change followed by route navigation produced
Summary unavailable and then the global Database unavailable gate. Try again
remained gated. Expected: readable saved records or successful retry. Force-close
recovered the actual profile; the external cold export was identical across all
36 arrays. The causal origin is **unproven**. The captured error-only log was
empty, which does not establish absence of errors. See the original
[database gate](qa/2026-10-14-coach-review/coach-review-font-recreation-db-unavailable-db4.png)
and [retry](qa/2026-10-14-coach-review/coach-review-font-recreation-retry-db4.png).
A separate background-first font sequence passed on db4; it does not erase the
foreground failure.

The accepted source fix uses an app-owned SQLite connection and serializes
opening, migration, cancellation and closing across retries/remounts. Failed or
stale initialization closes its owned handle once and cannot publish stale
success/errors. It removes the unsupported global claim that initialization
failure proves data was unchanged. The later stress pass supports the scoped
improvement; deliberately induced native initialization failure and warm retry
remain untested. No reset, deletion or schema change was introduced.

One b00 harness attempt sent a route intent while the activity was being
destroyed and observed Coach review instead of Profile. The assertion refused to
continue. This is retained as
[route mismatch](qa/2026-10-14-coach-review/coach-review-harness-font-route-mismatch-b00.png).
Waiting for a fresh recreated UI before sending the intent resolved the harness
race. Missing labels, offscreen controls and wrong script paths are not classified
as app defects. Saved-record comparisons establish actual storage outcomes.

## Remaining work and launch gates

Compact default date controls are still a separate source proposal, not part of
this binary. Native keyboard/focus coverage for that proposal remains pending.
Voice recognition, natural-language onboarding, complete capability interaction,
screen readers, one-handed use, physical S25 Ultra, current iOS journeys and
signed candidates remain unverified. Windows cannot establish local iOS results.
Public content remains gated pending qualified version-bound review; Gemini
preparation remains disabled. No participant or six-week cohort evidence exists.
An inactive week-run storage proposal is separate and has not changed schema 17
or activated completion/repeat behavior in this candidate. No issues are closed
from these scoped checks, and no store release is authorized.

## Run the observed native app on this PC

Use the already running `emulator-5554`. In PowerShell:

```powershell
$Shift6Sdk = 'C:\Users\camst\AppData\Local\Android\Sdk'
$Shift6Apk = 'C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\app-release-b00e62ac-x86_64.apk'
& "$Shift6Sdk\platform-tools\adb.exe" -s emulator-5554 install -r $Shift6Apk
& "$Shift6Sdk\platform-tools\adb.exe" -s emulator-5554 shell am start -n com.shift6.app/.MainActivity
```

This standalone guest APK requires no Metro/backend. It is an emulator x86_64
artifact, not a Samsung ARM or store-signed build. For starting the stopped AVD,
use the existing instructions in [doc 47](47_ATOMIC_HANDOVER_QA.md); do not start
a duplicate emulator instance. To repeat source checks, run `npm run verify`
from the repo with Node 22 configured as in the dated verification receipt.
