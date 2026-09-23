# Historical scope disposition for #305

The source tree was inspected at `e3da528aca3c03b2fe443470e2e0c4601702e6a6`. [#304](https://github.com/camster91/Shift6/issues/304) is canonical. This inventory records the treatment of old count/feature language; the [release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) governs current scope.

| Occurrence | Classification | Disposition |
| --- | --- | --- |
| README, master plan, screens, brand, build prompt and store copy claiming 20 launch programs, hundreds/300+ exercises, broad fitness OS, Coach/Health as central | Obsolete focused-v1 product copy | Recast as future ambition or historical inventory; current goal-first journey and proposed store story take precedence |
| `docs/05_*`, `docs/06_*`, `docs/09_*`, `docs/12_*`, `docs/14_*`, `docs/17_*` recording 20 executable entries, 58 draft exercises and earlier PR/test work | Historical implementation/status | Preserve dated facts, explicitly label them historical; no human review or release approval implied |
| `LAUNCH_PROGRAM_TARGET=20`, `LAUNCH_EXERCISE_TARGET=300` and `assessLaunchProgramCatalogue`/`assessExerciseCatalogue` | Future catalogue breadth validators | Retain as optional breadth assessments; focused release uses `assessFocusedReleaseContent` against the versioned allowlist |
| Existing catalogue readiness unit tests using 20/300 records | Test fixtures for future breadth | Keep for regression, add focused manifest tests with no minimum catalogue count |
| Store screenshots, metadata and checklist in `docs/15_*` | Historical/obsolete planned marketing | Goal-first story is the current proposed sequence; replace examples and verify exact build before submission |
| Health and Coach implementation docs | Supporting/gated architecture | Keep technical foundation; optional and only advertised when enabled and verified |

No count is deleted from historical records. No unreviewed content is promoted. The existing production runtime hid drafts based on review; the focused allowlist further restricts public startability and exercise discovery. #306/#309 must extend the same rule to new Shift deep links, substitutions, recommendations and offline cache paths. Existing user-owned cycles must remain readable; do not rewrite old records as approved Shifts.
