# Code Review — Shift6 Fitness App

**Date:** 2026-04-12
**Reviewer:** Claude (automated)
**Scope:** Full codebase review — architecture, security, bugs, code quality
**Baseline:** Previous review dated 2026-04-09

---

## Executive Summary

Since the last review, the major refactoring of App.jsx has been completed successfully — it went from a ~2000-line God Component to a well-structured 642-line orchestrator with logic extracted into focused custom hooks and contexts. The dual-storage bug is also fixed: contexts now use `usePersistedState` and are the single source of truth for persistence.

However, **critical security issues remain** in the backend, several **new bugs** were found in the hooks and utility modules (including data loss risks in export/import and factory reset), and the **progression algorithm has multiple division-by-zero edge cases**.

**Findings:** 7 Critical | 16 Major | 18 Minor

### Resolved from Previous Review

| # | Issue | Status |
|---|-------|--------|
| 6 | Dual storage system (App.jsx + contexts both writing) | **Fixed** — contexts now use `usePersistedState` |
| 7 | App.jsx God Component (~2000 lines) | **Fixed** — now 642 lines with extracted hooks |
| 8 | SettingsStateContext/GymStateContext don't persist | **Fixed** — both use `usePersistedState` |

---

## Critical Issues

### 1. Unauthenticated Stripe Endpoints (server/index.js:105-136)

The `/api/subscription/:customerId` and `/api/create-portal-session` endpoints accept any customer ID with **zero authentication**. Any client can query any Stripe customer's subscription status or open their billing portal.

**Fix:** Add session/JWT authentication. Verify the authenticated user owns the customer ID.

### 2. Factory Reset Wipes All Origin Data (useDataManagement.js:83)

`localStorage.clear()` removes **every** key in localStorage, not just `shift6_`-prefixed keys. If any other app or feature shares the same origin, its data is destroyed.

**Fix:** Replace with targeted deletion:
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith(STORAGE_PREFIX))
  .forEach(k => localStorage.removeItem(k));
