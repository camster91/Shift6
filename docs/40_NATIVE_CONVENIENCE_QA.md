# Native convenience and focused-workout QA

Observed 13 October 2026 with synthetic data. Extends [doc 36](36_PC_NATIVE_QA_REPORT.md) and [doc 39](39_LOCAL_RECOVERY_HEALTH_QA.md). Zero participant usability sessions; this is engineering evidence.

## Candidate and execution scope

Selected local PC, observed CAM-DESKTOP, Windows 11 Home 10.0.26200. Effective instructions permit unrestricted filesystem/network execution, approval policy never. PowerShell and ADB checks passed. Native UI control previously timed out; the user expressly authorized ADB. No host, access or security settings were changed.

Pixel 7 Shift6-QA emulator, Android 16/API 36, emulator-5554, x86_64, WHPX and host GPU. Offline, guest-only, empty API URL, standalone native app. The restored synthetic database included 1,002 historical health summaries; these are backup records, not newly observed activity.

Baseline convenience commit 56bce412, APK SHA-256 `66F07766ED5204298892DEDFAE6E63734CC334BF877B50E84BC9BA9675565A25`. Native fixes retested at aa80f7c7, APK SHA-256 `A77FD64214F0F0B6685EF6D9C23FE98B4503599F90C3F0D08B6FCBCC866A6DC8`. Release build passed in 1m26s, 715 tasks. Test-signed emulator APK; phone/store candidate remains pending.

Full `npm run verify` at aa80 passed: 660 tests/111 suites, TypeScript, lint, format, security/vendor checks, Expo Doctor 21/21, production audit zero vulnerabilities and both mobile exports. These do not establish human acceptance.

## Observed passes and fixes

| Reproduction                                                                                    | Expected versus observed                                                                                                                                                                               | Evidence stems                                                                                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Active cycle, no workout today; Coach → Calendar                                                | Explains unscheduled state. Cancel leaves Monday unchanged; explicit confirmation moves QA Session October 12 → October 13 and refreshes Coach. Prescription unchanged.                                | convenience-calendar-before-move/preview/cancel/moved-56bc                                                   |
| Coach → today's workout                                                                         | Opens Home's explicit Start control. External JSON has zero sessions/sets and one schedule override. Navigation alone does not log training.                                                           | convenience-coach-today/home-controls/navigation-readback-56bc                                               |
| Start, enter duration, upgrade and Resume                                                       | Baseline actual input required one full swipe. At aa80 input is in first viewport, false guest sync copy and Missing Bodyweight removed. Unsaved 35 seconds survives upgrade.                          | focused-fields-before-layout-fix-56bc, focused-unsaved-input-before-upgrade-56bc, focused-input-first-aa80   |
| Complete set 1 once, select Too hard, enter unsaved 45 seconds in set 2, force-close and Resume | Fresh UI and external JSON confirm exactly one saved 35-second set, recovered 45-second draft, session note, null RPE/RIR and no automatic target change.                                              | focused-save-readback/difficulty-note/recovery-set2/external-readback-aa80                                   |
| Font scale 2, force-close and Resume                                                            | Home badge contained, actual input and Complete visible without overlap. Reset to 1 afterward. Screen-reader acceptance remains unverified.                                                            | focused-home-large-text-aa80, focused-large-text-aa80                                                        |
| Discomfort stop → Cancel; Save partial → I ran out of time                                      | Confirmation explains completed sets/no week advancement. Cancel leaves session active. Partial save contains one 35-second set, no draft, partial/time-limited status, retained note and week 1.      | focused-discomfort-confirmation/partial-confirm/partial-external-aa80                                        |
| Editable private copy → import `QA Hold \| sets=2 \| time=25s`                                  | Missing rest blocks Add. Text edit invalidates preview. Add rest=20s, preview, explicitly Add once, Save and force-close.                                                                              | import-missing-rest-blocked/edited-preview-invalidated/explicit-preview/applied-once/private-plan-saved-aa80 |
| External readback of imported version                                                           | Exactly one new private version: original three 30-second sets plus two added 25-second sets/rest 20. Original saved versions, cycle and actual set unchanged. Text retained as private movement note. | import-saved-external-aa80, import-saved-export-aa80.json                                                    |

