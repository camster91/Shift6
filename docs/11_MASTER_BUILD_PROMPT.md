# SHIFT6 — Master Build Prompt for Coding Agents

You are extending the existing Expo SDK 57 / React Native / TypeScript SHIFT6 app. Read [the canonical goal-first contract](25_GOAL_FIRST_RELEASE_CONTRACT.md), [product epic #304](https://github.com/camster91/Shift6/issues/304), and the current code before implementation. **Six weeks. One measurable goal.** Preserve SQLite, immutable/copy-on-write versions, offline workout recovery, deterministic progression, ownership, privacy, accessibility and relevant #270–#281 engineering work. Do not rebuild or revive the archived app.

One primary Shift ties a protocol-defined baseline and goal to the current cycle, today's session, comparable observations and Week 6 review. Six weeks is a review structure, not a performance guarantee. Completion, adherence, calendar week, latest result, personal best and estimate are different. A workout never moves a performance marker without a comparable recorded measurement. Protocols include type, variant/assistance, equipment, units, relevant rep count/distance, version, source, date and improvement direction. No misleading percentage from zero.

The schedule follows the calendar; progression follows actual performance. No punishment, unsafe catch-up, silent target rise or stale week after interruption. Users confirm meaningful pause/repeat/re-entry changes. They may maintain, repeat, progress, choose another goal or take a planned break. A final test is optional and a completed block is not automatically an achieved goal. Ordinary progression remains deterministic; Coach is optional and must never block training or prescribe diagnosis, rehabilitation, medication/insulin changes or training through pain.

## Order of work

1. #305: reconcile repository docs, versioned release manifest and publication gates. This issue is documentation and release-contract work, not goal-first UI implementation.
2. #306: Shift lifecycle and typed measurements on existing TrainingCycle/ProgramVersion; preserve old data and immutable history.
3. #309: define approximately three representative, content-reviewed rep, timed and Barbell/strength pilot templates with exact versioned IDs.
4. #315: confirm calendar, pause, repeat, re-entry and review-date rules with #306/#309.
5. #307: choose one goal, main-plan/add-on context and honest baseline fallback.
6. #308: one active Shift and clear Today action; simplify navigation.
7. #310: reliable offline focus workout, micro-objectives, partial and stop paths.
8. #311: deterministic adaptive progression from actual performance and one-tap difficulty.
9. #312: honest milestones, optional final test, review and Shift history.
10. #313: contextual, disableable Coach explanation.
11. #314: healthy motion/engagement and privacy-safe event dictionary.
12. #316: simulation, exact-build QA, approved human pilot and decision.

#319 develops the visual world beside engineering. It does not delay the core slice or permit unapproved production art. Build Visual DNA and representative Figma screens; version prompts in [asset plan](07_ASSET_AND_ICON_PROMPTS.md). Keep rich media optional for critical logging, use native motion for frequent controls, honour reduced motion and test low/mid-range Android.

## Publication and release rules

Use `content/release-manifest.json` as the explicit public allowlist. Every enabled Shift and referenced exercise needs content, safety, provenance and implementation evidence; search, recommendation, deep links and offline cache cannot bypass it. Draft content may remain private or preview-only in development. Do not replace human review with synthetic timestamps. The release validator must fail closed until approved content is enabled. Twenty programs and 300+ exercises are future breadth targets, not pilot blockers. Core training is free and works without a paid provider call.

For each increment, inspect the actual source, implement a vertical slice, run relevant tests and `npm run verify`, then record what was and was not verified. Device, Figma, exercise-content, pilot and store evidence require their own real checks. Do not mark later issues complete based on this prompt. Do not merge, distribute builds or submit stores without Cameron's approval.
