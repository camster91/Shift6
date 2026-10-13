# Native recovery and health QA increment

Observed 13 October 2026. This extends the frozen findings in [doc 36](36_PC_NATIVE_QA_REPORT.md); it does not establish store or human acceptance. All records below are synthetic.

## Candidate and execution scope

- Computer: selected local PC, observed `CAM-DESKTOP`, Windows 11 Home 10.0.26200. Shell and Android SDK/ADB were callable. Effective task permissions allowed unrestricted filesystem/network work; native UI control had timed out. The user explicitly approved ADB emulator automation. No alternate computer or security settings were used.
- Device: `Shift6-QA`, Pixel 7 emulator, Android 16/API 36, x86_64, serial `emulator-5554`, WHPX acceleration and host GPU. No physical Android or iPhone was attached.
- Baseline installed app: `b131a9e6`, recorded APK SHA-256 in doc 36. Updated installed app: `d9c5b2e2`, APK SHA-256 `A354DC1490EC28ECB925D02BE08799252A39A2891751B14EABA5C8001D1E97D6`. Native release build succeeded in 1m25s, 715 tasks. This test-signed x86_64 APK is for this emulator, not the Samsung S25 Ultra or store distribution.
- Guest-only staging configuration, empty API URL, no backend, virtual Wi-Fi/data disabled. This increment preserved the existing synthetic database during APK upgrade, then deliberately deleted it for empty-install restore testing.
- Source checks at `cc99c873` plus formatting-only `7016fe3a`: complete `npm run verify` passed, 588 tests/96 suites, 5 security tests, Expo Doctor 21/21, production audit zero vulnerabilities, both mobile exports. Sunday's restore validation was added at `d9c5b2e2`, with 16 real-SQLite tests, TypeScript/lint/format passing and a fresh native build. Later integration changes require their own verification.

## Observed findings and retests

### Health totals and pagination — #332 / #333

Two independent SDK-native fixture apps were installed only on the emulator. Their actions reject physical hardware and declare no Internet permission. Native OS permission UI granted read/write steps and exercise for the fixture apps; SHIFT6 continued to request read-only health access. Source A deliberately inserted 1,000 synthetic steps and 1,001 distinct one-minute workout records. Source B inserted 1,000 overlapping synthetic steps. No activity occurred. The Android framework's independent aggregate read reported **1,000 steps across two origins**.

Reproduction: choose Health Connect in profile setup, open Profile → Manage health connections → Connect and import summaries, then export through the OS share sheet to the separate QA JSON Receiver. Expected: Android source-priority steps total of 1,000 and complete reading of all 1,001 workout records. Baseline actual: displayed and exported 2,000 steps across two raw rows; only 1,000 workouts, ending 16:40 UTC instead of 16:41. The external export contained 1,002 health rows, so UI labels alone were not used as proof.

After the APK upgrade, legacy raw steps were explicitly labelled separate source estimates. Importing again on `d9c5b2e2` displayed 1,001 workouts and 1,000 steps. A fresh external JSON export contained 1,001 unique workout rows, including the final 16:40–16:41 record, and one `utc-total:steps:2026-10-12` row from `Health Connect · source-priority total`. Old raw step rows were removed. The training cycle and private program records matched the baseline export exactly; imports did not advance training.

Evidence: `health-platform-reference`, `health-baseline-import`, `health-baseline-external-receipt`, `health-candidate-import-d9c5`, `health-candidate-external-receipt` in the [evidence inventory](qa/2026-10-13-recovery/evidence.json). Machine readback accompanies the screenshots. Physical source integrations, sleep overlap, all six types with real data, permission revocation during a read and iOS parity remain untested natively. Failure/repeated-token/partial-grant/cache-preservation behavior has regression coverage; this is not substituted for device acceptance.

### Saved private plans — #345

Baseline saved plans existed in exports but Programs supplied no list after leaving the builder. Expected: discover and reopen an owned saved plan without losing its immutable version/history. After upgrading and relaunching, Programs displayed both `QA Saved Draft` and `My SHIFT6 plan`, including workout/version counts. Selecting “Edit or start a copy of My SHIFT6 plan” opened an editable copy with program name `My SHIFT6 plan copy`, `QA Session`, day 1 and 20 minutes, verified from the actual EditText values. Opening the copy did not mutate the saved source records. Public catalogue approval remained empty and gated.

