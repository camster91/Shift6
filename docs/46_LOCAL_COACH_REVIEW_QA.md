# Dated local Coach review QA

13 October 2026. Provisional engineering score remains **53/100** under doc 34;
human-use acceptance is unverified. This report records the incremental candidate,
separately from the schema-15 Android evidence in doc 45.

## Candidate and regression evidence

Source: `4ff0edd1`, branch `feat/confirmed-local-lifecycle`, Windows PC
`CAM-DESKTOP`, Windows 11 Home 10.0.26300. Local shell and ADB are callable;
filesystem and network access are unrestricted in this task. The selected and
observed computer match. Native Computer Use control remains unavailable; the
user explicitly authorized ADB on the existing hardware-accelerated emulator.

`npm run verify` passed on this source: **1,016 tests, 137 suites**, lint,
TypeScript, Expo Doctor (21/21), repository checks and iOS/Android bundle exports.
Log: `shift6-native-qa/verify-dated-review-integrated.log` in the task workspace.
Bundle export is not native iOS or human acceptance.

## Implemented and source-reviewed

- Manual review of at most seven local dates, with an explicit IANA time zone.
  Session counts use original start dates and distinguish complete, partial,
  skipped and in-progress records. They do not claim adherence.
- Goal evidence uses the explicit baseline and latest eligible comparable
  measurement separately from the selected session dates. Canonical event
  prefixes and complete observation series corroborate historical evidence;
  unavailable legacy history withholds comparison and attainment.
- One optional question, choice preview, cancellation, confirmed intent receipt,
  saved history and independent navigation to existing workflows. Confirming
  intent does not change the plan, schedule, goal or cycle reflection.
- Schema 16 persists and exports the local review journal. Restore validates
  ownership, source evidence and historical goal witnesses.
- Owner/database transitions synchronously hide previous private state and reject
  retained callbacks before focus effects. Transition regressions reproduced the
  old defect and passed after the fix.
- Cycle-reflection writes use fresh ownership and stable identity inside an
  exclusive transaction. Helpers for atomic handover are available; the complete
  handover coordinator is not activated by this candidate.

## Native acceptance status

The schema-16 Android APK built in 2m32s (756 tasks, 30 executed). Frozen file:
`app-release-4ff0edd1-x86_64.apk`; SHA-256:
`18172BDBE3C9C7CB1E28C5479E1B0F6DADD99BCF593027FB8D7AB4C58EC5F19C`.
It is a test-signed emulator build, not a Samsung ARM or store-signed candidate.
The existing emulator is Pixel 7/API 36, Android 16, x86_64, WHPX/host GPU.

Observed with synthetic records, network disabled and normal text:

1. Before upgrading, the existing goal workflow saved a 60-second declared
   target, explicit 20-second baseline and 30-second observation. Correcting
   that observation to 25 retained the original entry and measurement timestamp.
   Revising the target to 50 retained its reason and prior event history. JSON
   received outside Shift6 contained 1,075 records, three observations, five
   goal events and one target revision (`review-preupgrade-export-7a81.json`).
2. After installing with `adb install -r`, the review opened from Coach's
   `Review my progress` control. The default seven dates and a manually selected
   single date both reported one complete, zero partial/skipped/in-progress
   sessions, matching the active cycle's saved session.
3. The review showed baseline 20, corrected latest 25 and target 50 seconds,
   with "improved" and "target not met". It explicitly distinguishes goal
   history from session date coverage (`review-corrected-goal-4ff0.png`).
4. `Keep plan` opened an explicit dated preview; `Cancel preview` returned to
   choices. `Open goal review` required `Confirm and save intent`, then showed
   one saved intent and a separate `Continue to personal goal` action. That
   action opened the existing unchanged goal (`review-independent-goal-opened-4ff0`).
5. After `am force-stop` and relaunch, the saved intent appeared in the dated
   history (`review-history-after-force-close-4ff0`). The receipt records the
   single date and America/New_York, despite the new screen defaulting to seven
   dates on reentry.

