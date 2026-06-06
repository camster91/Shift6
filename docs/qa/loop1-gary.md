# QA Loop 1 — Fresh Eyes: Gym Bro Gary

**Date:** 2026-06-06
**Persona:** Gym Bro Gary, 26. Tech sales rep, trains 5-6 days/week. Uses Strong as primary tracker. Known 1RMs: squat 315, bench 245, deadlift 405. Opened Armor because of the periodization engine claim.
**Environment:** iPhone 14 viewport (390×844), Chrome DevTools device emulation, live PWA at https://getshift6.com

---

## What Worked

- **Onboarding flow** — Clean dark UI, good contrast, readable text. The "Your First Week" preview with 5 workouts was a nice touch.
- **Cycle progress visualization** — The 6-segment bar (Base → Volu → Tran → Meav → Peak → Delo) clearly showed where I am in the program.
- **Workout session UX** — Completing sets, rest timer with countdown, Skip Rest button all worked smoothly. The transition between exercises was smooth.
- **Rest timer** — Circular progress ring with 1:28 countdown felt appropriate. +/-15 buttons and Skip Rest worked as expected.
- **Dashboard gym toggle** — Switching between Full Gym and Home Gym felt snappy.
- **Daily habits checklist** — Checkboxes for non-workout activities (walks, single-leg stands) are a nice touch.
- **Progress tab** — Shows streak, sessions completed, weekly volume, total sets. Not empty even after one workout.

## What Was Confusing

1. **"Begin with Full Gym defaults" vs "Or skip — use both tracks"** — On the onboarding screen, I had to tap Full Gym card first to select it, then tap the green button. But I could also just tap "Or skip" without selecting anything. Why would I click the first option when the second exists and is more flexible?

2. **Protocol chips (🛡️ 😴 🍝 ✈️)** — The four protocol buttons (MVD, High CNS Fatigue, Heavy Meal, Travel) appeared on the dashboard. I tapped MVD and it expanded to "Minimum Viable Day" but it wasn't clear what this means or does. Are these pre-populated recommendations or did I trigger them somehow? There's no explanation of what happens when a protocol is active vs inactive.

3. **"Set your 1RMs in Settings"** — The dashboard shows "Set your 1RMs in Settings to calculate workout weights." But when I went to Settings and tried to set 1RMs, the values didn't save (see What Broke below).

4. **"Create one" button on sign-in** — Tapping "Don't have an account? Create one" did absolutely nothing. The form stayed exactly the same. No sign-up flow, no error message, no indication that anything happened.

5. **End Workout behavior** — When I tapped "End Workout" mid-session, I expected a confirmation dialog ("Are you sure? You'll lose your progress"). Instead, it immediately returned to the dashboard. That felt abrupt.

## What Broke

### 1. 1RM values don't persist (CRITICAL)
**Repro:** Settings → tap "Set" on Barbell Squat → type 315 → press Enter → navigate away → come back.
**Expected:** 315 lbs saved and displayed.
**Actual:** All 1RM fields show "Set" again. Values are gone. Tried this 3 times. Bench Press showed "245 lbs" momentarily after entering it, but after navigating away and returning, it was back to "Set". The data does not survive a page refresh or navigation.

### 2. "Create one" account button does nothing
**Repro:** Account tab → sign-in form → tap "Don't have an account? Create one".
**Expected:** Form changes to a sign-up/create account form.
**Actual:** Nothing happens. The button is dead.

### 3. Export button has no feedback
**Repro:** Account tab → tap "Export my data".
**Expected:** A file downloads, or a toast/alert says "Data exported."
**Actual:** Nothing visible happens. No download, no confirmation. Console shows no errors either.

### 4. Page goes blank when editing Deadlift spinbutton
**Repro:** Settings → Full Gym 1RMs → tap "Set" on Deadlift → the spinbutton appears → type 405 → press Enter.
**Expected:** Value saves, page continues showing Settings.
**Actual:** The entire page goes blank (empty snapshot). Navigation breaks. Browser back doesn't recover. Had to manually navigate to getshift6.com to continue.

