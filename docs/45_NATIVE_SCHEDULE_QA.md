# Confirmed local schedule: native QA increment

13 October 2026. Synthetic private plans and records only. Current provisional engineering score is **53/100** under [doc 34](34_HUMAN_USE_ACCEPTANCE.md), using the [doc 40 weights](40_NATIVE_CONVENIENCE_QA.md). This restores only the two integrity points deducted there for unresolved actual-unit provenance and private-version history. Native doc44/this report now directly verify those cases. Human-use acceptance remains unverified. This report separates native evidence from source checks and pending acceptance.

| Area                 | Earned / available | Remaining limits                                         |
| -------------------- | ------------------ | -------------------------------------------------------- |
| First experience     | 12/20              | Intended-user comprehension and reviewed starter journey |
| Integrity            | 16/20              | Full edge cases, physical/iOS parity and comprehension   |
| Reliability          | 9/15               | Physical fault and recovery matrix                       |
| Accessibility        | 4/15               | TalkBack/VoiceOver and all critical journeys             |
| Privacy and control  | 6/10               | Exact-candidate traffic audit and user understanding     |
| Visuals and motion   | 4/5                | Complete state/device audit                              |
| Fitness content      | 1/5                | Qualified version-bound human review                     |
| Sustained usefulness | 0/5                | Consented six-week cohort                                |
| Distribution/support | 1/5                | Signed physical/store acceptance and support rehearsal   |

## Native candidate and execution environment

Later candidate `7a811baa` has APK SHA-256 **5C0DA24C41FE4E64F7005DF11E2BCAFD6DADB9EDA12E953FBB11C30312CE4479** (1m47s, 756 tasks/30 executed). Its full verification passed **972 tests/134 suites** and both mobile exports. Source `158880e4` adds only the reviewed iOS harness confirmation/Imperial-selector contracts (four offline Python tests pass). A subsequent full rerun timed out one SQLite-backed component case at its unchanged 5-second limit (971 other tests passed); the unchanged 41-test component suite then passed at normal timeout. The unchanged final full retry passed **972/134, exit 0**, all repository checks and both exports (`verify-final-harness-retry.log`). No timeout was increased or assertion removed. The timeout's environmental cause is not established.

Observed on `7a811baa`: a private QA Refresh draft survives upgrade/recovery; the Start preview displays **2026-10-13 · America/New_York**, Cancel returns to editing, and explicit **START CYCLE** creates one new cycle/baseline while pausing the prior cycle. Native UI cancellation alone does not prove zero intermediate writes. The final external export shows the new cycle/baseline, a single active cycle, and all older actuals/private versions preserved.

The entered **QA note retained on return** survives navigation, force-close and the completed workout summary. This verifies ordinary native persistence/recovery; deferred-rejection/pre-debounce re-entry is separately covered by component and real SQLite regressions, not claimed as native injected-fault coverage. The original transient SQLite error cause remains unproven.

**#357 native pass:** the same mounted Progress tab shows zero sets before logging, one saved set on return, then **one completed workout/two sets** after completing QA Refresh, without restarting. Volume is **450**, with unchanged previous-cycle comparison results. See `schedule-progress-before-workout-7a81`, `schedule-progress-one-set-on-return-7a81`, `schedule-progress-completed-on-return-7a81` and `schedule-progress-fresh-volume-7a81`.

**#358 native pass:** the current restore entry says supported SHIFT6 JSON backup, and the native-picked preview displays **1,064 records** without the obsolete schema-12 label. After explicit deletion/restoration, `schedule-current-reexport-7a81.json` matches all **34 record sections** in `schedule-final-export-7a81.json` exactly: **10 saved actuals, six unit-provenance rows, two schedule baselines, one revision and the retained note**. Export time changes normally. This repeats latest-candidate recovery with provider/memory/notifications already off; it does not test enabled-consent reset.

Harness distinctions: stale `Start cycle`, `CONFIRM` and unsaved-set `Save` selectors were refused before acting; fresh native labels were used for explicit actions. An off-screen deletion attempt was refused and the ensuing restore correctly rejected the non-empty installation. Fresh visibility/readback then completed the intended delete/restore. One diagnostic initially used `notes` rather than the exported `note` key; the real key/readback confirmed the note. These are harness failures, not missing app records or successful writes. Preserve the captures instead of crediting failed commands.

Authorized local host CAM-DESKTOP, Windows 11 build 26300; Pixel 7 Shift6-QA emulator, Android 16/API 36, x86_64, emulator-5554, WHPX/host GPU. ADB was expressly authorized. Effective task instructions permit unrestricted filesystem/network access; the app is guest-only, offline, with no API backend configured. This is a native release APK, not Expo Go, a physical Samsung build or a signed store candidate.

Native source: **`eb6cd6d2`**. APK SHA-256: **`6BB8653A697B9610BEB9E1EF90F1C952732044674861BAE10FD031E140EA2061`**. Gradle succeeded in **4m29s**, **756 tasks / 30 executed** (`build-schedule-eb6c.log`). Later source commits are not automatically covered by this APK.

