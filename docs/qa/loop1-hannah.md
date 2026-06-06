# Fresh Eyes QA — Home Hero Hannah
**Date:** 2026-06-06
**Persona:** Hannah, 32. Freelance graphic designer. 2-year-old at home. No gym membership, no barbell. Has pull-up bar and resistance band. Opened Armor because Jess said "it's actually simple."
**Environment:** iPhone 14 viewport (390×844), Chrome DevTools device emulation, live PWA at https://getshift6.com

---

## What Worked

- **First impression:** Clean, dark, premium feel. Loading was fast. The ⚔️ ARMOR logo and "Set up in 5 seconds" headline immediately communicate confidence and simplicity.
- **Onboarding flow:** Typing my name and selecting gym type was intuitive. The "Don't worry — you can change this anytime from Settings" reassurance is excellent and reduces anxiety. The "Recommended for new users" badge on "Use both" is visible and helpful.
- **Dashboard clarity:** "Cycle 1 · Week 1" + "Base" phase label is immediately understandable. The progress bar with 6 week markers is a nice visual map of the journey. Protocol chips (🛡️ 😴 🍝 ✈️) are recognizable and toggling them feels responsive.
- **Gym toggle:** Switching between Full Gym and Home Gym is fast and the selection persists visually.
- **Workout session:** Going through sets felt smooth. Rest timer (1:20 default) with +15/-15 and Skip Rest is well-designed for busy parents. "End Workout" cleanly returns to the dashboard.
- **Progress tab:** Shows workout history (1 session, 6 sets, Fri Jun 5). Streak system gives early encouragement. The cycle progress visualization (Base → Vole → Tran → etc.) maps out the full journey.
- **Account tab:** Clean profile display with avatar, name, "Not signed in" status. Export button present. Sign-in form is usable.
- **Settings tab:** All 7 sections visible. kg/lbs toggle is present and functional. Theme toggle works. "Reset All Data" shows a confirmation modal.

---

## What Was Confusing

- **"5-second setup" claim:** After typing name and tapping "Use both," there's a SECOND screen showing the 5 track options (Heavy Squats, VO2 Max + Pull, etc.) with two buttons: "Begin with Full Gym defaults" and "Or skip — use both tracks." This is not a 5-second experience — more like 15-20 seconds with an extra decision point. The claim feels misleading.
- **Onboarding "Use both" interaction:** Tapping "Use both — set 1RMs as you go" doesn't immediately go to dashboard. It shows 5 workout track cards and asks for a third choice. The copy says "Use both" but you still have to pick. This confused me.
- **Dashboard "0 lbs" stat:** The trophy card shows "🏆 0lbs TOP 1RM" with no explanation of what this means or why it's zero. A new user might think something is broken.
- **"Set your 1RMs" warning:** The dashboard shows "Set your 1RMs in Settings to calculate workout weights" but Settings' "Set" buttons don't open any input modal. This is a broken loop — the app tells you to go to Settings to fix something that Settings doesn't actually let you do.
- **Protocol chip "High CNS Fatigue":** This appears pre-activated (amber highlight). I'm a new user with no data — why is this already on? It feels like the app is assuming I have fatigue before I've done anything.
- **Workout is called "Heavy Squats" but starts with Leg Press:** As a home user without a barbell, seeing "Heavy Squats" as the workout title then doing Leg Press (a machine exercise) is disorienting. I don't have leg press equipment either. The app doesn't guide me on what to do when I don't have the equipment.
- **"Don't have an account? Create one" does nothing:** Tapped it, form stayed exactly the same. No sign-up flow, no error, no change whatsoever.

---

## What Broke

1. **"Set" buttons in 1RM settings do nothing.** Clicked "Set" for Goblet Squat (Home Gym), clicked "Set" for Deadlift (Full Gym). Neither opened any modal, input, or visual feedback. The entire 1RM setting mechanism appears non-functional. I cannot set my 1RM values through the UI.
2. **kg/lbs toggle doesn't update the dashboard.** I switched from lbs to kg in Settings, then went back to the dashboard. The "0 lbs" stat still says "lbs" — it didn't update. Either the toggle doesn't persist, or it doesn't propagate to the UI.
3. **"Don't have an account? Create one" is dead.** No action, no change, no error — just stays on the same sign-in form.

