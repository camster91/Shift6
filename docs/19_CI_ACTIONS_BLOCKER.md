# SHIFT6 — CI / GitHub Actions Verification Blocker

## Current evidence

The repository contains `.github/workflows/ci.yml` with both `push` and `pull_request` triggers. The rebuild-era stacked branches also include `workflow_dispatch` and concurrency control.

For the current stacked head used by PR #286 (`e198a1882fb0360e6155500dddb50656e866161e`), GitHub reports:

- no pull-request workflow run;
- no push workflow run;
- no commit statuses/checks.

Historical workflow runs exist for the repository, so this is not evidence that the workflow file has never existed. It indicates that current rebuild-era events are not creating runs.

## What is already correct in-repo

The CI workflow is configured to run:

1. `npm ci`;
2. formatting checks;
3. lint;
4. TypeScript checking;
5. Expo Doctor;
6. asset validation;
7. tracked-secret scanning;
8. release-config validation;
9. high-severity production dependency audit;
10. unit/component tests;
11. web export smoke testing.

Changing valid workflow YAML without evidence of a YAML defect would add risk and does not address the observed absence of workflow runs.

## External checks required

Before treating CI as operational, verify the repository/account GitHub Actions settings and policy permit workflow execution for this private repository and for the current branches. Confirm that Actions are enabled and that no organization/repository policy, billing/usage restriction, disabled workflow state, or permissions restriction prevents event-triggered runs.

After the external setting is corrected, trigger a fresh commit/PR event or manually dispatch the existing workflow and capture the resulting run URL, head SHA, job result, and failed-step logs if applicable.

## Release rule

No stacked PR should be represented as CI-verified until a workflow run exists for the exact code being reviewed (or an equivalent rebased head) and the required quality job succeeds.

Manual/local `npm run verify` evidence can reduce uncertainty but does not replace restoration of the repository CI release gate.
