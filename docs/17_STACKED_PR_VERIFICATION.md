# SHIFT6 stacked PR verification and merge sequence

Updated: 2026-09-16

This runbook exists because the connected GitHub integration can author branches and pull requests
but has not triggered inspectable Actions runs for these commits. None of the stacked PRs should be
merged based only on static review.

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
   - runtime provider message/proposal gate;
   - migration 20;
   - provider-bound context identifier minimisation.

Separate sibling documentation PR:

- **PR #284** — `chore/store-release-package` → `feat/profile-considerations-body-metrics`
  - store metadata/privacy/data-safety preparation only;
  - it does **not** contain #285/#286 because it branched from #283.

## First verification target

The most efficient code verification target is the head of **PR #286** because that branch contains
all code changes from #282, #283, #285 and #286.

From a normal authenticated checkout:

```bash
git fetch origin
git switch feat/coach-privacy-controls
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
- migration 20 / Coach privacy gate / provider context minimisation → #286 branch.

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

- provider Coach message/proposal functions are never called while opt-in is disabled;
- local deterministic Coach remains usable while disabled;
- toggling the privacy preference survives restart and refreshes on Coach-tab focus;
- provider packet does not include local user ID, cycle ID, program-version ID, private workout notes,
  raw health samples, manual body metrics, movement/accessibility preferences or analytics payloads;
- privacy preference is exportable/deletable/adopted with ownership but not synced/analysed;
- safety routing still happens before unsafe provider optimisation.

## Native verification after repository gates are green

`npm run verify` is not release proof. Follow `docs/13_NATIVE_RELEASE_VERIFICATION.md` on signed or
representative custom native builds.

At minimum capture evidence for:

- small/large representative iPhone and Android layouts;
- VoiceOver/TalkBack and large text;
- offline workout completion, app kill/restart and sync recovery;
- rest timers/background transitions;
- HealthKit/Health Connect partial grant, denial, revocation, disconnect and import removal;
- notification permission/delivery/background behaviour;
- account deletion recovery states;
- Coach privacy opt-in/off behaviour and absence of provider network calls while off.

## Store/privacy documentation PR #284

PR #284 is documentation-only and can be reviewed separately, but its privacy/store mappings must be
updated against the eventual integrated release candidate because #285/#286 add account-deletion and
Coach privacy behaviour after #284 branched.

Do not enter its provisional metadata into App Store Connect or Google Play Console until:

- production providers and network behaviour are known;
- Privacy Policy / Support / external deletion URLs are live and verified;
- signed-build network audit is complete;
- store screenshots and copy match the submitted build;
- Cameron explicitly approves submission.

## Merge sequence

No merge is approved by this document. When Cameron explicitly approves merging after verification,
the clean conceptual order is:

1. #282 into `main`;
2. retarget/reconcile #283 against updated `main`, then merge;
3. retarget/reconcile #285 against updated `main`, then merge;
4. retarget/reconcile #286 against updated `main`, then merge;
5. reconcile #284 with the integrated code state, update its privacy/store mapping for #285/#286,
   retarget to `main`, verify documentation accuracy, then merge if approved.

Do not merge a descendant PR first simply because GitHub reports it as mergeable; the stacked base
branches are part of the intended review history.

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
