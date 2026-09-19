# SHIFT6 stacked PR verification and merge sequence

Updated: 2026-09-19

This runbook records the verified cumulative head, the broken intermediate stack state, and the safe
path to a reviewable integration branch. GitHub Actions are enabled, but no PR should be merged based
only on static review or on a successful descendant check that does not match the branch being merged.

## Current verification evidence

- PR #301 is green at `ccff7e5`; its GitHub quality run completed successfully.
- The local reconciliation candidate combines the cumulative #301 tree, documentation PR #284, and
  the still-relevant reviewer-provenance requirement from #293.
- The local candidate passes `npm run verify`: 68 suites / 376 tests, Expo Doctor 21/21, and a
  31-route web export.
- The strict release-ready validator remains intentionally blocked on real production URLs/network
  evidence and approved final icon/adaptive-icon/splash assets.

## Current stack

Code stack, oldest prerequisite first:

1. **PR #282** — `feat/launch-program-catalogue` → `main`
   - canonical 20-program catalogue and executable draft versions;
   - exercise tranche/band support;
   - progression-rule and mixed-modality fixes;
   - Coach evaluation matrix;
   - error-reporting boundary;
   - CI/verification/readiness foundation.
2. **PR #283** — `feat/profile-considerations-body-metrics` → `feat/launch-program-catalogue`
   - structured movement/accessibility preferences;
   - manual local weight history;
   - migration 19;
   - export/delete/account-adoption coverage.
3. **PR #285** — `feat/account-deletion-boundary` → `feat/profile-considerations-body-metrics`
   - authenticated remote-deletion mobile contract;
   - fail-closed transport;
   - in-app account deletion/recovery UX;
   - SecureStore post-delete recovery marker.
4. **PR #286** — `feat/coach-privacy-controls` → `feat/account-deletion-boundary`
   - provider Coach processing off by default;
   - explicit local privacy preference and disclosure;
   - runtime provider message gate with deterministic local fallback;
   - migration 20;
   - provider-bound context identifier minimisation.
5. **PR #287** — `feat/accessibility-primitives` → `feat/coach-privacy-controls`
   - shared disabled/busy accessibility semantics;
   - non-colour selected-chip cue;
   - single-focus interactive program/workout cards;
   - font-scaling, progress, touch-target and colour-contrast regression tests.
6. **PR #288** — `feat/workout-accessibility` → `feat/accessibility-primitives`
   - contextual spoken Button labels for repeated actions;
   - radio/checkbox-capable Chip semantics;
   - independent ErrorState and EmptyState recovery/action focus targets;
   - independent Coach proposal decision focus targets;
   - regression tests for the shared interaction boundaries.
7. **PR #289** — `feat/exercise-content-quality-gates` → `feat/workout-accessibility`
   - stricter exercise structural/publication checks;
   - optional draft-compatible media provenance schema;
   - rights/licence checks for approved media;
   - explicit human technique-review gate for generated media;
   - 300-publication-ready-record launch threshold and duplicate stable-ID check;
   - human content/media review runbook.
8. **PR #290** — `feat/program-content-quality-gates` → `feat/exercise-content-quality-gates`
   - traceable fitness-content review evidence for curated programs;
   - separate catalogue/executable/reviewed/publication-ready counts;
   - launch metadata and review-evidence integrity checks;
   - 20-program publication-readiness gate;
   - human program review runbook.
9. **PR #291** — `feat/coach-proposal-privacy-gate` → `feat/program-content-quality-gates`
   - provider plan-proposal privacy gate with no local mutation fallback;
   - authenticated SHIFT6 API transport regression coverage;
   - urgent/medication/nutrition/injury safety-route hardening;
   - bounded structured Coach proposal mutations;
   - expanded adverse-case evaluation matrix;
   - production provider release-evidence runbook.
10. **PR #292** — `feat/sync-contract-hardening` → `feat/coach-proposal-privacy-gate`
    - fail-closed sync response validation;
    - idempotency, authorization and conflict-handling contract.
11. **PR #294** — `fix/runtime-content-release-gates` → `feat/sync-contract-hardening`
    - fail-closed production exercise/program publication gates;
    - explicit development-only draft preview paths.
