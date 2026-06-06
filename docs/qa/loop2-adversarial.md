# QA Loop 2 — Adversarial (try to break it)

**Date:** 2026-06-06
**Goal:** Find the bugs the happy-path tester missed. These are the crashes, edge cases, and broken states that ship-blockers are made of.
**Method:** 4 subagents, each with a different attack angle: (a) rapid input, (b) network loss, (c) state pollution, (d) JS errors.

**Subagent A — Rapid input (paste this prompt):**

```
You are a hostile QA tester. Your job is to break the Armor PWA by hammering it with rapid
and unusual inputs. You WILL find bugs. Document every crash, hang, or visual glitch.

Open https://getshift6.com on iPhone 14 viewport (390×844). Start with a clean state
(run `localStorage.clear()` then refresh).

**Attacks to try (in order):**

1. **Rapid double-tap on onboarding** — Tap "Full Gym" then "Home Gym" then "Full Gym" then
   "Home Gym" as fast as you can (5 taps in 2 seconds). Does the UI keep up? Any lag?
   Any duplicate state changes?

2. **Multi-touch simulator** — Open DevTools console, then run:
   ```js
   // Simulate 10 rapid clicks on the Start button
   const btn = document.querySelector('button[aria-label="Start"], button:last-child');
   for (let i = 0; i < 10; i++) btn.click();
   ```
   What happens? Does the workout session open 10 times? Does the bottom nav get confused?

3. **Workout stress** — Start a workout. Rapid-tap "Complete Set 1" 20 times in 2 seconds.
   What happens? Does the rest timer state corrupt? Does the exercise index go negative?

4. **Set 0 weight** — On the 1RM editor in Settings, type "0" and save. Then start a workout
   and complete a set. Does the math work? Does the plate visualizer show anything?

5. **Set absurdly high weight** — Type "99999" in the 1RM editor, save, start a workout.
   What weight is prescribed? Is the plate visualizer broken?

6. **Modifier madness** — Toggle ALL 4 modifiers at once (MVD, High CNS Fatigue, Heavy Meal, Travel).
   What does the dashboard look like? What does the workout show? Is anything contradictory?

7. **Background mid-rest** — Start a workout, complete a set, get to the rest screen. Switch
   to another tab in the browser. Wait 60 seconds. Come back. Is the rest timer still
   counting? Or is it stuck? Or reset to 90?

8. **Empty habit toggle** — Toggle the same daily habit on and off 30 times rapidly. Any
   state corruption? Does the streak counter go negative?

9. **Long display name** — Go to Settings, try to change the display name (if there's a
   way). Type 500 characters. Save. What does the Account tab show?

10. **Reset and repeat** — Settings → Reset All Data → Confirm. Does the app go back to
    onboarding? Then do the whole happy path again. Any state pollution from the
    previous user?

**Output:** Write to `~/Shift6/docs/qa/loop2-rapid-input.md`. For each attack:
- What I tried
- What happened
- Severity (P0 crash / P1 wrong state / P2 visual glitch / P3 cosmetic)
- Repro steps

Don't fix anything. Just document.
```

**Subagent B — Network loss (paste this prompt):**

```
You are a hostile QA tester for offline behavior. The Armor PWA claims to be a PWA.
Test if it actually works offline.

Open https://getshift6.com on iPhone 14 viewport (390×844). Go through onboarding, set a few
1RMs, complete a partial workout. Now TEST OFFLINE BEHAVIOR.

**Attacks to try:**

1. **Hard reload offline** — Open DevTools → Network → Set to "Offline" → Reload.
   What happens? Does the service worker serve a cached version? Does it show a connection
   error? Is the UI broken?

2. **Mid-workout offline** — Start a workout. Complete a set. Set DevTools to "Offline".
   Does the next Complete Set still work? Does saving a set work?

3. **Sign-in offline** — Set to offline. Try to sign in. What error message?

4. **Data export offline** — Set to offline. Try the "Export my data" button. Does it work
   (it should — it's just a Blob download, no network needed)?

5. **Slow network** — Set DevTools Network to "Slow 3G". Start a workout. How long until
   the workout screen renders? Is there a loading spinner? Or does the user see a blank screen?

6. **Flaky network** — Toggle "Offline" / "Online" rapidly while in the middle of a workout.
   Does the sync attempt re-trigger? Does the workout state corrupt?

7. **LocalStorage full** — Run in console:
   ```js
   try { for (let i = 0; i < 10000; i++) localStorage.setItem('bloat_' + i, 'x'.repeat(1000)); }
   catch (e) { console.log('caught:', e.message); }
   ```
   Then refresh. What does the app show? Does it gracefully degrade or crash?

**Output:** Write to `~/Shift6/docs/qa/loop2-network.md`. Same structure as Subagent A.
```