```

### 3. Incomplete Export/Import Silently Loses Most User Data (useDataManagement.js:12-28, 56-72)

The export function only serializes `completedDays` and `introDismissed`. It omits `sessionHistory`, `sprints`, `homeGoals`, `gymProgram`, `gymHistory`, `gymWeights`, `gymReps`, `gymStreak`, `customExercises`, `exerciseDifficulty`, `trainingPreferences`, `customPlans`, and all gym state. A user who exports, factory resets, and imports loses the majority of their data.

**Fix:** Export all `shift6_`-prefixed keys from localStorage, or use the context state values directly.

### 4. No Customer Association in Checkout (server/index.js:76-95)

Checkout session creation never passes a `customer` or `customer_email` parameter. Stripe creates a new Customer object for every checkout. The subscription/portal endpoints require a `customerId`, but there is no mechanism to link a user to their Stripe customer ID. The entire purchase-to-verification flow is broken.

**Fix:** Pass `customer_email` in checkout creation and persist the mapping.

### 5. Open CORS Policy (server/index.js:29)

```javascript
app.use(cors()); // Allows ALL origins
```

Any website can make cross-origin requests to the Stripe endpoints.

**Fix:** Restrict to known origins:
```javascript
app.use(cors({ origin: ['https://getshift6.com'], credentials: true }));
```

### 6. Division by Zero in Progression Algorithms (progression.js, gymProgression.js, homeGoals.js)

Multiple division-by-zero paths exist:

- `progression.js:104` — `currentMax / maxPotential` when `exerciseData.finalGoal` is 0
- `gymProgression.js:319` — `(actualVolume - targetVolume) / targetVolume` when target is 0
- `progression.js:595` — `improvement / sprint.startingMax` when `startingMax` is 0
- `homeGoals.js:333` — `repsDiff / targetReps` when `targetReps` is 0
- `progressionCoach.js:368` — `(realisticFinalGoal - startReps) / (finalGoal - startReps)` when equal

**Fix:** Add zero-guards before every division. Example:
```javascript
const progressPercent = maxPotential > 0 ? currentMax / maxPotential : 0;
```

### 7. Stale Closure Bugs in Sprint Progression (useHomeWorkout.js:261-299)

`completeWorkout` reads `sprints` from its closure, then passes that stale snapshot to `analyzeWorkoutPerformance`, `recalculateSprint`, and `detectPlateau`. The subsequent `setSprints(prev => ...)` calls use the callback form correctly, but the upstream analysis operates on stale data.

**Fix:** Move sprint reads inside a `setSprints` callback, or use a ref to track current sprints.

---

## Major Issues

### 8. Webhook Handlers Do Nothing (server/index.js:48-56)

`checkout.session.completed` and `customer.subscription.*` handlers only `console.log`. No database persistence exists. The subscription system is non-functional from the app's perspective.

### 9. GymWorkoutSession Rest Timer Race Condition (GymWorkoutSession.jsx:205-227)

The `useEffect` for the rest timer has `restTimeLeft` in its dependency array, causing the interval to be torn down and recreated every second. Should use `useRef` for the interval and only depend on `isResting`.

### 10. `logSet` Stale State on Rapid Taps (GymWorkoutSession.jsx:247-379)

`logSet` reads `completedSets` from its closure while also writing to it via `setCompletedSets(prev => ...)`. Two rapid taps can cause the second invocation to see stale data, duplicating or skipping sets.

### 11. `handleCompleteGymAssessment` Uses Direct-Value Setter (useGymWorkout.js:139-145)

`setGymWeights(newWeights)` spreads the closure's `gymWeights` and writes the whole object back, clobbering concurrent updates from WorkoutSession's callback-style setters. Same issue in `handleCompleteGymWorkout` (line 60-69).

### 12. No Input Validation on Checkout (server/index.js:69)

`seats` parameter is unvalidated — could be 0, negative, a float, or a string.

### 13. Stripe Error Messages Leaked to Clients (server/index.js:41, 100, 118, 134)

All catch blocks return raw `error.message` to the client, potentially exposing internal Stripe configuration details.

### 14. Uncleaned setTimeout Calls

Multiple components use `setTimeout` without cleanup:
- `useHomeWorkout.js:317` — `setIsProcessing(false)` after 1s
- `GymWorkoutSession.jsx:314` — PR celebration auto-hide (3s)
- `useAchievements.js:61` — badge dismiss delay (100ms)

**Fix:** Use `useRef` to track timeout IDs and clear them in cleanup.

### 15. Timer Effects Recreate Intervals Every Tick (useHomeWorkout.js:57-67)

Both timer `useEffect`s include `timeLeft`/`exerciseTimeLeft` in their dependency arrays, causing interval teardown and recreation every second. Use `useRef` for interval IDs and depend only on `isTimerRunning`.

### 16. Price IDs Defined But Never Used (server/index.js:14-27)

The `PRICES` object defines `priceId` from env vars, but checkout uses `price_data` instead (line 79). This means Stripe price changes in the dashboard have no effect, and each checkout creates a new ad-hoc price object.

### 17. `generateWeeklyTargets` Can Produce Decreasing Targets (progression.js:134-155)

When `target < start` (user regresses), `totalGain` becomes negative. The `Math.min(negative, start * 0.60)` picks the negative value, producing weekly targets that decrease.

### 18. No Rate Limiting on Stripe Endpoints (server/index.js)

Unlimited checkout sessions, customer ID enumeration, and portal sessions can be created.

### 19. Dashboard `colorClasses` Definition Conflicts with WorkoutSession (Dashboard.jsx:85-95 vs WorkoutSession.jsx:5-15)

Dashboard's `colorClasses` lacks the `hex` property that WorkoutSession's version has. Components receiving the Dashboard's version that rely on `colorClasses.hex` will break.

### 20. `ResumeWorkoutBanner` References `colorClasses` Before Definition (Dashboard.jsx:42-82)

The `ResumeWorkoutBanner` component uses `colorClasses` on line 46, but `colorClasses` is defined later (line 85). With `const` hoisting rules, this will throw a `ReferenceError` at runtime when the banner renders.

### 21. Volume Display Always Shows "kg" Regardless of User Preference (GymDashboard.jsx:674)

`Math.round(totalVolume).toLocaleString()} kg` is hardcoded. Users tracking in lbs see "kg".

### 22. Progress Bar Can Exceed 100% (GymDashboard.jsx:477-478)

`(gymProgram.currentDay / (currentProgram.split.length * 4)) * 100` has no upper bound clamp.

### 23. No Environment Variable Validation at Startup (server/index.js:11)

If `STRIPE_SECRET_KEY` is undefined, the server starts but crashes on the first Stripe call.

### 24. `localStorage.clear()` in Factory Reset Also Wipes Non-Shift6 Data

Same as Critical #2 but noting: this is the only place `localStorage.clear()` is called, and it's destructive beyond the app's scope.

---

## Minor Issues

### 25. `calculateStats` Undercounts Personal Records (gamification.js:151-156)

The first PR for each exercise is never counted because the check `exercisePRs[exerciseKey] !== undefined` is false on first encounter. Users need at least 2 workouts for the same exercise to earn the "Record Breaker" badge.

### 26. `generateSprint` IDs Can Collide (progression.js:303)

Uses `Date.now()` which can produce identical IDs if called twice in rapid succession for the same exercise.

### 27. CSV Export Misses Custom Exercise Names (useDataManagement.js:38)

Uses `EXERCISE_PLANS[s.exerciseKey]?.name` which only covers built-in exercises. Custom exercises fall through to the raw key.

### 28. CSV Injection Vulnerability (useDataManagement.js:36-43)

Notes are quoted but not sanitized. If a note starts with `=`, `+`, `-`, or `@`, spreadsheet apps may interpret it as a formula.

### 29. `URL.revokeObjectURL` Called Synchronously After Download (useDataManagement.js:27, 53)

May fail on slow connections. Should delay with `setTimeout`.

### 30. No Import Data Validation (useDataManagement.js:58-69)

Parsed JSON is applied directly to state without type/shape validation. Corrupted data can set `completedDays` to a string or number.

### 31. `useAchievements` Missing `seenBadgeIds` in Effect Deps (useAchievements.js:44)

The `eslint-disable-line` suppresses the lint warning but introduces a correctness gap — already-seen badges could be re-notified.

### 32. `smoothPerformanceRatio` Weight Array Mismatch (progression.js:423-443)

Weights array `[0.20, 0.30, 0.50]` has 3 elements but performances can have length 2. The 0.50 weight is never applied, giving the most recent performance only 30% weight instead of 50%.

### 33. Hardcoded Duration Estimate (GymDashboard.jsx:579)

`~45 min` is hardcoded instead of computed from the program's `estimatedDuration`.

### 34. Recent Workouts Use Array Index as Key (GymDashboard.jsx:656)

Using `idx` as key for a mutable list can cause incorrect reconciliation.

### 35. `EXERCISE_INTENSITY` Classification is Incomplete (adaptiveRest.js:17-23)

Only 7 exercises categorized. Pullups, chinups, and all gym exercises default to 'low' intensity, giving only 45s of base rest for compound movements.

### 36. `distributeReps` Can Produce Uneven Distribution (progression.js:181)

When `minRep` exceeds available reps, the algorithm produces uneven distributions with some sets at 1 rep.

### 37. No Security Headers (server/index.js, nginx.conf)

Missing `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, and `Permissions-Policy` headers.