12. **PR #295** — `fix/route-accessibility-gaps` → `fix/runtime-content-release-gates`
    - route-level workout and progress accessibility fixes.
13. **PR #296** — `chore/release-ready-validation` → `fix/route-accessibility-gaps`
    - executable release-mode, URL, provider-review and network-audit gate.
14. **PR #297** — `fix/runtime-environment-validation` → `chore/release-ready-validation`
    - fail-closed public environment and API URL validation.
15. **PR #298** — `fix/api-protocol-compatibility` → `fix/runtime-environment-validation`
    - mobile/server protocol-version handshake for sync, account deletion and Coach requests.
16. **PR #299** — `chore/release-asset-validation` → `fix/api-protocol-compatibility`
    - release-only icon, adaptive-icon and splash asset gate.
17. **PR #300** — `feat/onboarding-considerations-step` → `chore/release-asset-validation`
    - optional movement/accessibility onboarding step and partial-save recovery message.
18. **PR #301** — `feat/understandable-data-export` → `feat/onboarding-considerations-step`
    - versioned local-device export summary, scope disclosure and record counts.

Separate sibling documentation PR:

- **PR #284** — `chore/store-release-package` → `feat/profile-considerations-body-metrics`
  - store metadata/privacy/data-safety preparation only;
  - it does **not** contain #285/#286/#287/#288/#289/#290/#291 because it branched from #283.

Superseded sibling implementation PR:

- **PR #293** — `chore/exercise-review-provenance` → `feat/coach-privacy-controls`
  - its release-gating intent is covered by #289, #290 and #294 in the active stack;
  - reconcile or close it instead of merging it independently into the active stack.

## First verification target

The most efficient code verification target is the head of **PR #301** because that branch contains
the active code stack from #282 through #301, excluding the separate sibling PRs called out above.

That target is now verified, but it does not prove the current intermediate heads can land in order:

- PR #282 fails its own gate on eight unformatted files and five Expo patch-version mismatches;
- PRs #287–#290 are each missing the latest commit from their declared base branch;
- #284 and #293 are side branches rather than ancestors of #301;
- merging #293 into #301 directly produces conflicts in seven production/test files.

From a normal authenticated checkout:

```bash
git fetch origin
git switch feat/understandable-data-export
git pull --ff-only
npm ci
npm run verify
```

`npm run verify` is expected to run the repository gates already defined in `package.json`/CI:

- Prettier format check;
- ESLint with zero warnings;
- TypeScript `tsc --noEmit`;
- Expo Doctor;
- asset-manifest validation;
- tracked-secret validation;
- release-config validation;
- production dependency audit at high severity;
- Jest unit/component tests;
- Expo web export smoke test.

Do not substitute `npm install` for `npm ci` when verifying the committed lockfile.

## If verification fails

Keep fixes on the branch that introduced the failure whenever practical.

Suggested ownership:

- catalogue/program/progression/CI failure → #282 branch;
- migration 19 / considerations / manual metrics / OptionCard checkbox semantics → #283 branch;
- backend deletion/account recovery/Profile deletion flow → #285 branch;
- migration 20 / Coach message privacy gate / provider context minimisation → #286 branch;
- shared control semantics / focus targets / contrast or component accessibility tests → #287 branch;
- contextual action labels / radio-capable chips / grouped state-action focus boundaries → #288 branch;
- exercise publication/provenance/300-record launch-gate failure → #289 branch;
- curated-program review evidence / 20-program release-gate failure → #290 branch;
- Coach proposal privacy, safety routes, mutation bounds or server-boundary regression → #291 branch.

Because later branches are stacked, a fix made on an earlier branch must then be propagated into its
descendants with a normal Git rebase/merge workflow before relying on the head branch verification.
Do not force-update branches from ChatGPT merely to make the stack appear synchronized.

## Review-specific checks after `npm run verify`

### PR #282

