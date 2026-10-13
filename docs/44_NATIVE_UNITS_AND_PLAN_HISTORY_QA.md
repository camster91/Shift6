# Native prescription units and private plan history QA

13 October 2026. Synthetic data only. The provisional engineering score remains **51/100**, with the unchanged [doc 40 weights](40_NATIVE_CONVENIENCE_QA.md) and [doc 34 acceptance rubric](34_HUMAN_USE_ACCEPTANCE.md). This increment proves one native prescription-label correction; mixed-unit actuals and original-plan history checks remain in progress and earn no additional score yet.

## Environment and frozen candidates

Native ADB QA ran on the authorized CAM-DESKTOP, Windows 11 build 26300, Pixel 7 Shift6-QA emulator, Android 16/API 36, x86_64, emulator-5554, hardware-accelerated WHPX/host GPU. Guest-only, offline, empty API URL; unrestricted task filesystem/network permissions and explicit ADB authorization. Synthetic private plans do not grant public fitness content approval.

| Native source | APK SHA-256                                                        | Scope                                                                                                     |
| ------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `71babfc8`    | `556ACBB91BCE61AE86B1660152EB1BD696696CB1B5348BD1CBC8626C85A3E963` | Before-fix imported 40 kg target falsely labelled lb; original private plan saved and externally exported |
| `90d7128c`    | `579A5969B0CA5E7D99BFF6804331EF766EB6DC6CAF25EB47A6D7AE0A0D56B816` | Corrected kg label observed when reopening a private copy; mixed-unit and history journey continuing      |

The preceding candidate hash is also recorded in [doc 42](42_GUARDED_LOCAL_WORKFLOWS_QA.md). These x86_64 test APKs do not establish physical Samsung S25 Ultra, iPhone or store-build acceptance.

Intended evidence location: [units evidence inventory](qa/2026-10-13-units/evidence.json). The coordinator will package PNG/XML captures and externally received JSON there. File stems below refer to the PNG/XML pair. Preserve binary-specific findings when later builds overwrite the generated APK path.

## Reproduced issue #353 and observed correction

Reproduction on `71babfc8` under Imperial preferences:

1. Programs → Build from blank. Name the private plan QA Units and add the required workout QA Units A.
2. Add private Reps-tracking QA KG, with explicit synthetic movement details. Import `QA KG | sets=1 | reps=5 | load=40kg | rest=0s`; inspect Preview, then Add reviewed rows to this workout. Remove the initial blank/default occurrences so the intended imported row is unambiguous. Preserve the removal/action context in the evidence.
3. Inspect Load target for QA KG. Expected: 40 with a kg label because the prescription explicitly declares kg. Actual: raw value 40 beside **Load (lb)**, while the original import note still declares 40kg.
4. Save draft program and export through the native share sheet to the separate QA JSON Receiver. Open and read the receiver's file. `unit-original-private-export-71ba.json` has integer schemaVersion=14, 1034 records, private QA Units version 1 and one QA Units A occurrence with reps=5, load={value:40, unit:"metric"}, restSeconds=0. This confirms a misleading editor label rather than conversion of the stored prescription to lb.

Evidence: `unit-builder-entry-71ba`, `unit-builder-workout-added-71ba`, `unit-custom-kg-added-71ba`, `imported-40kg-labelled-lb-before-fix-71ba`, `unit-private-draft-saved-before-fix-71ba`, `unit-original-private-export-received-71ba`; `unit-original-private-export-71ba.json`.