Packaged evidence: [schedule inventory](qa/2026-10-13-schedule/evidence.json), with copied/hash-verified screenshots, native UI XML and externally received JSON. Evidence stems below refer to matching PNG/XML files. QA workspace exports are synthetic and were opened in the separate native QA JSON Receiver after sharing through Android's native share sheet.

## Observed native passes

| Reproduction steps                                                                                        | Expected versus observed                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open Calendar for the existing QA Units cycle at week 2, with week 1 already completed                    | Completed history is locked. Week-1 earlier/later controls have enabled=false in native XML; no move is inferred from their displayed labels. Existing completed date remains October 13.                                                                                                                                                                   | `schedule-legacy-calendar-entry-eb6c`                                                                                                                   |
| Open the eligible week-2 date editor and review October 20 → October 21 in America/New_York               | Preview states only an unstarted session in the current week may move. First-use confirmation displays all six original dates and its explicit zone: October 13, 20, 27; November 3, 10, 17. This is a schedule preview, not a workout completion or changed training prescription.                                                                         | `schedule-first-move-preview-eb6c`, `schedule-date-confirmation-preview-eb6c`                                                                           |
| Cancel the reviewed change; externally export and read the receiving app's JSON                           | Cancel creates neither baseline nor revision. Schema-15 export has 1052 records, eight completed actual sets, scheduleBaselines=[] and scheduleRevisions=[]. The Calendar remains on the old date.                                                                                                                                                          | `schedule-cancelled-calendar-eb6c`, `schedule-cancel-export-received-eb6c`; `schedule-cancel-export-eb6c.json`                                          |
| Repeat the exact preview and explicitly Confirm session date; externally export                           | One baseline and one root revision are written together. Baseline captures six original dates in America/New_York; root revision moves only week 2 from 2026-10-20 to 2026-10-21, effectiveDate=2026-10-13, previous_revision_id=null. Both share recorded/confirmed time 2026-10-13T21:03:36.791Z. Export now has 1054 records and the same eight actuals. | `schedule-first-confirmed-move-eb6c`, `schedule-confirm-export-received-eb6c`; `schedule-confirm-export-eb6c.json`                                      |
| Force-close and reopen Calendar                                                                           | The explicit moved date survives as Wednesday October 21; original week association is retained and completed week 1 stays October 13.                                                                                                                                                                                                                      | `schedule-confirmed-move-recovered-eb6c`                                                                                                                |
| Use the explicit local-deletion dialog, then export the now-empty local installation to the receiving app | Fresh schema-15 readback has totalRecordCount=0, no completed sets and no schedule baseline/revision records. Deletion was accepted from external bytes, not the confirmation screen alone.                                                                                                                                                                 | `schedule-delete-confirmation-eb6c`, `schedule-after-local-deletion-eb6c`, `schedule-deleted-export-received-eb6c`; `schedule-deleted-export-eb6c.json` |

Direct cancellation-versus-confirmation export comparison verifies **workoutSessions, completedSets, completedSetLoadProvenance, userPrograms, userProgramVersions, workoutScheduleOverrides and userProfiles are unchanged**. The first confirmed schedule move adds only its new baseline and revision; it neither rewrites earlier legacy overrides nor manufactures completed work, targets or a new cycle.

The saved baseline's scheduled dates initially equal all original dates. Its revision then projects October 21 without modifying those baseline bytes. Original date/timezone provenance is explicit; this observation does not establish actual travel-zone or reminder behavior.

## Observed native schema-15 restore

After deletion, choose the externally preserved schema-15 backup, review the preview, then explicitly confirm local restore. Captures: `schedule-native-restore-entry-eb6c`, `schedule-restore-preview-eb6c`, `schedule-restore-confirm-dialog-eb6c` and `schedule-restore-result-eb6c`. The result reports 1054 records restored locally. Continue and open Calendar: `schedule-restored-calendar-projection-eb6c` shows completed October 13 and the projected moved date October 21 immediately after restoration.

Fresh export was received and opened outside the app: `schedule-restored-export-eb6c.json`, with `schedule-restored-export-received-eb6c` capture. Integer schemaVersion=15 and totalRecordCount=1054 match the source backup. Every record section equals `schedule-confirm-export-eb6c.json`, including exact baseline/revision rows, eight actuals and unit provenance, sessions, legacy overrides, programs/versions and 1002 imported health summaries. No metadata normalization difference was observed for this same-owner guest backup; only the export timestamp changes. Practical memory remains disabled (enabled=0), with no Coach provider or notification consent records. These states were already off/absent in the source, so this is not a native enabled-consent-reset test. Existing-data rejection and Cancel behavior retain their earlier candidate-specific evidence in [doc 39](39_LOCAL_RECOVERY_HEALTH_QA.md).