---

## What Felt Off

- **The app feels designed for barbell people.** "Heavy Squats" as the workout name, Leg Press as the first exercise, Deadlift as a primary lift — these are barbell gym concepts. As someone who only has a pull-up bar and resistance band, I feel like I'm using the wrong app. The Home Gym track exists but the default onboarding pushes Full Gym.
- **All exercises show "0 lbs"** — no weights are displayed anywhere until 1RMs are set. But the mechanism to set them is broken. The app starts in a state that looks broken.
- **Progress tab's volume chart is empty** — no bars rendered at all for any day. "Weekly Volume: 0.0k lbs" reads like nothing happened. For a first-time user who just completed a workout, this is deflating — the workout I just did isn't showing up as volume.
- **"High CNS Fatigue" protocol is pre-activated** with no clear way to disable it for a new user. The amber ring around it suggests it's "on" but it's unclear how to turn it off.
- **Onboarding requires an extra step that contradicts "Use both"** — the button says "Use both" but then shows 5 track options asking me to choose one before proceeding.

---

## Top 5 Issues Ranked by Severity

### 1. **[CRITICAL] 1RM "Set" buttons completely non-functional**
- **Page:** Settings → Estimated 1RMs
- **Repro:** Tap "Set" on any exercise (Goblet Squat, Deadlift, etc.)
- **Expected:** A modal/input appears to enter a weight value
- **Actual:** Nothing happens. No modal, no input field, no feedback. User cannot set 1RMs through the UI.
- **Severity:** Critical — blocks the core value proposition. The app tells users to "set 1RMs in Settings" but Settings doesn't allow setting them.

### 2. **[HIGH] kg/lbs toggle doesn't update dashboard**
- **Page:** Settings → Weight Unit (switched to kg) → Dashboard
- **Repro:** Toggle from lbs to kg, go back to dashboard
- **Expected:** Dashboard stat shows "0 kg" instead of "0 lbs"
- **Actual:** Dashboard still shows "0 lbs" — toggle has no visible effect on UI
- **Severity:** High — unit preference appears to not persist or propagate to UI components

### 3. **[HIGH] "Don't have an account? Create one" does nothing**
- **Page:** Account → Sign-in form
- **Repro:** Tap the "Don't have an account? Create one" button
- **Expected:** Either shows a sign-up form, or navigates to account creation
- **Actual:** Form stays exactly the same. No change, no error, no navigation.
- **Severity:** High — blocks user from creating an account through the app

### 4. **[MEDIUM] "5-second setup" claim is false**
- **Page:** Onboarding
- **Repro:** Type name, tap "Use both" → observe extra screen with 5 track cards and two buttons
- **Expected:** One tap from name entry to dashboard
- **Actual:** Two decision screens before dashboard. Not 5 seconds. More like 15-20 seconds with reading.
- **Severity:** Medium — erodes trust in marketing claims from first use

### 5. **[MEDIUM] Workout named "Heavy Squats" contains barbell-only exercises for home users**
- **Page:** Dashboard → Workout card ("Heavy Squats")
- **Repro:** As a home-only user (no barbell), start "Heavy Squats" workout — see Leg Press, Leg Curls, Calf Raises
- **Expected:** Home Gym track would show bodyweight/home-equipment exercises
- **Actual:** Leg Press is a machine exercise (not typically available at home). App doesn't guide the user when equipment doesn't match. "Heavy Squats" title suggests barbell but first exercise is machine leg press.
- **Severity:** Medium — creates cognitive dissonance for home users who selected Home Gym track during onboarding but still see gym-only content

---

## Would I Download This App?

**Maybe.** The design is beautiful and the concept is solid. But as a home-only user with no barbell, I already feel like I'm in the wrong place. The "Heavy Squats" workout name, the 1RM system that doesn't work, and the pre-activated "High CNS Fatigue" protocol make me feel like the app knows things about me I never told it. The onboarding says "Use both" but still asks me to pick a track. If the 1RM bug gets fixed and the app learns that I'm purely home-based, this could be great. Right now it feels like it's for gym people who occasionally work out at home — not home people who occasionally go to a gym.