The reproducible defect is tracked in [#353](https://github.com/camster91/Shift6/issues/353), which remains open pending delivery and its full acceptance checks. Source `90d7128c` changes TargetEditor to label an existing explicit prescription using target.load.unit, while preserving its raw value and existing edit/save unit semantics. Profile preferences supply the label only when there is no existing load prescription.

After upgrading to native `90d7128c`, opening the saved QA Units as a private copy shows **Load (kg)** with 40. Capture: `imported-40kg-labelled-kg-after-fix-90d7`, with entry context `unit-copy-opened-after-fix-90d7`. This is the observed native correction for the kg-under-Imperial case. The reverse lb-under-Metric case is source-tested, not native-tested in this increment.

## Source verification

Both mismatch cases first failed real builder component journeys: imported 40kg under Imperial and 40lb under Metric showed the wrong label. Corrected import → explicit preview → append → edit value to 42 → blur/commit → normal save tests prove label/value coherence, preservation of the original declared unit and retention of the original user-owned note. No actual-load persistence, progression threshold or unit-conversion rule was changed by this label fix.

Full `npm run verify` passed at `90d7128c`: **874 tests / 129 suites**, formatting, lint, TypeScript, Expo Doctor 21/21, audit zero vulnerabilities, 143 vendored source/license hash checks, security/assets/config/secret checks and both mobile Hermes exports. The native Android build passed in 2m32s, 756 tasks including 30 executed. Logs: `verify-builder-unit.log` and `build-builder-unit.log` in the QA workspace. Passing these checks does not establish the pending native actuals/history flows.

## In-progress actual units and original-plan integrity journey

The coordinator is continuing with a new private QA Units Mixed copy and an explicitly reviewed QA LB row: `QA LB | sets=1 | reps=5 | load=90lb | rest=0s`. Recovery-choice and recovered kg/lb captures currently exist, but final canonical save, actual values and external comparisons have not yet been accepted in this report.

Acceptance still to record:

- Force-close/reopen with an edited unsaved private copy and unsubmitted pasted text; explicit Resume must recover the exact values without auto-applying the import. Save/start only after deliberate confirmation.
- Export the saved new copy and compare the original QA Units program/version bytes and earlier cycle-referenced versions against `unit-original-private-export-71ba.json`. New-copy changes must not overwrite an old saved version. New IDs/pointers belong to the new private program; no issue #348 closure is inferred from the label fix.
- Under Imperial preferences, actual KG fields must retain kg and LB fields lb. Unit-conversion preview cancellation must preserve the input; confirmation must preserve physical equivalence. Force-close recovery must retain the declared unit alongside the actual number.
- Log reviewed 40kg × 5 and 90lb × 5 through the normal Complete controls. External schema-14 completed-set provenance and draft sidecars must agree with values, session/owner IDs and timestamps. Expected normalized volume for these two sets is **404.1165665 kg-reps**; do not add 40 and 90 as if they shared units.
- Edit an existing actual explicitly. Preserve its completed-set ID and idempotency identity, update the measurement/provenance together and verify external readback. Unknown historical load must remain unknown until an explicit edited measurement declares its unit.
- Compare the next actual workout's deterministic targets using real saved performance. Missing/lower/noncomparable declared loads must hold the source prescription. Blank private plans currently have no explicit progression-rule IDs and use the existing fallback increment of 5 in the declared target unit; do not expect 2.5kg without the applicable rule, inject a rule, manufacture a six-week completion or grant qualified training approval.

These checks relate to [#347](https://github.com/camster91/Shift6/issues/347) and [#348](https://github.com/camster91/Shift6/issues/348). Source safeguards and automated tests are recorded separately from completed native acceptance. The coordinator will append concrete results, screenshots and export comparisons after running them.

## Remaining boundaries and exact run

No physical-device testing, current-feature iOS acceptance, recruited human usability validation, six-week pilot or store acceptance in this increment. Earlier iOS simulator evidence is dated to its earlier native source in [doc 36](36_PC_NATIVE_QA_REPORT.md) and does not validate this later binary. Windows-local iOS remains pending. Native audio recognition remains capability/model-blocked on this emulator as recorded in [doc 42](42_GUARDED_LOCAL_WORKFLOWS_QA.md); typed transcript review is separate evidence.

Public catalogue approval remains gated. No live Gemini call, backend activation, paid service, merge, publication or store submission. Follow the [reconciled shipping todo](43_SHIPPING_GOAL_AND_TODO.md), [store checklist](38_STORE_RELEASE_CHECKLIST.md) and [exact native launch instructions](40_NATIVE_CONVENIENCE_QA.md#exact-native-run). Before installing `C:\Users\camst\s6qa\android\app\build\outputs\apk\release\app-release.apk`, measure its SHA-256 because the path is overwritten by later builds.
