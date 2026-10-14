# Local lifecycle, draft and integrity QA increment

13 October 2026. Synthetic records only. The current provisional engineering score remains **51/100**, with human-use acceptance unverified. See [doc 40](40_NATIVE_CONVENIENCE_QA.md) for weights and remaining gates.

## Observed native lifecycle candidate

Local host CAM-DESKTOP, Windows 11 Home 10.0.26200; effective unrestricted filesystem/network instructions, ADB explicitly authorized. Pixel 7 Shift6-QA, Android 16/API 36, emulator-5554 x86_64, WHPX/host GPU, offline guest-only/empty API URL. Native source `001ead9d`, APK SHA-256 `BE54458C5B24E77FF30352E01883E68FF0B7A7DC1ACC6301DF101DD466D221D3`; release build 1m44s/715 tasks. This is an emulator test build.

| Reproduction                                               | Expected / actual                                                                                                                                                                      | Evidence stems                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Dashboard Pause → Cancel                                   | Preview shows actual date/week; cancellation retains active state.                                                                                                                     | lifecycle-pause-preview/cancel-001e                                                                  |
| Pause → Confirm, force-close                               | Paused status survives relaunch. Saved-cycle list opens the exact paused cycle, workout navigation disabled.                                                                           | lifecycle-paused/home-relaunch/saved-cycle-list-001e                                                 |
| Enter planned review date October 20, Confirm              | Exact date preview says no completion/advancement; saved journal shows date and anchored America/New_York zone.                                                                        | lifecycle-review-date-preview/saved-001e                                                             |
| Resume → Confirm                                           | Active at week 1. External schema-13 export has exactly pause → review-date → resume, with parent links. Saved actual sets, plan versions and full cycle row equal prior export.       | lifecycle-resume-preview/resumed/external-receipt-001e; lifecycle-export-001e.json                   |
| Create/start separate private QA Cycle B; open older cycle | List preserves both. Old A is paused with an actual new-cycle pause event. Old A Resume disabled while B active; Open active cycle loads B. No implicit switch.                        | lifecycle-two-cycles-list/other-active-blocks-resume/exact-active-cycle-001e                         |
| Read saved reflection                                      | Explicitly says none saved; read-only route has no activation/save action. External JSON confirms two cycles, only B active, four linked events for A and original saved set retained. | lifecycle-read-only-empty-reflection/two-cycles-external-001e; lifecycle-two-cycles-export-001e.json |

[40-file byte/hash inventory](qa/2026-10-13-lifecycle/evidence.json) includes screenshots, native UI trees and external JSON. Export was opened in the separate native QA JSON Receiver through Android's share sheet.

## Native findings and implementation follow-up

At `001ead9d`, paused Home used first-cycle copy suggesting history would appear only after starting. `e813b5d0` changes it to a truthful private-plan/saved-cycle/resume route. Dashboard's Back to Home used stack Back and actually returned to the saved-cycle list; `95e2ae17` explicitly returns Home. Before captures are retained; both fixes require retest in the next binary. Follow-on harness taps correctly found no Profile on that list; those missing-control exceptions are separate from the destination defect. An immediate cold-launch tap also occurred before Home finished loading; fresh UI inspection subsequently found the control.

## Source implementation and verification boundaries

Full `npm run verify` passed at `0e350df0`: **739 tests/120 suites**, TypeScript/lint/format, security/vendor/assets/config checks, Expo Doctor 21/21, audit zero vulnerabilities, both mobile exports. Earlier integrated runs exposed outdated native transaction adapters and one lint issue in the new deletion regression; these were corrected rather than weakening production transactions. Logs retain the failed runs. This source candidate includes:

- Confirmed lifecycle journal and exact owned-cycle/reflection routes, schema 13 restore/adoption/delete support and consistent export snapshot transactions.
- Private builder recovery with explicit Resume/Discard, after-write saved indicator, preservation of pending pasted text and explicit copying when a canonical version exists. Close hides pasted text; explicit Discard clears it. Uncommitted custom forms and editors still require Add/Done/blur as disclosed.
- Immutable saved program versions ([#348](https://github.com/camster91/Shift6/issues/348)), explicit Continue editing as a new private copy, identical retry and old-pointer protections. Actual SQLite regression preserves cycle-referenced version, program metadata and outbox on refused overwrite.
- Default-off practical local Coach memory, inspect/edit/forget, confirmed preview, owner/CAS protection and exclusion from provider context. Independent review fixes prevent optional reads delaying safety responses and prevent stuck loading after focus changes.
- Exclusive deletion: an actual two-connection SQLite test reproduced an unrelated setup autosave joining the old ambient delete transaction. The isolated native transaction rejects that concurrent write and leaves no draft. This does not claim cancellation of new work explicitly initiated after deletion commits.

The installed `001ead9d` binary predates recovery, memory, immutability and deletion changes above. Their passing source tests are **not native acceptance**. Schema-14 actual-load provenance is a subsequent integrated increment and needs its own complete verification/native readback. Do not attribute the 739-test pass to later changes.

## Pending checks

Native draft force-close/reopen/copy/clear, actual immutable-save refusal, memory enable/confirm/forget/restore-off, schema-14 mixed-unit loaded saves/edits and force-close are pending the next binary. Multi-page cycle lists, historical nonempty reflections, travel-zone behavior, reminder delivery and physical/iOS parity remain untested here. Review dates are planning records, with no dedicated notification promise; repeat-week execution and qualified return prescriptions remain pending.

The earlier native iOS journey now passes its stated scope at native `9f984349`, using GitHub's arm64 iPhone 17 Pro/iOS 26.4 simulator. Evidence is in doc 36's follow-up and [CI run 38355885443](https://github.com/camster91/Shift6/actions/runs/38355885443). It does not validate this later feature candidate, external iOS JSON receipt, deletion, VoiceOver or physical/human use. Windows-local iOS testing remains pending.

Public content remains gated for qualified review. No live Gemini call, backend activation, merge, store submission or paid service. Follow [doc 40's exact ADB instructions](40_NATIVE_CONVENIENCE_QA.md#exact-native-run), checking the installed APK's current hash because builds overwrite its path.