### 5. Workout weights always show 0 lbs
**Repro:** Complete a workout session (Heavy Squats → Leg Press → Leg Curls).
**Expected:** Since I entered 1RMs in Settings, the workout should show calculated weights (e.g., Leg Press at ~225 lbs for a 315 squat).
**Actual:** Every exercise shows "0 lbs" regardless of what I entered in Settings. This is a direct consequence of bug #1 (1RMs don't persist).

## What Felt Off

1. **No loading state on onboarding** — When I tapped "Begin with Full Gym defaults" after entering my name, there was no spinner or "Loading..." state. The dashboard appeared about 1 second later with no feedback that anything was happening.

2. **"Top 1RM" stat shows 0 lbs on dashboard** — The bottom stat bar shows 🏆 0lbs TOP 1RM. After supposedly setting 1RMs, this should update. It doesn't (because of the persistence bug).

3. **Onboarding "Begin" button requires name field to be non-empty** — I entered "Gary" in the name field, selected "Full Gym", then tapped "Begin with Full Gym defaults" — it worked. But if I tried to tap it without selecting a gym option first, nothing happened. The button doesn't give feedback for invalid states (no shake, no tooltip saying "please select an option").

4. **No PWA install prompt** — Opening getshift6.com on an iPhone viewport didn't trigger any "Add to Home Screen" banner. For a fitness app that claims to replace Strong, users would expect to install it.

5. **Weight unit toggle has no immediate feedback** — Tapping "kg" in Settings → Weight Unit. The button highlights but there's no visible change on the dashboard or anywhere else to confirm the switch happened.

6. **Plate visualizer not tested** — I never saw a plate visualizer during my walkthrough. The instruction mentioned checking if the SVG shows 3 plates for 245 lbs (bar 45, plates per side = 100: 45+45+10). I never encountered this visual element.

## Top 5 Issues Ranked by Severity

### 1. [CRITICAL] 1RM values don't save — Settings page is broken
- **Page:** Settings → Estimated 1RMs → Full Gym
- **Repro:** Tap "Set" on any 1RM → type value → press Enter → navigate away → return
- **Expected:** Value persists (e.g., Squat shows "315 lbs")
- **Actual:** All fields revert to "Set". Data loss on every navigation.

### 2. [HIGH] "Create one" button on Account tab does nothing
- **Page:** Account tab → sign-in form
- **Repro:** Tap "Don't have an account? Create one"
- **Expected:** Form switches to account creation
- **Actual:** No response. Button is dead.

### 3. [HIGH] Workout shows 0 lbs instead of calculated weights
- **Page:** Workout session (Leg Press, Leg Curls, etc.)
- **Repro:** Start workout → complete sets
- **Expected:** Weights calculated from 1RMs (e.g., Leg Press at ~225 lbs)
- **Actual:** Every exercise shows "0 lbs" — the periodization engine can't calculate percentages without persisted 1RMs.

### 4. [MEDIUM] Page goes blank when editing Deadlift 1RM
- **Page:** Settings → Full Gym 1RMs → Deadlift "Set" button
- **Repro:** Tap Deadlift's Set → type 405 → press Enter
- **Expected:** Value saves, stay on Settings page
- **Actual:** Page becomes empty. Navigation breaks completely.

### 5. [MEDIUM] Export button gives no feedback
- **Page:** Account tab → "Export my data" button
- **Repro:** Tap the button
- **Expected:** File downloads or success toast appears
- **Actual:** Nothing happens. User has no idea if export worked.

## Would I Download This App?

**No.**

The periodization engine is the core promise of this app — it claims to automatically calculate weights based on your 1RMs. But the 1RM settings don't work. Every workout shows 0 lbs. That means I'm tracking my lifts on a blank slate with no auto-regulation. I might as well use a spreadsheet. The data persistence bug alone makes this unusable for a serious lifter who wants their history tracked properly. If the 1RM persistence bug were fixed, I'd reconsider — but right now it feels like a prototype, not a product I'd trust with my training data.