All screenshots/UI trees and four external JSON exports are in the [58-file byte/hash inventory](qa/2026-10-13-convenience/evidence.json). Names identify source commit. Android's share sheet delivered JSON to the separate native QA JSON Receiver; records were read from its independent storage.

## Failures, blocked and untested areas

- [Issue 347](https://github.com/camster91/Shift6/issues/347): source inspection confirms actual saved loads lack canonical kg/lb provenance. Recipe/profile units cannot prove historical units. Summary withholds unknown-unit load volume; persistence/comparison/progression still require a fix and native mixed-unit proof. This timed native session does not test loaded sets. Treat this as a launch blocker.
- [Issue 348](https://github.com/camster91/Shift6/issues/348): agent source review found repeated canonical Save can replace the same version JSON. This import preserved old versions through an editable copy, but does not prove all subsequent Saves immutable. Separate fix/native retest required.
- An immediate post-Complete capture showed the pre-write state. `focused-save-in-flight-aa80` is in-flight evidence, not failure. Later UI/external records prove success; no blind repeated tap. Rest expired during inspection; notification delivery is untested.
- ADB synthetic text input now shell-quotes pipe notation and checks focus/readback exactly. Harness limitations are separate from app defects.
- Pre-cycle Coach, reminder delivery/actions, complete keyboard variants, TalkBack journeys, physical S25 Ultra, iPhone/iPad, custom/corrupt media and physical health sources remain untested in this increment. Earlier observed checks remain in docs 36/39.
- Schema 13 lifecycle/recovery/memory, voice and optional Gemini remain separate agent branches, absent from this frozen native candidate. Source tests are not native acceptance.
- Public catalogue remains gated for qualified review. No fabricated approvals, backend activation, live Gemini request, store submission or publication.

## Provisional assessment

**51/100 engineering score; human-use score unverified.** Historical doc 36 score was 53. Integrity loses two points for newly exposed actual-load provenance and repeated-save uncertainties. Convenience passes do not fill physical/participant gaps.

| Doc 34 area                    | Credit/weight |
| ------------------------------ | ------------: |
| Useful first experience        |         12/20 |
| Training/measurement integrity |         14/20 |
| Reliability/recovery           |          9/15 |
| Accessibility/ergonomics       |          4/15 |
| Privacy/user control           |          6/10 |
| Visuals/motion                 |           4/5 |
| Fitness content/expectations   |           1/5 |
| Sustained usefulness           |           0/5 |
| Distribution/support           |           1/5 |
| Total                          |        51/100 |

Zero physical devices, recruited participants, six-week pilot or store acceptance. Unknown areas retain their weight. Resolve integrity findings, review/test integrated features, complete doc 34 physical/accessibility/qualified-content/human gates and [doc 38 store requirements](38_STORE_RELEASE_CHECKLIST.md).

## Exact native run

The generated APK path is overwritten by later builds; check the hash before installing. With this emulator running:

```powershell
$shift6Adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
Get-FileHash 'C:\Users\camst\s6qa\android\app\build\outputs\apk\release\app-release.apk' -Algorithm SHA256
& $shift6Adb devices
& $shift6Adb -s emulator-5554 install -r 'C:\Users\camst\s6qa\android\app\build\outputs\apk\release\app-release.apk'
& $shift6Adb -s emulator-5554 shell am start -n com.shift6.app/.MainActivity
```

For source runs follow doc 35, install lockfile dependencies, retain guest-only/empty API configuration and run `npm run android`. Windows local iOS testing remains pending. Existing GitHub Mac-hosted CI is separate evidence, not physical or human validation.
