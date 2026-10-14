# Native accessibility inspection and persistent workout labels

14 October 2026. Provisional engineering score remains **53/100**; doc34 human
acceptance is unverified. CAM-DESKTOP, Windows11, WHPX/host-GPU Pixel7-profile
emulator (actual model sdk_gphone64_x86_64), Android16/API36 x86_64, offline
standalone guest release. No Expo Go, backend, participants or actual exercise.

## Observed accessibility inspection

The first inspection uses app source `ae3efb5a`, installed APK SHA256
`c928662fde864afcd799617b7d85328aa27de8a357b0e44901abcc18546c6ebf`.
TalkBack16.0.0.738667889 was temporarily enabled through the actual Android
Settings switch and permission dialog on the synthetic QA emulator.

Ordinary UIAutomator inspection suppresses accessibility services by default.
Its focus/tap results cannot establish TalkBack traversal. A separate read-only
QA instrumentation package uses Android's documented
[FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES](https://developer.android.com/reference/android/app/UiAutomation#FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES).
It requests no permissions, exposes no launcher, injects no input, performs no
node actions and reads no Shift6 storage. Its bounded node snapshot is sequential,
not atomic; complete means no configured traversal limit was encountered.

Frozen observer APK SHA256 `208ec08942c629233e7c924ff8a771bfb8ed2e118e8a42faafecd2cf75d667d7`.
The overlap receipts independently prove TalkBack and the observer bound at the
same time, with TalkBack still enabled before and after. Home exposes native
accessibility focus on YOUR TRAINING HOME. An ADB-injected Resume tap, without an
ordinary dump, opens the existing workout: three of five sets and restored
26-second/RPE7 draft; focus is on Back to Home. This proves navigation with the
service enabled, not touch exploration, spoken output or participant acceptance.

Shell Alt/right and emulator-console key/touch attempts did not demonstrate
focus movement. Console acknowledgement alone is not proof of input delivery.
The initial observer receipt also captured its during-service state too early;
only the later connected-status overlap receipts prove coexistence. No app
accessibility defect is inferred from those harness limitations.

TalkBack was turned off through its actual Settings confirmation after this
inspection. Fresh enabled/bound services are empty and touch exploration false.
The original setting was null; restoration is equivalent Off, not a claim of
byte-identical settings. Font scale remains1.0.

External export was received and opened by the separate QA JSON Receiver at
2026-10-14T12:51:07.594Z: schema17,36arrays,1,082records. All actual payloads and
restored draft values are unchanged; only draft autosave timestamps differ.
The share helper was interrupted after selecting the receiver; fresh receiver
state and file contents separately establish receipt, not the helper exit code.

## Reproduced presentation defect

[#365](https://github.com/camster91/Shift6/issues/365): Home > Resume workout >
restored QA Hold draft with26seconds/RPE7, optional details collapsed. Populated
inputs lose their placeholders and display visually unnamed26/7 boxes. Expected:
persistent labels describe the actual measure/unit and effort range. Actual:
correct accessible duration-seconds/RPE1–10 names exist, but visible names vanish.
The screenshot and matching node data record this before the fix. Actual load's
existing kg/lb/unknown provenance caption is unaffected.

## Fix and remaining verification

Source `1f4d33b1` adds wrapping persistent captions for Reps, Duration(seconds),
Distance(meters), RPE(1–10) and RIR(0–10), preserving conditional rendering,
callbacks, accessibility names, editable rules and stored units. The focused
workout/voice regression set passes79tests, including restored zero values,
conditional fields and explicit load provenance. The independently reviewed
test-harness correction is `86a26c4490ab091f865e20773151a0443a9f2b8c`.
At that exact candidate, `npm run verify` passes 1,220 tests/144 suites, Expo Doctor
and both platform JavaScript exports. The standalone guest x86_64 native build
and update installation pass; APK SHA256 is
`a13dd04bae2cae236fd9eb8f2c6e2e49da9b26c7d85aefa84e47e85d222d9a1e`.

Native closed-keyboard screenshots at font scale 1.0 and 2.0 show persistent
Duration (seconds) and RPE (1–10) captions with the exact restored 26/7 values.
The 200% screenshot was visually inspected: captions wrap without clipping.
The initial normal-text helper stops at its all-sets caption assertion while
the page is still at the top; a fresh scroll exposes the actual fields and
confirms the caption. This is a retained harness positioning interruption,
not evidence that the app omitted the label.

The earlier 1517-pixel docked-keyboard boundary is not applicable to this run.
Fresh multiwindow observation and screenshots show a Gboard stylus toolbar and
floating keyboard. The read-only default-flag observer is a separate QA package,
APK SHA256 `f74b388f4030b87b122df056661cccef350396ea83bd03d2fc8f21d1b7812017`;
it refuses configured/enabled accessibility services and was used with TalkBack
Off. Its build receipt describes build-time unexecuted state; the later runtime
receipts establish the observed execution. It does not replace the earlier
service-preserving TalkBack observer or prove TalkBack traversal.

At 200% text, the first bulk voice-entry attempt produces a mismatch. A fresh
observer and screenshot identify Gboard's “Try out your stylus” tutorial overlay
with “Write here”; the app editor remains empty with its example placeholder and
Review disabled. After dismissing the observed IME Cancel action, separate paced
typing verifies exact `26`, `26 seconds`, and `26 seconds, RPE seven` in the focused
app editor. The resulting screenshot was visually inspected: multiline editor
and Review button are visible alongside the stylus toolbar. No Review, Apply or
Complete action was taken. This passes the observed floating/stylus-IME case,
not a new docked-keyboard or successful speech-recognition check. The mismatch
and tutorial overlay remain separate evidence; no app text-loss defect is
inferred from them. Font scale was then restored to1.0 and the app force-closed. Fresh external
receiver observation verifies the14:40:49.874Z export: schema17,36arrays and
1,082records, all actual/draft payloads unchanged against the prior export.
Only draft/load-map autosave timestamps refreshed. TalkBack remains Off. The
export helper stopped before receiver selection on an empty ordinary dump; a
fresh multiwindow chooser, observed receiver tap and fresh receiver snapshot
separately verify receipt. This interruption is not a whole-helper pass.

Physical SamsungS25Ultra, full current iOS journeys, VoiceOver/TalkBack spoken
traversal, comprehension, six-week pilot and signed store distribution remain
unverified. Successful CI compile/install/cold launch is not that acceptance.
The f5f3e9c4 native and quality CI runs completed successfully and cover ae app
source. They do not cover the later label change; its Android emulator evidence
is recorded above and does not establish current iOS interaction acceptance.

## Evidence

- [Workout before fix](qa/2026-10-14-coach-review/coach-review-a11y-after-direct-resume-ae3efb5a.png)
- [Workout overlap receipt](qa/2026-10-14-coach-review/coach-review-a11y-after-direct-resume-ae3efb5a-receipt.json)
- [Home overlap receipt](qa/2026-10-14-coach-review/coach-review-a11y-overlap-home-ae3efb5a-receipt.json)
- [Restored Off service state](qa/2026-10-14-coach-review/coach-review-talkback-restored-services-ae3efb5a.txt)
- [External export comparison](qa/2026-10-14-coach-review/coach-review-accessibility-comparison-ae3efb5a.json)
- [Issue readback](qa/2026-10-14-coach-review/coach-review-actual-labels-issue-readback.json)
- [Normal-text restored labels](qa/2026-10-14-coach-review/coach-review-actual-labels-restored-font1.0-86a26c44.png)
- [200% restored labels](qa/2026-10-14-coach-review/coach-review-actual-labels-restored-font2.0-86a26c44.png)
- [All-sets labels after fresh scroll](qa/2026-10-14-coach-review/coach-review-actual-labels-allsets-scrolled-font1.0-86a26c44.png)
- [First helper classification](qa/2026-10-14-coach-review/coach-review-actual-labels-first-harness-classification-86a26c44.json)
- [Current IME observation](qa/2026-10-14-coach-review/coach-review-actual-labels-ime-default-probe-86a26c44.json)
- [Stylus tutorial intercept](qa/2026-10-14-coach-review/coach-review-actual-labels-voice-ime-intercept-86a26c44.png)
- [Paced voice-editor result](qa/2026-10-14-coach-review/coach-review-actual-labels-voice-paced-font2.0-86a26c44.png)
- [Paced input receipt](qa/2026-10-14-coach-review/coach-review-actual-labels-voice-paced-font2.0-86a26c44-receipt.json)
- [Exact-candidate full verification](qa/2026-10-14-coach-review/verify-integrated-86a26c44.status.json)
- [Native build receipt](qa/2026-10-14-coach-review/build-integrated-86a26c44.status.json)

## Verification interruption retained

The first full run at1f4d33b1 fails with1,218passes/two existing five-second
workout-test timeouts. An isolated same-source workout suite reproduces only
the first conversion timeout (49pass/1timeout); the opposite conversion and
pending correction pass quickly. Temporary phase timing with a diagnostic-only
15-second allowance completes the first case in797ms: render663ms, all actions
and cleanup by770ms. No value assertion failed. The timing patch and allowance
were removed and committed test bytes independently verified. The first failure
and isolated failure remain retained; exact latency cause is unproven. The phase
CLI accidentally emits JSON to stdout; its original log and extracted JSON are
preserved and only the intended one case ran (49skipped). This diagnostic is not a full verification pass; the second original-source
run and later corrected-harness run are recorded below.

A second original-source full run reproduces the same two timeouts, again
1,218passes/2timeouts. Both failed runs remain separate. Test-only86a26c44 then
adds15-second budgets only to those integration cases and captured, idempotent
pending-writer disposal/release/drain through finally and afterEach. Every prior
freeze/unit/canonical assertion remains; the direct rendered Save handler is
preceded by an enabled-state assertion. Independent review accepts the bounded
patch. The79-case scoped run passes before that extra assertion; its final
pending case passes separately, with type/lint/format/diff checks green.
The exact `86a26c44` full verification and rebuilt native candidate subsequently
pass as recorded above. The failed original runs remain failures; the later
pass does not rewrite their outcomes. No deadlock or app actual-value defect
was demonstrated by the timeout diagnostics.

## Run this exact Android candidate

```powershell
$qaAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$qaApk = "C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\app-release-86a26c44-x86_64.apk"
& $qaAdb devices -l
& $qaAdb -s emulator-5554 install -r $qaApk
& $qaAdb -s emulator-5554 shell am start -n com.shift6.app/.MainActivity
```

This x86_64 candidate runs on the verified emulator, without Expo Go or Metro.
It is not the Samsung ARM or store-signed artifact. Installation updates the
existing package; do not clear or uninstall it when retaining local data.

- [Fresh external comparison](qa/2026-10-14-coach-review/coach-review-actual-labels-comparison-86a26c44.json)
- [Outside-app receiver](qa/2026-10-14-coach-review/coach-review-actual-labels-export-receiver-86a26c44.png)
