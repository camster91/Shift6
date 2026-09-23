# SHIFT6 — QA, Release, Analytics & Rollback

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

Focused QA adds typed comparable baseline/result checks, zero baseline, missed sessions and re-entry, no-test review, early target and all end choices. Separate plan adherence from physical progress. #314/#316 define denominators before pilot; no raw health notes in events. A passing export is not native, content or store verification.


## Device QA matrix

At minimum for meaningful releases:
- current small-screen iPhone;
- current large-screen iPhone;
- one older supported iPhone;
- representative smaller Android;
- representative large Android;
- low/mid-tier Android performance device;
- tablet checks for layouts touched by responsive work.

## Core end-to-end journeys

1. Fresh install → guest → onboarding → select program → complete workout offline → reconnect → sync.
2. Create account first → start program → edit one workout → complete → progress visible.
3. Build custom program from blank → add custom exercise → start cycle.
4. Duplicate curated program → change equipment → substitutions update.
5. Kill app mid-workout → reopen → session restored.
6. Two-device edit conflict → safe conflict resolution.
7. Coach proposal → partial accept → plan diff applied correctly.
8. Health permission deny → app still fully usable.
9. Health connect → import → disconnect → UI reflects state.
10. End six-week cycle → review → start next cycle.
11. Export data → verify archive/content.
12. Delete account → verify auth/data lifecycle.

## Workout reliability acceptance criteria

- set completion writes locally before success UI;
- app crash cannot erase previously completed sets;
- timers continue accurately through background within platform limits;
- offline mode clearly indicated but not blocking;
- duplicate sync does not duplicate sets;
- program template updates do not rewrite history;
- user can correct accidental log entries.

## Accessibility QA

Manual:
- VoiceOver full workout;
- TalkBack full workout;
- largest text size;
- reduced motion;
- high contrast;
- one-handed target checks;
- landscape where supported.

Automated checks supplement, not replace, manual review.

## Analytics event standards

Every event has:
- semantic name;
- documented properties;
- privacy classification;
- retention purpose;
- owner.

Never include:
- free-text notes;
- coach conversation text;
- health sample payloads;
- email in event properties;
- precise location.

Key funnel:
install → onboarding_started → onboarding_completed → program_started → workout_started → workout_completed → week_2_reached → cycle_completed → next_cycle_started.

## AI observability

Log:
- task type;
- provider/model identifier;
- latency;
- token/cost estimate;
- schema validation result;
- safety route;
- proposal accepted/rejected.

Do not log unnecessary raw personal context.

## Release strategy

Environments:
- development;
- staging;
- production.

Production process:
1. release candidate branch/tag;
2. automated CI;
3. migration dry-run;
4. staging smoke tests;
5. signed mobile build;
6. internal/TestFlight/closed testing;
7. approval;
8. staged production rollout where stores support it;
9. monitor crash/sync/auth metrics;
10. expand rollout.

## Rollback

Mobile rollback is constrained by store review/distribution, so use:
- backward-compatible backend migrations;
- feature flags;
- remote kill switches for risky features;
- server support for at least prior app version during rollout;
- reversible content/config changes;
- migration rollback scripts when safe.

Never require an irreversible database migration in the same release as an unproven client feature unless there is a tested compatibility path.

## App Store / Play Store checklist

- app name/branding;
- icon/screenshots;
- privacy policy;
- support URL;
- age rating/content declarations;
- health/fitness data disclosures;
- data safety/privacy nutrition labels;
- account deletion flow;
- permission strings;
- AI disclosure where required;
- test credentials if review requires;
- accessibility smoke test;
- crash-free release candidate;
- no placeholder content.

## Free launch policy

Core training capabilities ship without paywall at launch. If monetization is introduced later, it must not retroactively trap a user's existing workout history or basic ability to access/export their data.