### 38. No HTTPS in nginx.conf

Only listens on port 80. Production should enforce HTTPS.

### 39. No Graceful Shutdown (server/index.js)

No `SIGTERM`/`SIGINT` handlers. In-flight requests are terminated abruptly during deployment.

### 40. `gymProgression.js:calculateProgress` Can Return Values > 100 or < 0

When regression occurs, `weightProgress` becomes negative. The `Math.min(100, ...)` clamp only limits the upper bound.

### 41. Missing `stripe-signature` Early Return (server/index.js:34)

If the header is missing, `constructEvent` throws, which is caught, but the error message is leaked to the response.

### 42. `switch` Cases Without Block Scoping (server/index.js:46-56)

`const` declarations inside `case` blocks without braces are a linter warning and can cause confusion.

---

## Architecture Recommendations

1. **Fix the export/import system** — This is the most impactful data-loss risk. Export all `shift6_`-prefixed keys, and validate imports before applying.

2. **Add authentication to Stripe endpoints** — Even a simple JWT flow prevents customer ID enumeration.

3. **Guard all divisions in progression algorithms** — Add zero-checks before every division. These are latent crash bugs.

4. **Fix timer patterns** — Move interval IDs to `useRef` and remove tick values from effect dependencies. This eliminates the interval-recreation-per-second pattern.

5. **Use callback-form state setters everywhere** — Replace `setGymWeights(newWeights)` with `setGymWeights(prev => ({ ...prev, ...updates }))` to prevent stale-closure data loss.

6. **Add input validation on the server** — Validate `seats`, `customerId`, and `tier` parameters. Add rate limiting.

7. **Lock down CORS** — Restrict to `getshift6.com` origin.

8. **Use pre-created Stripe Price IDs** — Stop creating ad-hoc prices on every checkout.

---

## What's Done Well

- **App.jsx refactoring** — Successfully extracted from ~2000 to 642 lines with focused hooks
- **Context-based persistence** — `usePersistedState` eliminates the dual-write problem
- **Lazy loading** — Good use of `React.lazy()` for heavy/infrequent components
- **Safe localStorage helpers** — `safeLoadJSON`/`safeSetItem` with try/catch
- **No XSS vectors** — No `dangerouslySetInnerHTML` or `eval()` usage found
- **Test coverage** — 15+ test files covering utility modules
- **PWA support** — Offline-first with service worker caching