**Subagent C — State pollution (paste this prompt):**

```
You are a hostile QA tester focused on data integrity. The Armor PWA persists state to
localStorage. Try to corrupt the state and see what happens.

Open https://getshift6.com on iPhone 14 viewport (390×844). Test edge cases by
manipulating localStorage directly.

**Attacks to try:**

1. **Corrupt user data** — In console:
   ```js
   const data = JSON.parse(localStorage.getItem('armor_data'));
   data.preferences.equipmentTrack = 'invalid_track';
   data.userProfile.estimated1RMs = null;
   data.currentCycle.week = -5;
   data.currentCycle.day = 99;
   data.activeModifiers = { foo: true };
   localStorage.setItem('armor_data', JSON.stringify(data));
   location.reload();
   ```
   What does the app show? Crash? Empty state? Defaults?

2. **Wrong schema** — In console:
   ```js
   localStorage.setItem('armor_data', '{"completely":"wrong","shape":42}');
   location.reload();
   ```
   What happens?

3. **Empty armor_data** — In console:
   ```js
   localStorage.setItem('armor_data', '{}');
   location.reload();
   ```
   Does the app recover with defaults, or crash?

4. **Tamper with sync revision** — In console:
   ```js
   localStorage.setItem('armor_revision', 'NaN');
   location.reload();
   ```
   Does sync work?

5. **Mismatched version** — In console:
   ```js
   const data = JSON.parse(localStorage.getItem('armor_data'));
   data._version = '99.0.0';
   localStorage.setItem('armor_data', JSON.stringify(data));
   location.reload();
   ```
   Does the app handle schema migration? Or just use the bad data?

6. **Very large data** — In console, paste 1000 completed workouts into workoutHistory:
   ```js
   const data = JSON.parse(localStorage.getItem('armor_data'));
   data.workoutHistory = Array(1000).fill(null).map((_, i) => ({
     date: '2026-01-01', day: (i % 5) + 1, week: Math.floor(i / 5) % 6 + 1, completed: true,
     exercises: Array(5).fill(null).map((_, j) => ({
       id: 'squat', sets: [{ set: 1, reps: 8, weight: 200 + i, notes: '' }]
     }))
   }));
   localStorage.setItem('armor_data', JSON.stringify(data));
   location.reload();
   ```
   Does the Progress screen render? Is the chart performant?

**Output:** Write to `~/Shift6/docs/qa/loop2-state.md`. Same structure.
```

**Subagent D — JS errors (paste this prompt):**

```
You are a hostile QA tester focused on JavaScript errors. Your goal is to find every
uncaught error, every console warning, every failed network request.

Open https://getshift6.com on iPhone 14 viewport (390×844). Open DevTools → Console.
Go through every screen and EVERY interaction. Capture ALL errors and warnings.

**Method:**
- Watch the console throughout
- For every screen, note any error or warning
- For every interaction, check the console after
- Check the Network tab for failed requests (4xx, 5xx, CORS)

**Output:** Write to `~/Shift6/docs/loop2-js-errors.md`. For each finding:
- The error message
- The URL/file where it occurred
- The action that triggered it
- Severity (silent = low, visible but recoverable = medium, crashes the app = high)
