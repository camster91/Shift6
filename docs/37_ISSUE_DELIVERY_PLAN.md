# Issue delivery plan and store dependencies

Current delivery order and the expanded shipping goal are in [doc 43](43_SHIPPING_GOAL_AND_TODO.md), reconciled against 41 open issues on 13 October 2026. The audit below remains a dated snapshot; its specification/implementation statuses must not be treated as current after subsequent PRs.

Audit date: 2026-10-12. Source base: `4e8a2c9b3ad672b818e6ce9a6fbe02b266573a36`
(merged PR #330), followed by guest guidance/save-copy/goal-unit fixes at
`ae303bd8` and generated-native-output exclusion at `d228d46b` on
`qa/windows-native-guest`. The earlier candidate remains a dated QA snapshot.
Follow-up documentation is based on primary `88ce95bf`; integrated recovery/
health/private-plan work is being tested separately in `qa/local-recovery-health`
through `d9c5b2e2`. Preserve each candidate's SHA and native evidence; integration
and tests are not a merge, public feature approval or store publication.
GitHub returned **39 open issues** during this audit.
Issue #345 was subsequently filed for saved-private-plan discovery. The count
above remains the original 12 October snapshot, not a current completion count.
This is a source/backlog reconciliation, not acceptance of all their criteria.
No issue was closed, app code changed, provider activated or store submission made
by this audit. Native findings and the provisional score belong in doc 36.

The user's expanded goal is a full featured iOS/Android product. Existing issues
include engineering deliverables, design decisions, qualified fitness reviews,
participant studies and actual store acceptance; those cannot all be completed
by coding agents. Preserve the current guest-only candidate while delivering
reviewable feature increments. An open epic is not proof that its existing code
is missing. Conversely, a passing test does not close its device/human criteria.

## Evidence inspected

- Live `gh issue list --state open --limit 100 --json number,title,body`, plus
  #310's fewer-taps acceptance comment; the list is a dated snapshot.
- Docs 25, 26, 33, 34 and 35; doc 14 is dated historical implementation evidence
  and includes superseded backend/count/motion claims.
- `app/onboarding.tsx`, `app/goal.tsx`, `app/workout.tsx`,
  `app/(tabs)/progress.tsx`, `app/(tabs)/coach.tsx` and `app/review.tsx`.
- `src/db/personalGoalRepository.ts`, `src/db/privacyRepository.ts`,
  `src/db/cycleRepository.ts`, `src/domain/shift.ts`, `shiftCalendar.ts`,
  `progression.ts`, `coachProposal.ts`, and `src/services/contracts.ts`,
  `appServices.ts`, `platformHealthProvider.android.ts`, `notifications.ts`.
- `src/config/env.ts`, `eas.json`, `content/release-manifest.json` and doc 20.

The manifest currently enables **zero public programs and exercises**. Private
user-created plans do not inherit public approval. All checked-in EAS profiles
select guest-only mode, and runtime configuration rejects a backend URL in that
mode. Core local training therefore requires no backend. The provider-neutral
Coach boundary exists, but configured shipping profiles disable remote Coach.

## Current issue reconciliation

**Implemented foundation** means relevant source exists, not that all acceptance
criteria pass. **Partial** means an important described capability or verification
is missing. **Specification** means the new workflow is not present in inspected
source. **External evidence** needs people, devices, accounts or provider access.
Issue numbers below refer to https://github.com/camster91/Shift6/issues/NUMBER.

| Issues                                         | Source status and actual remaining work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #270 master; #304 goal-first epic              | Partial umbrella: local training/goals/reviews exist. Requires children accepted and release evidence; cannot blanket-close from a source suite.                                                                                                                                                                                                                                                                                                                                                                                     |
| #271 design; #319 visual world                 | Implemented tokens/artwork/motion foundation, including existing Higgsfield assets. Full design/prompt/Figma approval and small/large native states remain. Preserve licensed assets and reduced motion; no paid generation implied.                                                                                                                                                                                                                                                                                                 |
| #272 foundation                                | Implemented Expo/SQLite/service seams/CI; native builds and device validation remain candidate-specific. Backend/auth/remote monitoring are not current guest dependencies. Signed distribution is external.                                                                                                                                                                                                                                                                                                                         |
| #273 onboarding/profile; #307 simplified setup | Six essential questions, local recovery and profile preferences implemented. Required-field guidance was fixed at ae303bd8. Goal and explicit baseline live in the private-cycle flow. Independent comprehension, cross-platform large-text/screen-reader results and reviewed public entry remain unverified.                                                                                                                                                                                                                       |
| #274 catalogue; #275 programs/builders         | Implemented taxonomy, draft catalogue, immutable versions, private workout/custom-movement builder and substitutions. Any public instructions/template/media require exact-version qualified review. Historical 20/300 targets are expansion breadth, not automatic focused-release quotas.                                                                                                                                                                                                                                          |
| #276 workouts; #310 focus mode                 | Implemented local set/draft persistence, comparable prefill, timer, pause/resume session and partial completion. Current native QA must establish actual records. The #310 fewer-taps expansion still requires focused current-set UX, explicit source cues and ergonomic measurements, not a duplicate logging model.                                                                                                                                                                                                               |
| #277 progression; #311 difficulty              | Deterministic target/readiness/plateau/review logic exists. Do not replace it with AI. Audit and implement the specific one-tap ordinary-difficulty UI without conflating pain/discomfort; content-specific thresholds and actual-device proof remain.                                                                                                                                                                                                                                                                               |
| #278 Coach; #313 explanation layer             | Typed gateway, local explanation, privacy context and confirmed proposals exist. Contextual cross-screen actions and enabled/disabled navigation need acceptance; live provider evaluation/deployment is absent. A standalone Coach tab is not full contextual coaching.                                                                                                                                                                                                                                                             |
| #279 trends                                    | Progress/optional native health/manual metrics exist. #332/#333 have follow-up aggregate/pagination implementations in the integration candidate. Physical permissions, multiple-source records and platform parity remain acceptance gates; see exact native results in doc 36.                                                                                                                                                                                                                                                     |
| #280 privacy/accessibility                     | Owner checks, export/delete, no-op remote analytics and guest boundaries exist. #331 local restore is implemented in the integration candidate, with explicit consent resets/media detachment. Exact-binary traffic, VoiceOver/TalkBack, largest text and permission/deletion/physical restore checks remain; connected-account server obligations apply only if accounts ship.                                                                                                                                                      |
| #281 stores                                    | Partial preparation only: profiles, identifiers and policy/support drafts exist. Signed binaries, actual working public URLs, accurate metadata/declarations, device evidence and owner approval for submission/publication remain.                                                                                                                                                                                                                                                                                                  |
| #305 reconciliation                            | Contract/manifest/breadth reconciliation implemented. Update dated status documents when exact acceptance is reviewed; do not remove historical evidence. Expanded feature scope needs explicit versioned capability documentation.                                                                                                                                                                                                                                                                                                  |
| #306 goal domain                               | Typed protocols, observations, comparability, missing-baseline handling and goal persistence implemented. Native lifecycle/migration and exact issue criteria need readback evidence. Personal goals are not automatically reviewed public Shifts.                                                                                                                                                                                                                                                                                   |
| #309 pilot content                             | Candidate documents and fail-closed manifest exist; qualified version-bound program/exercise review and public enablement are pending. Agents may prepare packets, never invent reviewers or approvals.                                                                                                                                                                                                                                                                                                                              |
| #312 progress/review                           | Personal baseline/latest/best, amendments, target journal, next-choice and cycle review exist. Audit all required milestones, declined tests, completed-history navigation and native comprehension before acceptance. A saved next-choice is not a new cycle start.                                                                                                                                                                                                                                                                 |
| #314 engagement                                | Local reminders, limited analytics schema, optional/reduced motion foundations exist. Full versioned event dictionary/denominators, interruption outcomes and device notification proof remain. Remote analytics stays off in guest release.                                                                                                                                                                                                                                                                                         |
| #315 interruptions                             | Read-only calendar/pause projection exists (`shiftCalendar.ts`). The issue itself records missing explicit pause/resume/repeat-week transactions, shared UI and reviewed re-entry rules; pausing another active cycle during cycle creation is not this workflow.                                                                                                                                                                                                                                                                    |
| #316 pilot                                     | Protocol specified; no actual consented cohort/six-week outcomes established by this audit. Participant recruitment/contact and qualified review require real people and separately instructed external actions.                                                                                                                                                                                                                                                                                                                     |
| #331 restore                                   | Implemented follow-up candidate: setup/Profile picker, schema-12 graph validation, inert preview/separate confirmation, owner remapping, exclusive atomic empty-target restore and read errors. Includes goals/drafts/corrections/reviews; credentials/outbox replay excluded. Consent/reminders reset off and custom media links detach. Limits: 20 MiB/50,000 records, no merge/overwrite. Physical iOS/Android picker, large-history/interruption/reexport acceptance remains; implementation/regressions do not close the issue. |
| #332 health totals                             | Implemented follow-up candidate: platform step aggregates, documented source/overlap policy, replacement of historical imported ranges and availability failure preserving the cache. Synthetic fixtures/regressions are evidence of bounded behavior; actual native multiple-source totals/source-priority/permission acceptance must be recorded against the installed binary, with physical/platform parity pending.                                                                                                              |
| #333 pagination                                | Implemented follow-up candidate: bounded raw-record page continuation with repeated-token/failure guards, range retention and incomplete-import handling. No new background permission. Source tests do not prove a real 1001-record import; exact native records/readback and permission-revocation results belong in doc 36, with physical iOS/Android gates remaining.                                                                                                                                                            |
| #334 Gemini                                    | Specification beyond existing generic HTTP seam. Add independently gated optional Coach transport with server-held key, bounded context, quotas, safe typed responses and local fallback; never silently enable general sync/accounts. Live activation requires service access and usage-budget decision.                                                                                                                                                                                                                            |
| #335 nutrition                                 | Product/evidence spike, not an agreed food-tracker implementation. Issue acceptance calls for pilot need and a scoped/no-build decision. Full-feature intent does not turn uncertain photo portions into measurements or authorize medical/diet prescribing.                                                                                                                                                                                                                                                                         |
| #336 voice                                     | Specification: no native speech adapter/dependency or push-to-talk set flow found. Add deliberate permission/listening, parser and editable confirmed draft through existing set transaction; establish actual on-device/remote behavior per platform.                                                                                                                                                                                                                                                                               |
| #337 plan import                               | Specification: recoverable builder exists, pasted-text/photo import absent. Start with local typed extraction/validation and one editable preview; selected-image OCR/provider processing is a separate optional capability. Imported plans stay private.                                                                                                                                                                                                                                                                            |
| #338 quick actions                             | Notification/native-intent foundations exist; dedicated resume/timer launcher/action workflow not established. Implement ownership/stale-session/idempotency rules and actual platform background tests before promising lock-screen controls.                                                                                                                                                                                                                                                                                       |
| #339 Coach actions                             | Specification beyond existing confirmed proposal application. Implement allowlisted capability registry/dispatcher bound to owner/version with readback; no arbitrary model SQL/URLs or direct mutation. Depends on accepted underlying workflows.                                                                                                                                                                                                                                                                                   |
| #340 conversational setup                      | Specification: `CoachContext` currently requires a cycle. Add pre-cycle context and validated draft proposals using existing recovery; missing values remain unresolved, local form remains complete and content gate remains enforced.                                                                                                                                                                                                                                                                                              |
| #341 Coach memory                              | Specification: bounded context/privacy foundations exist, no inspect/edit/forget memory workflow established. Canonical records remain authoritative; add task-specific retrieval, consent, provenance, invalidation and export/restore/delete support.                                                                                                                                                                                                                                                                              |
| #342 coaching reviews                          | Typed weekly/cycle tasks and deterministic review facts exist. Interactive questions, persisted evidence/decisions and routed confirmed next-step changes are expansion work; no generated adherence/achievement.                                                                                                                                                                                                                                                                                                                    |
| #343 proactive prompts                         | Intervention/reminder preferences exist, bounded local trigger cards do not establish this whole workflow. Add stale-event dedup, quiet/snooze/disable control and useful next action; never background paid AI/uploads by default.                                                                                                                                                                                                                                                                                                  |
| #345 saved private plans                       | Implemented isolated fix 656a6da6 and integrated candidate: latest owned version per plan, discoverable while public manifest is empty; actual workouts/custom movements open through explicitly labelled editable copy, retaining immutable history. Honest loading/retry and owner-change isolation. Twenty focused tests passed. Android relaunch/source-data retest must match doc 36; iOS remains pending until tested. Public gates unchanged.                                                                                 |

## Combined verification evidence, 13 October

Full `npm run verify` passed at `cc99c873` plus a formatting-only builder-test
correction (subsequently committed as `7016fe3a`): **588 tests in 96 suites**,
five security tests, Expo Doctor 21/21, formatting/lint/TypeScript,
assets/secrets/release configuration, vendor inventory, production audit with
zero known vulnerabilities, and iOS/Android Hermes exports. The first run stopped
at formatting; `verify-cc99.log` preserves that failure and
`verify-cc99-retry.log` records the full successful run. RestoreScreen test
confirmation callbacks emitted React act() harness warnings; no suite failed.
This is exact engineering evidence, not physical usability or iOS device proof.

The later `d9c5b2e2` restore weekday validation and `88ce95bf` dependency-endpoint
change require their own applicable regression/integration evidence; the
588-test run is not silently reassigned to later commits. Public content readiness
still fails intentionally because approved enabled Shift IDs are absent.
Release assets passed their local gate. Qualified review, signed candidates,
actual support/policy URLs, native accessibility/permissions, participant work
and store acceptance remain open regardless of repository verification.

## Reviewable delivery phases

1. **Finish the present native QA increment.** Reproduce defects using synthetic
   data, preserve local changes, correct guest copy/setup guidance/units, and
   obtain export outside the app plus saved-record recovery/deletion evidence.
   Run focused regression checks and `npm run verify`; record commit, binary,
   device, steps, expected/actual and captures. Prepare a PR, not a release claim.
2. **Accept the local recovery/health increment.** #331 and #332/#333 now have
   integrated source implementations; do not reimplement them from stale issue
   descriptions. Confirm graph/restore policy and aggregate/pagination behavior
   against their exact acceptance criteria. Preserve one owner for the shared
   health boundary. Exercise malformed backups, partial grants, repeated pages
   and cancellation, then native picker/health scenarios on both platforms.
   Updated support/privacy drafts describe the candidate's limits, not launch.
3. **Effortless deterministic core.** Complete #315 local schedule transactions,
   #310/#311 input/focus/difficulty ergonomics and #312 review/history gaps.
   Build from shared repository/domain workflows. Re-entry prescription thresholds
   and shorter variants wait for #309 review; engineering can implement preview,
   persistence and safe pause/reschedule without inventing training advice.
4. **Local convenience.** Deliver #337 pasted-text drafts, then #338 quick resume,
   followed by #336 speech only after supported native transcription behavior is
   confirmed. Measure taps/time/error with actual users instead of assuming AI
   reduces effort. Native integrations require iOS and Android device checks.
5. **Coach foundations and optional provider.** #341 canonical retrieval/memory
   and #339 deterministic capability dispatcher precede broad conversational
   writes. #340 pre-cycle draft context can run in parallel with these bounded
   contracts. Implement #334 server adapter as a separately disabled capability;
   activate only after secrets/access, authentication/pairing, privacy and budget
   gates. Then #342 interactive reviews and #343 controlled local triggers reuse
   validated facts/actions. Provider failure must leave every core workflow usable.
6. **Public content, product proof and store candidates.** Prepare #309 exact
   review packets now while engineering proceeds; obtain actual qualified review.
   Keep #335 as a scoped evidence decision. Finish #271/#319 visual review and
   #314 event definitions, then #316 consented usability/pilot work. Complete
   #281 signed candidate/device/declaration/support/listing package. Exact store
   submission/publication requires the user's explicit final instruction.

Each phase ends in a small reviewable PR with acceptance evidence and remaining
unchecked criteria. Parent epics close only after applicable children and their
external criteria are actually accepted. Never close a specification merely
because it was documented, or automatically close pilot/store issues after tests.

## Independent ownership and next acceptance batches

Use a separate branch/managed checkout for the next increment. Agent ownership
below avoids competing edits in the frozen QA candidate. A coordinator owns shared
schema migrations, package changes and integration; workers do not independently
renumber migrations or reformat another worker's files. Read each live issue body
and comments again before coding because the acceptance contract can evolve.

| Batch / issue                                      | Exclusive responsibility                                                                                                                                                                                                                            | Acceptance evidence needed for the issue, beyond code existence                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: local restore #331                              | New pure export-graph parser/validator, restore repository and tests; profile restore/file-picker integration belongs to this owner. Coordinate any shared schema/package edits.                                                                    | Preserve private plans/versions/cycles/workouts/sets/goals/drafts/amendments/reviews/preferences in an empty-install round trip; preview schema/counts/conflicts; explicit confirm; supported/unsupported schema outcomes; consistently remap owners/references; exclude credentials/outbox replay; rollback malformed/interrupted imports; reject or safely deduplicate repeat imports. Actual iOS/Android file pickers and large-history restore remain required before claiming full recoverability. |
| B: health correctness #332 and #333 together       | Android health provider, normalization/import completeness contract and health tests. One owner handles both because aggregate and raw pagination paths overlap. Apple policy may be specified/tested but needs its platform owner for integration. | Match platform-priority aggregates for overlapping steps; document/test sleep/source overlap; retain distinct activity and idempotent IDs; test empty/partial grants/priority changes; paginate every required raw type across 2+ pages; bound runaway/repeated tokens; report page-two failure/cancellation/revocation as incomplete; retain range/source filters; never turn unknown coverage into zero. Real multiple-source Android records and Apple behavior remain native acceptance gates.      |
| C: lifecycle #315, bounded local transaction slice | Schedule/pause journal design, cycle repository actions, shared calendar projection and tests; coordinate schema migration centrally. UI follows after the transaction contract is integrated.                                                      | Owner/version-bound idempotent pause/resume/repeat preview and confirm; revised dates/history; offline interruption recovery; common Home/Calendar/Progress/reminder projection; reminder suppression/rescheduling; DST/timezone/midnight/clock-correction tests; no fabricated completed work or catch-up. Qualified template-specific re-entry/short-session/rebaseline rules and native UI tests remain open; do not invent universal dose reductions to close the issue.                            |

The A/B implementations are now in the integration candidate. Their rows above
describe ownership and remaining acceptance evidence, not absent functionality.
Finish candidate-specific native/fault verification and correct any demonstrated
failures before closing #331/#332/#333. C can begin with a pure domain contract
while that evidence is collected; integrate migrations serially. For each
batch, run focused adversarial tests, then `npm run verify` on the integrated
candidate. Rebuild/install native binaries after native-module/package changes;
JavaScript-only tests do not establish file-picker, permissions or background
behavior. Keep synthetic export/health data out of public issue attachments.

The next convenience batch should own #310/#311 workout input/focus UI before
adding #336 speech: reuse actual saved values/drafts, disclose previous/target
prefill sources, confirm once, preserve correction semantics and distinguish
ordinary difficulty from discomfort. #337 local pasted-note extraction can be
independent of speech and provider activation, but its parser/preview must retain
ambiguous values unresolved. #338 needs a native platform owner and actual
cold-start/background acceptance; a declared shortcut alone is not a pass.

Coach work should have separate owners for #341 bounded canonical retrieval/
memory and #339 capability validation/dispatcher, with one coordinator owning
shared `CoachContext` changes used by #340. #334 mock/server preparation can be
reviewed without a Google key or deployment; live provider criteria remain open
until configured-model evaluations, quotas, privacy and fallback are demonstrated.
#342/#343 should consume accepted local facts and actions, rather than introduce
another progression engine or automatic background provider requests.

This is an executable engineering queue, not a decision to close all 39 issues
at once. Every remaining checkbox has one of three outcomes: observed pass with
exact evidence, reproducible failure to fix, or an explicit unresolved external
dependency. Do not substitute a broad "full featured" claim for those outcomes.

## Services, people and account gates

| Capability                                                         | Required external dependency                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest core, restore, typed text import, deterministic explanations | No backend or paid service required. Native files/permissions still need device validation.                                                                                                                                             |
| Health                                                             | Health Connect/HealthKit availability, deliberate read permission and representative records; device evidence, not a server.                                                                                                            |
| Speech                                                             | Native module and supported platform recognition capability; identify whether processing is on-device. Remote transcription is separate opt-in and cost/privacy review.                                                                 |
| Gemini                                                             | Server-held Gemini secret, current model/data-policy evaluation, scoped access/auth, usage limits and hosting. Existing Coolify approval concerned Stride; this audit does not deploy Shift6 or spend provider funds.                   |
| Cloud/accounts                                                     | Not a requirement of present guest build. If enabled later, auth/sync/deletion/retention obligations and actual server testing must be completed.                                                                                       |
| Public training catalogue                                          | Qualified human review bound to exact program/exercise/media versions, with review evidence saved through the existing manifest workflow.                                                                                               |
| iOS                                                                | Mac/Xcode or a properly signed iPhone build, distribution identity/provisioning and real VoiceOver/device QA. Windows Android checks do not validate iOS.                                                                               |
| Store release                                                      | Owner-controlled Apple/Google developer access, signing, verified support/policy URLs, exact-candidate declarations/listing/assets and final submission/publication authorization. No enrollment/payment or store write performed here. |
| Human effectiveness                                                | Consenting participant sessions and six-week pilot with denominators. Agents cannot fabricate participants, human approval or clinical efficacy.                                                                                        |

This plan does not supply current store-policy/setup instructions; verify current
official Apple/Google/Expo documentation when those account-specific steps are
actually undertaken. It does not promise unsupported permission-mode controls
or another machine as a bypass. Maintain an honest doc-34 score with untested
areas retaining their weight and critical failures blocking launch.
