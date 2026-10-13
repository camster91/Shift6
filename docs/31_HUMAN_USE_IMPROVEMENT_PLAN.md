# Human-use improvement work and remaining evidence

> Historical checkpoint. The authorized guest-only mobile implementation in
> [doc 33](33_MOBILE_GUEST_RELEASE.md) supersedes the server dependency and disabled
> goal-writer status below. Current device and human acceptance is in
> [docs 13](13_NATIVE_RELEASE_VERIFICATION.md) and [34](34_HUMAN_USE_ACCEPTANCE.md).
> The following historical results are not current test or audit totals.

This work follows the goal-first scope in docs 25–30: beginners and returning
exercisers completing six weeks around one measurable goal. It does not claim a
100/100 result, approve fitness content, or authorize a public release.

## Implemented in this change

- Account startup can repeat after guest adoption without trying to merge an
  empty guest into an occupied account. A genuine occupied-destination merge
  remains blocked. Pending profile revisions retain their distinct operation
  identities during adoption; notification preferences acquire the new owner.
- All current sync writers queue immutable operation snapshots. Entity identity
  remains stable; each edit receives a new persisted retry key. Acknowledging an
  older in-flight snapshot leaves newer edits intact. Queue insertion order
  handles equal or unchanged timestamps. Only one outstanding snapshot per
  entity is sent in a batch; later snapshots cannot overtake an unresolved one.
  Successful batches drain sequentially, bounded to ten network requests per
  online run, and stop on conflicts, failures or partial results.
- Workout hydration uses progression suggestions for new sessions, restores
  drafts, preserves in-memory edits on same-session revisions, and gives saved
  completed sets precedence over stale autosaved drafts. Cleared fields stay
  cleared. Prescribed RPE/RIR does not become a claimed report of actual effort.
- Setup choices now recover locally after native activity recreation or restart;
  the final Save setup remains explicit. See doc 32 for the native findings.
- New setup has six essential screens: goal, experience, equipment, rhythm,
  units and review. Name, movement/accessibility preferences, health and Coach
  preferences remain reachable before saving and through existing settings.
  Health is off by default. Coach defaults are disclosed; account setup saves
  using the current owner. Existing profile editing retains the detailed flow.
- Today resumes unfinished workouts before suggesting another session. A
  seven-day absence displays a scheduling/return cue without changing the
  prescription or inventing a reviewed return-to-exercise rule. Skipped attempts
  do not reset this cue; completed and partial training do.
- Optional effort detail uses plain language. Set rows wrap, inputs have minimum
  rather than fixed heights, the rest-timer action has a contrasting background,
  and shared scroll screens adjust for the keyboard and retain button taps.
- The redundant cycle percentage is removed: being in week one does not mean
  17% of the training has been completed. The six-week indicator retains the
  actual prescription position.
- Expo SDK 57 dependencies are aligned with current compatible patch versions.

## Remaining implementation, in dependency order

These are the existing contract's unfinished capabilities, not extra catalogue
or AI scope. Production goal writes remain disabled by the persistence boundary
in doc 28 until the mobile/server protocol and transactional checks exist.

| Module | Existing contract | Dependencies | Completion evidence |
| --- | --- | --- | --- |
| reviewed-pilot-content | 25, 30 / #309 | Fitness reviewer and exact template/protocol IDs | Three representative approved candidates; every referenced exercise reviewed; allowlist and direct-route/cache checks |
| measurement-persistence | 27, 28 / #306 | Versioned server acceptance and owner authorization | Atomic records/outbox; append-only corrections; immutable protocols; owner isolation; adoption, export, delete and retry integration tests |
| goal-and-baseline | 25, 27 / #307 | reviewed-pilot-content, measurement-persistence | Concrete objective and comparable measurement; measured/deferred/not-yet-able baseline; plan vs add-on; restart recovery |
| today-and-training | 25 / #308, #310 | goal-and-baseline | One primary action; goal/context visible; appropriate inputs and reviewed instructions; partial, offline and correction paths |
| calendar-and-return | 29 / #315 | reviewed-pilot-content, measurement-persistence | Pause intervals and schedule revisions persisted; elapsed calendar distinct from prescription week; explained re-entry choices |
| result-and-next-choice | 27 / #311, #312 | today-and-training, calendar-and-return | Comparable baseline/final observations; estimates distinct; review records missing/declined states; maintain/repeat/modify/new goal/break persists |
| human-validation | 25 / #316, #319 | Integrated preceding modules | Native screen-reader/large-text/keyboard/offline checks; approved representative visual direction; observed user task success and a consented pilot |

