# Code Review — Shift6 Fitness App

**Date:** 2026-04-09
**Reviewer:** Claude (automated)
**Scope:** Full codebase review — architecture, security, bugs, code quality

---

## Executive Summary

Shift6 is a well-structured React + Capacitor fitness app with ~18K lines of source code. The app uses a context-based state management pattern, lazy loading for code splitting, and a clean component hierarchy. However, there are **critical security issues** in the backend and Android build config, **architectural concerns** in the monolithic App.jsx, and several **bug-level issues** in workout components.

**Findings:** 5 Critical | 8 Major | 10 Minor

---

## Critical Issues

### 1. Unauthenticated Stripe Endpoints (server/index.js:105-136)

The `/api/subscription/:customerId` and `/api/create-portal-session` endpoints accept any customer ID with **zero authentication**. Any client can:
- Query any Stripe customer's subscription status
- Access any customer's billing portal (modify payment methods, cancel subscriptions)

```javascript
// Anyone can hit this with any customerId
app.get('/api/subscription/:customerId', async (req, res) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: req.params.customerId, // No ownership verification
  });
});
```

**Fix:** Implement session/JWT authentication. Verify the authenticated user owns the customer ID before querying Stripe.

### 2. Hardcoded Credentials in Version Control

**android/keystore.properties** (tracked in git):
```
storePassword=[REDACTED]
keyPassword=[REDACTED]
```

**android/app/build.gradle:23-25:**
```
storePassword '[REDACTED]'
keyPassword '[REDACTED]'
```

Two different passwords exist in two different files, both committed. The keystore.properties file is not in `.gitignore`.

**Fix:** Add `keystore.properties` to `.gitignore`, remove from git history, rotate credentials, and load from environment variables.

### 3. No Payment Persistence (server/index.js:48-56)

Webhook handlers for `checkout.session.completed` and `customer.subscription.*` events log to console but **never persist** to any database. The app cannot verify who has paid.

```javascript
case 'checkout.session.completed':
  console.log('Payment successful:', session.id);
  // TODO: Update user subscription in database
  // NOTE: No database — subscription status is not persisted.
  break;
```

**Fix:** Implement a database (even SQLite) to store subscription events, or use Stripe's customer portal as the source of truth with proper auth.

### 4. Open CORS Policy (server/index.js:29)

```javascript
app.use(cors()); // Allows ALL origins
```

Any website can make authenticated requests to the Stripe endpoints.

**Fix:** Restrict to specific origins:
```javascript
app.use(cors({ origin: ['https://getshift6.com'], credentials: true }));
```

### 5. Hardcoded Infrastructure in CI/CD (.github/workflows/deploy.yml:22)

```yaml
curl -X GET "http://187.77.26.99:8000/api/v1/deploy?uuid=toc8kck8g08k8g0co0gg8ggs&force=true"
```

Server IP and deployment UUID are hardcoded in a public workflow file over HTTP (not HTTPS).

**Fix:** Use GitHub Secrets: `${{ secrets.COOLIFY_ENDPOINT }}`.

---

## Major Issues

### 6. Dual Storage System Creates Data Inconsistency (App.jsx + contexts)

The app has **two competing storage mechanisms**:

1. **Context providers** (WorkoutStateContext.jsx) save to localStorage on every state change via `storage.save()`
2. **App.jsx** also saves the same data via `useEffect` + `safeSetItem()` on every state change

For example, `sessionHistory` is saved in both:
- `WorkoutStateContext.jsx:12`: `storage.save('history', newValue)` → key: `shift6_history`
- `App.jsx:254`: `safeSetItem('shift6_history', sessionHistory)` → key: `shift6_history`

This means every state change triggers **two identical writes** to localStorage. Worse, if the timing differs, one could overwrite the other with stale data.

**Fix:** Remove the duplicate `useEffect` persistence from App.jsx and let the context providers be the single source of truth for storage.

### 7. App.jsx is a God Component (~2000 lines)

App.jsx contains:
- 30+ `useState` hooks
- 25+ `useEffect` hooks (mostly localStorage sync)
- 15+ `useCallback` handlers
- All workout logic, gym logic, sprint management, data export, and rendering

This makes it extremely difficult to maintain, test, or reason about re-renders.

**Fix:** Extract into focused custom hooks:
- `useWorkoutSession()` — session lifecycle, queue, completion
- `useGymSession()` — gym workout lifecycle
- `useSprintManagement()` — sprint CRUD
- `useDataExport()` — export/import/reset
- `usePersistence()` — all the localStorage sync effects

### 8. SettingsStateContext and GymStateContext Don't Persist (contexts)

Both `SettingsStateContext.jsx:13` and `GymStateContext.jsx:12` have a comment `// ... add setters with storage saving logic` but **never implemented it**. The raw `useState` setters are exposed directly, meaning state changes are only persisted because App.jsx has duplicate `useEffect` hooks doing it.

