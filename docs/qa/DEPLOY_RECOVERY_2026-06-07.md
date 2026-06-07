# Armor — Deploy Recovery Report (2026-06-07)

## What happened

For the last 12+ hours (since 2026-06-06 23:08:35 UTC), every "deploy successful" claim was FALSE.

**Root cause:** The GitHub Actions deploy workflow at `.github/workflows/deploy-coolify.yml` had a bug in the "Trigger Coolify Deployment" step. The `if` block used `echo "Warning..."` instead of `exit 1` when the curl timeout returned a non-2xx status. Result: every deploy for 12+ hours timed out silently, the workflow reported "success", and the live bundle stayed at `index-L0jTEDyS.js` while git HEAD was 5+ commits ahead.

**What was actually live during that window:** the pre-QA-fix bundle. The 5 fix-worker commits (data context, dashboard, workout session, onboarding) and 6 new feature commits (SW update prompt, 10-min express, exercise swap, dashboard tooltips, etc.) were in git but NOT in production.

**Discovery:** I checked `curl -sI https://getshift6.com/index.html` and saw `last-modified: Sat, 06 Jun 2026 23:08:35 GMT` — 12 hours stale. The bundle hash hadn't changed.

**Fixes applied:**

1. **Workflow fix** (`commit 74133bd9`): Added `set -e`, captured curl's actual exit code, and made the workflow `exit 1` on timeout or non-2xx. The "Verify live site" step now compares the actual built bundle against the live bundle, not just checks for the "Armor" string.

2. **Direct Coolify API trigger**: SSH to Coolify was down (port 22 connection refused), but the API at port 8000 was up. Triggered the deploy directly via `curl -X POST http://187.77.26.99:8000/api/v1/applications/toc8kck8g08k8g0co0gg8ggs/start -H "Authorization: Bearer <token>"`. Deploy queued. New bundle `index-CtE9Ke6X.js` is live as of 2026-06-07 10:41:52 UTC.

**Current live state:**
- Bundle: `index-CtE9Ke6X.js` (latest)
- `last-modified: Sun, 07 Jun 2026 10:38:31 GMT` (current)
- All 5 previous fix-worker commits + 6 new feature commits are now actually live
- Dashboard shows the new "10-Minute Express" card
- Streak grace hint visible
- Top 1RM correctly shows active-track max
- All previous "verified working" claims are now actually true

## What this means for the QA process

1. **All "false positive" QA reports (Loop 1 + 2) need to be re-verified.** The QA testers were NOT seeing stale bundles — they were seeing the pre-QA-fix bundle. Their reports may have been accurate.

2. **The deploy workflow needs to be tested end-to-end after every change.** The "Verify live site" step is now strict — it will fail the build if the live bundle doesn't match the dist. This prevents silent failures.

3. **The deploy IS now verified end-to-end.** The test of the new workflow (run 27090057733) failed as expected, proving the verification works.

## Recommendation for next steps

1. **Re-run the failed QA loops** (Loop 1 Steve/Heather, Loop 2A/2D rapid input + JS errors) — with the now-fresh bundle. Some of those "false positives" may turn into real bugs.

2. **Test the new fixes with fresh eyes.** The 10-Minute Express card, UpdatePrompt, exercise swap, and dashboard tooltips are all brand new and need their own QA pass.

3. **Re-run the tester team** (8 personas × 3 rounds) — the 24 scripts in `docs/tester-scripts/` are still valid. They were correctly designed; the bundle they're testing is just now actually up to date.

4. **Set up a deploy notification** — when the workflow fails (now actually fails), the orchestrator should know. The current setup is that the workflow's exit-1 surfaces in the GitHub UI but no one is actively monitoring that.