The server implementation is not in this repository. Inventing acceptance or
letting the existing v1 transport silently discard measurements would contradict
the product's data-integrity requirements. The public manifest is still empty;
no reviewer signatures, real measurements or efficacy claims have been generated.
The subsequent native build and media evidence is recorded in doc 32.

## Review protocol

Run an initial moderated round with 8–12 beginners/returners, including people
who use large text or assistive technology. Have them choose a goal, establish or
defer a baseline, start training, identify the next set, correct an entry, finish
partially, return after a missed week, and explain their result and next choice.
Record critical errors, assistance required, comprehension and perceived effort.
This is qualitative research, not a representative population estimate.

Agree on release acceptance criteria before observing outcomes. Follow with a
consented six-week pilot; report denominators for eligible participants, starts,
first sessions, week-two return, assessment offers, comparable measurements,
review completion and next choices. Declining an assessment or taking a break
must remain distinguishable from missing data. No score upgrade or efficacy
claim is earned simply by increasing feature count.

## Research rationale

- [NN/G: mobile onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/)
  informs reducing initial setup and moving optional choices to relevant moments.
- [NN/G: progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
  informs keeping effort detail available without crowding routine logging.
- [Health-app engagement systematic review](https://www.jmir.org/2020/5/e17572)
  supports studying input burden, progress feedback and personalization.
- [Behavior-change review](https://mhealth.jmir.org/2020/3/e17046) reports mixed
  effectiveness evidence; implementing goal-setting and tracking does not prove
  better outcomes.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) guides targets, contrast and operable
  interfaces. Source changes do not certify native accessibility conformance.

## Verification

Regression tests use real SQLite migrations for account/sync lifecycle failures.
Pure input hydration tests cover suggestions, drafts, completed entries, cleared
fields and actual effort. Return-cue tests cover partial/skipped sessions and
future dates. Coordinator tests cover serial draining and stopping on conflicts.
Run `npm run verify` for the complete repository gate. Its native JavaScript
exports are build evidence, not signed-device testing or store readiness.


### Local results, 2026-10-11

This checkpoint precedes the custom-media/native increment. Its newer results
and remaining native evidence are in [doc 32](32_NATIVE_MEDIA_AND_BUILD_EVIDENCE.md).

- 75 Jest suites / 441 tests passed after the compatible dependency fixes.
- Formatting, ESLint, TypeScript, asset validation, secret scan and release
  configuration validation passed.
- Expo exports for iOS, Android and web passed. No signed binary or native
  usability/accessibility test was performed.
- Expo Doctor passed 19/21 checks. The Expo schema request was refused and the
  React Native Directory metadata request failed; these two checks remain
  unverified. SDK package version alignment passes after the patch updates.
- `npm audit fix --ignore-scripts` updated compatible transitive dependencies,
  including shell-quote (critical finding removed) and brace-expansion.
  `npm audit --omit=dev` still reports 62 vulnerability entries: 45 high and 17
  moderate. The direct advisory sources are braces, node-forge,
  decode-uri-component, sprintf-js and uuid; dependent package entries account
  for the larger total. This dependency-graph report is not a finding that all
  62 are reachable in the native app. npm's remaining suggested fixes include
  incompatible SDK changes. Dependency inspection locates node-forge in Expo
  CLI/certificate tooling, uuid in Xcode/config plugins, and braces/sprintf-js
  in test tooling; decode-uri-component is under Expo Router/query-string and
  merits route-input reachability review. These locations do not establish
  exploitability. No forced SDK downgrade or unverified override was
  applied. Upstream-compatible remediation and shipping-binary reachability
  review remain necessary; the audit gate fails.
- Public release/content/native gates remain open. The production goal writer
  still requires the matching backend or an explicitly scoped guest-only
  product contract. No GitHub push, merge or deployment was performed.