Evidence: `private-plans-relaunch-d9c5`, `private-plan-copy-d9c5` and external export comparison. Saving and starting another copied cycle has source regression coverage but was not repeated in this increment; the earlier private creation/save/start path remains in doc 36.

### Local export restore — #331

Reproduction on `d9c5b2e2`:

1. With existing records, Profile → Restore a local export → Choose backup file. Actual: refuses merging/overwriting before opening the picker and says no records changed.
2. Export current records externally; delete the synthetic local installation through Profile, force-close and restart. Setup step 1 exposes “Restore a local export instead.”
3. Use Android's native document picker → Downloads → `shift6-personal-qa-backup.json`, the original schema-12, 22-record export from doc 36. Actual preview lists record counts and consent/media/owner limits.
4. Cancel the preview, force-close and restart. Actual: fresh setup still appears; no profile/cycle was restored.
5. Pick the same original file again, Confirm local restore → native confirmation dialog → Restore. Actual: 22 records restored locally; continue and force-close/restart.
6. Progress/Personal goal displays target 110 lb, baseline 80 lb, latest and best 88 lb. Profile's external JSON export has all original section counts. Goal events, protocols, observations/correction links, target revisions, saved set, partial session, cycle and immutable private version match the original records exactly. Only profile health choice (`not-now`) and the five notification flags (all off) differ as disclosed. The original external file remains present.

Expected and observed: no silent merge, inert cancellation, explicit confirmation, atomic recovery of canonical records, and no restored permission/remote-consent grants. No provider privacy row existed in this particular backup; consent-off behavior is separately covered by real-SQLite tests. Sunday day 7 roundtrip and rejection of invalid day 0 were added after cross-review; branched correction history is rejected before any writes. Foreign-key graph validation, rollback, owner remapping, malformed/future/oversized file rejection and detached media are covered by source tests. Those malformed/large-history cases have not all been repeated through the native picker.

Evidence: `restore-nonempty-rejection-d9c5`, `restore-fresh-entry-d9c5`, `restore-native-picker-d9c5`, `restore-preview-d9c5`, `restore-cancel-inert-d9c5`, `restore-confirm-dialog-d9c5`, `restore-success-d9c5`, `restore-progress-d9c5`, `restore-goal-journal-d9c5`, `restore-external-readback-d9c5` and machine comparison. One ADB UI dump failed while a later share transition was already underway; the actual external JSON receipt succeeded. This is recorded as a harness failure, not a failed restore or invented test pass.

## Provisional score and remaining gates

The **53/100 provisional engineering score** from doc 36 is retained conservatively under doc 34. These additional recovery/integrity observations strengthen its evidence; they do not replace physical-device, screen-reader, participant, qualified-content, privacy/signing or store acceptance criteria. Human-use score remains unverified: one Android emulator, zero physical devices, zero local iOS runtime checks, zero actual participants and zero store acceptance results.

The intentional public-content validation still fails because no reviewed public Shift is approved. Do not bypass that gate. AI conversation/actions/memory, interruption journals, voice/import/quick actions and actual sustained-use evidence are separate open work. Later Coach/reminder/import agent changes are not part of this installed APK's accepted evidence. No issue is closed and no store launch is claimed.

## Run this native candidate

On this PC, verify `adb devices` still lists the intended emulator, then:

```powershell
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
& $adb -s emulator-5554 install -r 'C:\Users\camst\s6qa\android\app\build\outputs\apk\release\app-release.apk'
& $adb -s emulator-5554 shell am start -n com.shift6.app/.MainActivity
```

The output APK is overwritten by later builds: compare its hash with the candidate above before calling it this exact tested binary. For a source run, use the integration branch, `npm ci`, guest-only environment with no API URL, and `npm run android`; Expo Go does not validate native health/SQLite/sharing. Windows iOS QA remains pending until an authorized Mac or signed iPhone build is available. See [doc 35](35_PC_QA_HANDOFF.md) and [store checklist](38_STORE_RELEASE_CHECKLIST.md).