- 20 canonical launch slugs match `docs/05_PROGRAMS_EXERCISES_EQUIPMENT.md`;
- every executable version has unique stable IDs and valid exercise/rule references;
- 19 non-canonical programs remain publication-gated;
- draft exercise content is not marked reviewed;
- mixed strength/cardio target progression behaves by target shape;
- provider/error/analytics boundaries do not capture free-text or raw health data.

### PR #283

- migration 19 upgrades an existing database without losing earlier rows;
- considerations remain structured/non-diagnostic and local-only;
- manual weight stores canonical kg and displays lb/kg correctly;
- manual metric IDs remain user-scoped;
- export/delete includes both new tables;
- guest-to-account adoption moves ownership without adding sync mutations;
- checkbox semantics are announced correctly by screen readers.

### PR #285

- no local deletion/sign-out occurs before authenticated remote confirmation;
- non-2xx/malformed delete responses fail closed;
- app-kill after remote confirmation exposes `Finish account cleanup` on restart;
- local deletion failure does not orphan rows behind a guest identity;
- sign-out only happens after local deletion succeeds;
- recovery marker clears after successful cleanup;
- old sync/auth tokens cannot recreate a deleted account once the real server exists.

### PR #286

- provider Coach message generation is never called while opt-in is disabled;
- local deterministic Coach remains usable while disabled;
- toggling the privacy preference survives restart and refreshes on Coach-tab focus;
- provider packet does not include local user ID, cycle ID, program-version ID, private workout notes,
  raw health samples, manual body metrics, movement/accessibility preferences or analytics payloads;
- privacy preference is exportable/deletable/adopted with ownership but not synced/analysed;
- safety routing still happens before unsafe provider optimisation.

### PR #287

- Button announces disabled when no action exists and busy + disabled while loading;
- IconButton announces disabled whenever no action exists and exposes its optional hint;
- selected Chip has a visible non-colour check cue while preserving selected accessibility state;
- interactive ProgramCard and WorkoutCard expose one labelled focus target rather than a nested card;
- app Text remains opted into system font scaling;
- ProgressIndicator clamps and exposes bounded percentage values;
- functional text/status token pairs remain at or above the repository's 4.5:1 contrast gate;
- compact/standard touch targets remain at least 44/48 points respectively.

### PR #288

- Button can expose a contextual spoken label while visible copy remains concise;
- Chip can expose radio or checkbox semantics without changing existing button behaviour by default;
- ErrorState alert copy does not absorb the Try again action into the alert focus target;
- EmptyState copy does not absorb its optional action into one focus target;
- CoachProposalCard summary does not absorb Keep current / Approve actions;
- proposal spoken labels do not duplicate trailing punctuation;
- shared regression tests cover all of the above.

PR #288 does **not** claim the large workout/progress routes are fully remediated. Before #276/#279
can satisfy native accessibility gates, patch and verify the route-level audit findings already
recorded on those issues, including the disabled completed-set Edit path and parent accessibility
labels around interactive workout/progress controls.

### PR #289

- all 58 current foundational records still pass the runnable-cycle structural gate;
- all 58 remain draft and none count as publication-ready;
- a reviewed public record can publish without media;
- approved media cannot publish without source provenance and rights confirmation;
- licensed approved media requires source URI and licence metadata;
- generated approved media requires explicit human technique-review evidence;
- custom exercises stay private by default;
- the current catalogue reports 58 public / 0 publication-ready against the 300-record target;
- 300 unique reviewed records pass the catalogue gate in tests;
- duplicate stable exercise IDs fail the catalogue gate;
- the existing exercise-search test still covers 580 records.

PR #289 does **not** supply or review the missing 242+ launch records and does not approve any media.
Those remain human content-production gates for #274.

### PR #290

- the current curated catalogue reports 20 entries and 20 executable six-week versions;
- the canonical review-evidence list remains empty until real fitness-content review occurs;
- current reviewed/publication-ready counts therefore remain 0 / 0;
- a review only counts with matching stable program ID, review timestamp, and non-empty traceable reference;
- stale, unknown, duplicate, or incomplete review evidence fails the release gate;
- required goals, audience, days/week, duration, equipment, progression strategy, executable version,
  current-version alignment, unique IDs and unique slugs remain enforced;