If the App.jsx effects are ever removed (per issue #6), settings and gym state would **stop persisting**.

**Fix:** Implement proper setter wrappers in these contexts (like WorkoutStateContext already does).

### 9. Uncleaned setTimeout Calls in Components

Multiple components use `setTimeout` inside `useCallback` without cleanup:

- `GymWorkoutSession.jsx:314` — PR celebration auto-hide (3s)
- `GymWorkoutSession.jsx:378` — isLogging debounce (500ms)
- `GymWorkoutSession.jsx:483` — exit delay (100ms)
- `WorkoutSession.jsx:287` — confetti delay (500ms)
- `WorkoutSession.jsx:320` — copy reset (2s)

These can cause state updates on unmounted components.

**Fix:** Use `useRef` to track timeout IDs and clear them in cleanup, or move time-based state transitions into `useEffect` blocks with proper cleanup.

### 10. Session History Silently Truncated (App.jsx:1010)

```javascript
setSessionHistory(prev => [newHistoryItem, ...prev].slice(0, 50));
```

History is silently capped at 50 entries with no user notification. Users who work out frequently will lose older history. The CSV export function also only exports whatever is in memory.

**Fix:** Either increase the limit significantly (localStorage can hold ~5MB), inform users about the cap, or implement pagination.

### 11. Docker Port Mismatch (docker-compose.yml:11)

```yaml
ports:
  - "3000:80"  # Maps host:3000 → container:80
```

But the server listens on port 3000, not 80. The container will be unreachable.

**Fix:** Change to `"3000:3000"`.

### 12. Sensitive Stripe Errors Exposed (server/index.js:98-101)

```javascript
catch (error) {
  res.status(500).json({ error: error.message }); // Raw Stripe error
}
```

Stripe error messages can leak internal configuration details to clients.

**Fix:** Log detailed errors server-side; return generic messages to clients.

### 13. Missing Input Validation on Checkout (server/index.js:69)

```javascript
const { tier, seats = 1 } = req.body;
// No validation: seats could be -1, 0, 999999, 1.5, "abc"
```

**Fix:** Validate `seats` is a positive integer within reasonable bounds.

---

## Minor Issues

### 14. Gym Streak Logic Bug (App.jsx:1369-1389)

The streak calculation uses `gymHistory[0]` (the most recent entry), but `gymHistory` is prepended with the new workout **on the same line** above. This means `gymHistory[0]` is the **just-completed** workout, not the previous one. The streak logic always sees "already worked out today" and never increments.

```javascript
setGymHistory(prev => [workoutData, ...prev].slice(0, 100)); // line 1352
// ... later uses gymHistory[0] which is stale (from the previous render)
```

Actually, since `gymHistory` is from the closure, it references the old value — so this works by accident. But it's fragile and confusing.

### 15. `shouldShowModeSelector` is Always False (App.jsx:1558)

```javascript
const shouldShowModeSelector = false;
```

The `ModeSelector` component and related code (todayGymWorkout, todayHomeWorkout) is dead code that can never execute.

### 16. Missing Required Environment Variable Validation (server/index.js:11)

```javascript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // undefined if not set
```

Server starts without error but crashes on first Stripe call.

**Fix:** Validate required env vars at startup.

### 17. Unsafe localStorage Parse (GymWorkoutSession.jsx:292)

```javascript
const gymPRs = JSON.parse(localStorage.getItem('shift6_gym_prs') || '{}')
```

No try/catch — corrupted data will crash the component.

### 18. Nullish Coalescing vs OR for Defaults (GymWorkoutSession.jsx:171)

```javascript
const lastWeightKg = gymWeights[currentExerciseId] || currentExercise.defaultWeight || 20
```

If `defaultWeight` is `0` (bodyweight exercises), this skips it and defaults to 20kg.

**Fix:** Use `??` instead of `||`.

### 19. Missing Security Headers (nginx.conf)

No `Content-Security-Policy`, `Strict-Transport-Security`, or `Permissions-Policy` headers configured.

### 20. Inconsistent Comment (App.jsx:1481)

```javascript
// eslint-disable-next-line no-unused-vars
const handleUpdateGymGoal = useCallback(...)
```

Function is defined but never used — should be removed or connected.

### 21. Express Middleware Ordering (server/index.js:33,65)

`express.json()` is applied **after** the webhook route. This is actually correct (webhooks need raw body), but the ordering is non-obvious and lacks a comment explaining why.

### 22. No HTTPS in nginx.conf

Only listens on port 80. Production should enforce HTTPS.

### 23. Two Different Keystore Passwords

`keystore.properties` has `[REDACTED]` while `build.gradle` has `[REDACTED]` — unclear which is actually used. This suggests the build.gradle values may be stale/unused.

---

## Architecture Recommendations

1. **Extract App.jsx logic into custom hooks** — The 2000-line God Component is the biggest maintainability risk.
2. **Unify storage layer** — Pick one: either context providers handle persistence, or App.jsx does. Not both.
3. **Complete the context implementations** — SettingsStateContext and GymStateContext have placeholder comments for storage that were never implemented.
4. **Add authentication** — The Stripe endpoints are the most urgent. Even a simple JWT flow would prevent the customer ID enumeration attack.
5. **Add error monitoring** — ErrorBoundary only logs to console. Consider Sentry or similar for production error tracking.
6. **Consider useReducer** — Components like GymWorkoutSession have 15+ useState calls managing related state. A reducer would make state transitions more predictable.

---

## What's Done Well

- **Lazy loading** — Good use of `React.lazy()` for heavy/infrequent components
- **Memoization** — Extensive `useCallback`/`useMemo` usage for render optimization
- **Safe localStorage helpers** — `safeLoadJSON`/`safeSetItem` with try/catch
- **Progressive enhancement** — PWA with offline support, Capacitor for native
- **Session recovery** — Pending session system preserves workout state across refreshes
- **No XSS vectors** — No `dangerouslySetInnerHTML` or `eval()` usage found
- **Test coverage** — 15+ test files covering utilities and business logic