Screenshots/trees remain in the task's `shift6-native-qa` folder until packaged.
External schema-16 readback and deletion passed after emulator recovery; restore
saved 1,076 validated records. The final external re-export matches **all 35
record arrays exactly**, including the receipt (`review-restored-reexport-4ff0.json`). Optional
question and invalid or stale context native cases are still pending. Repository
tests cover those contracts; they are not substituted for native observations.
The schema-16 share attempt encountered Android's **"IntentResolver isn't
responding"** alert (`review-export-wait-4ff0`). One Wait briefly exposed the
share sheet, but the alert returned before the QA receiver could be selected;
the guarded harness refused to tap a missing receiver. Closing the stalled
component did not immediately dismiss the captured alert. External receipt was
blocked during that attempt. Source inspection found the export path awaits
`Sharing.shareAsync` after local SELECTs and JSON-file writing; it does not replay
review witnesses. This observation establishes a system share-sheet failure,
not a Shift6 validation loop. Do not infer file receipt from generating a filename.
The recovered receiver still held **schema 15 / 1,075 records**; the provisional
`review-final-export-4ff0.json` capture is that older file, not schema-16 proof.
It is retained to make the rejected evidence explicit. A restart of Shift6 did
not immediately recover sharing; `dumpsys activity` identified the resumed
system ChooserActivityLauncher. After a data-preserving emulator restart, the
share sheet recovered and the receiver opened **schema 16 / 1,076 records**
(`review-verified-external-export-4ff0.json`). All 34 pre-upgrade arrays matched
exactly; one new journal row records the explicitly confirmed intent. No goal,
actual, schedule, plan or consent was changed by confirmation. The receipt's
canonical event witness includes all five goal events and all three observations.
Deletion then yielded an externally opened schema-16 file with zero records and
all 35 record arrays empty (`review-deleted-export-4ff0.json`). The validated
backup preview and explicit Restore saved 1,076 records again.

During recovery, the harness was hardened to delete its previous UI dump and
require a successful fresh dump before reading. This caught a transient empty
dump during file-picker navigation, instead of reusing old nodes. The tap had
opened the picker; a fresh capture then selected the observed backup. Immediate
post-restart/post-confirmation captures may show an earlier frame; acceptance
uses later fresh states and actual JSON, not their filenames alone.

Harness-only errors retained in the local logs: one Python `show()` call omitted
its argument, one command used curly-quote labels inside PowerShell incorrectly,
and one export inspection guessed a `records` object instead of reading the
actual root arrays. Corrected readbacks established the schema-15 facts above.
None of those failed commands proves a missing or damaged app record.

The source-reviewed follow-up `996058d0` separates local-record preparation errors
from file/sharing failures and asks users to verify destination receipt after
sharing completes. Its three focused tests cover both failure retries and busy
state while sharing is pending. It does not claim to repair Android's resolver
or prove delivery from a resolved sharing promise. The frozen/native-tested APK
above remains `4ff0edd1`; native copy acceptance for the follow-up is pending.
Full `npm run verify` on `996058d0` passed with **1,019 tests / 138 suites**, lint,
typecheck, Expo Doctor 21/21 and both mobile bundle exports. Its exact log is
included alongside the earlier 4ff0 candidate log in the evidence manifest.

The inspected goal screenshot is legible. Native ergonomics follow-ups are
locale-aware measurement dates (currently UTC ISO text) and promoting the review
from its buried Coach chip. Participant comprehension is not established.

Samsung S25 Ultra, current native iOS, TalkBack/VoiceOver, signed store builds,
qualified public fitness review and actual participant acceptance remain pending.
The public catalogue stays gated. Guest-only storage requires no backend.

Exact emulator startup is in [doc 45](45_NATIVE_SCHEDULE_QA.md). With its
`ANDROID_AVD_HOME` and SDK configuration, install the frozen APK with
`adb -s emulator-5554 install -r app-release-4ff0edd1-x86_64.apk`, then run
`adb -s emulator-5554 shell am start -n com.shift6.app/.MainActivity`.