- synthetic tests reach 20 / 20 / 20 / 20 only when all program reviews exist and all referenced
  exercise content is publication-ready.

PR #290 does **not** perform the missing fitness-content review or convert Barbell 30's in-app
startability into release-level review evidence. Those remain human content gates for #275.

### PR #291

- provider Coach plan-proposal generation is never called while provider processing is disabled;
- proposal-provider failure propagates and never invents a local plan mutation;
- configured mobile Coach transport targets the authenticated SHIFT6 API boundary;
- urgent symptoms outrank medication/nutrition routes when multiple safety signals are present;
- individualized calorie/macro/meal-plan requests route outside Coach guidance;
- sharp/worsening/radiating pain, numbness, inability to bear weight and significant swelling route
  to professional evaluation;
- unsafe provider proposals involving medication/medical-treatment/nutrition content are rejected;
- load/rep/duration/distance/RPE increases over 25%, RPE/RIR bounds, set-count bounds and schedule
  bounds are enforced before proposal storage/approval;
- the adverse-case matrix covers provider outage, adherence, plateau, readiness/discomfort, limited
  time, equipment changes, medication, nutrition, injury, urgent symptoms and unsafe mutations.

PR #291 still does **not** configure a real model/provider or production server endpoint. Verify the
provider/server/privacy/latency/monitoring evidence in `docs/20_COACH_PROVIDER_RELEASE_GATE.md`
before #278/#280 can be considered release-ready.

## Native verification after repository gates are green

`npm run verify` is not release proof. Follow `docs/13_NATIVE_RELEASE_VERIFICATION.md` on signed or
representative custom native builds.

At minimum capture evidence for:

- small/large representative iPhone and Android layouts;
- VoiceOver/TalkBack and large text;
- reduced-motion behaviour on motion-heavy surfaces;
- offline workout completion, app kill/restart and sync recovery;
- rest timers/background transitions;
- HealthKit/Health Connect partial grant, denial, revocation, disconnect and import removal;
- notification permission/delivery/background behaviour;
- account deletion recovery states;
- Coach privacy opt-in/off behaviour and absence of provider network calls while off.

## Store/privacy documentation PR #284

PR #284 is documentation-only and can be reviewed separately, but its privacy/store mappings must be
updated against the eventual integrated release candidate because #285/#286/#287/#288/#289/#290/#291
add account, Coach-privacy, accessibility, content-readiness, program-review and Coach safety
behaviour after #284 branched.

Do not enter its provisional metadata into App Store Connect or Google Play Console until:

- production providers and network behaviour are known;
- Privacy Policy / Support / external deletion URLs are live and verified;
- signed-build network audit is complete;
- store screenshots and copy match the submitted build;
- Cameron explicitly approves submission.

## Integration plan

No push or merge is approved by this document. Do not land the current intermediate heads one by one:
their declared ancestry and independent verification state no longer support that path.

Prepare one cumulative integration branch from the verified #301 head, then:

1. merge/reconcile #284's current store-release documentation;
2. preserve #301's newer runtime content gates while adding #293's reviewer identity requirement;
3. discard #293's obsolete Actions-disabled note;
4. renumber its exercise-review checklist so it does not collide with the existing document set;
5. run focused content/runtime-gate tests, then a fresh `npm ci` and full `npm run verify`;
6. push only after explicit approval and open a draft integration PR targeting `main`;
7. require GitHub CI on the exact integration head;
8. review the cumulative diff and historical PR mapping before any merge approval;
9. after an approved merge, close or supersede the old stacked PRs with links to the integrated
   commit so their review history is preserved.

The local candidate currently implements steps 1–5. Pushing it, opening a PR, changing old PR state,
or merging remains a separate approval boundary.

## Evidence to record on the PRs

For each verified code PR, post:

- exact commit SHA tested;
- Node/npm versions;
- `npm ci` result;
- `npm run verify` result;
- any dependency-audit exceptions with rationale;
- native QA build IDs/devices when applicable;
- unresolved blockers and explicit non-claims.

Only call a gate complete when that evidence exists on the same commit or a descendant commit that
contains the exact changes under review.