**Observed copy defect on `eb6cd6d2`, [#358](https://github.com/camster91/Shift6/issues/358):** the restore result screen still describes recovery as “a schema-12 SHIFT6 JSON export”, although the accepted file and its preview are schema 15. Expected copy should accurately describe the supported format range. Source `05d4cf32` corrects the supported-backup wording and actual record count; its native retest remains pending. This is misleading instruction text, not a failed restore.

## Source implementation and verification

Full `npm run verify` passed at **`eb6cd6d2`: 942 tests / 133 suites**, with formatting, lint, TypeScript, Expo Doctor 21/21, audit zero vulnerabilities, all 143 vendored source/license hashes, security/assets/config/secret checks and both mobile Hermes exports (`verify-schedule-integrated.log`). The SQLite migration version differs from export schema version 15.

The source increment provides:

- Explicit immutable schedule baselines, original date/timezone anchoring and append-only moves; fresh owner/cycle/version/parent/date binding and isolated transaction readback.
- Atomic first baseline plus move for a legacy cycle; incompatible legacy writes are blocked once its baseline exists. Strict backup validation rejects baseline dates inconsistent with owned legacy overrides.
- Shared schedule projection for Calendar and the existing Home/Coach/reminder readers. Recorded or started sessions cannot become fresh move targets; a move does not create another workout attempt.
- Schema-15 export/restore/deletion/account-owner handling, with earlier formats normalized to empty new sections rather than silently backfilled schedules.
- Explicit date/zone confirmation in the three Start paths and guards preventing obsolete operation receipts/navigation. Spinner cleanup releases only its own obsolete operation. These paths have source regression coverage; this report does not yet accept their changed-binary native journeys.

These checks support the scheduling portion of [#315](https://github.com/camster91/Shift6/issues/315) and [#331](https://github.com/camster91/Shift6/issues/331). They do **not** complete repeat-week semantics, primary personal-Shift handover, public programme review or qualified return-to-training prescriptions. No approval is inferred from synthetic private plan use.

## Remaining acceptance

- Retest enabled-consent reset, duplicate/existing-data refusal, malformed/cross-owner schedule rejection and old schema-14 native normalization on this binary. The observed same-owner schema-15 restore above does not prove every recovery edge case.
- Run each of the three changed Start paths on native Android: private Builder start, programme start and repeat-cycle start. Inspect full date/zone preview, Cancel with no writes, explicit confirmation, fresh saved cycle/baseline and guarded receipts. No new-cycle acceptance is inferred from this existing-cycle move.
- Native second-move chains, stale preview after competing evidence, date entry outside the visible calendar grid, day-boundary/DST/travel-zone behavior and earlier/future/completed-week refusal cases remain incomplete.
- Reminder permission/opt-in, consent-preserving recalculation, actual delivery/actions and source agreement across Calendar/Home/Coach on this candidate remain pending. A saved planning date does not prove a notification was delivered.
- Physical S25 Ultra/iPhone, current-feature iOS, TalkBack/VoiceOver, complete large-text/keyboard/media acceptance and human participants remain pending. The earlier iOS simulator run belongs to its earlier SHA; Windows-local iOS testing is unavailable.

No live Gemini call, backend activation, public content approval, paid service, merge, publication or store submission. Follow [doc 43's shipping todo](43_SHIPPING_GOAL_AND_TODO.md), [doc 38's store checklist](38_STORE_RELEASE_CHECKLIST.md) and [doc 40's exact ADB launch instructions](40_NATIVE_CONVENIENCE_QA.md#exact-native-run). Measure the generated APK hash before installation because subsequent builds overwrite its path. Keep unknown rubric weight unearned; the current 53/100 score restores only the two documented integrity deductions.

## Exact current PC run

A frozen, hash-verified emulator APK is saved outside Git at `C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\app-release-7a811baa-x86_64.apk`. With the existing Shift6-QA emulator running:

```powershell
$shift6Adb = 'C:\Users\camst\AppData\Local\Android\Sdk\platform-tools\adb.exe'
& $shift6Adb -s emulator-5554 install -r 'C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\app-release-7a811baa-x86_64.apk'
& $shift6Adb -s emulator-5554 shell am start -n com.shift6.app/.MainActivity
```

If the emulator is stopped, start the existing AVD first:

```powershell
$env:ANDROID_AVD_HOME = 'C:\Users\camst\Documents\Codex\2026-10-12\let-s-install-https-github-com\shift6-native-qa\avds'
Start-Process -FilePath 'C:\Users\camst\AppData\Local\Android\Sdk\emulator\emulator.exe' -ArgumentList '-avd Shift6-QA -no-window -accel on -gpu host -no-audio -no-snapshot -memory 2048' -WindowStyle Hidden
```

The custom AVD directory is required: the current SDK's `-list-avds` prints Shift6-QA with that directory set and none under its default home. Startup arguments match the running emulator's command line; the installed SDK's `-help-accel` and `-help-gpu` confirm accelerated x86_64/WHPX and host GPU support. These are the verified exposed CLI controls; no computer/security setting is changed.

This x86_64 APK is for the PC emulator. The S25 Ultra requires a separate ARM64 candidate and physical-device acceptance. No Expo Go is used. Local iOS requires a Mac or signed iPhone build; the latest GitHub runtime attempt stopped before testing for lack of a matching successful native artifact. The corrected iOS harness and four contracts do not establish a simulator pass.
