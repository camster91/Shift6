# Fresh Eyes QA — Loop 1: Busy Parent Pat

**Date:** 2026-06-06
**Persona:** Pat, 38 — Project manager, 2 kids (3 and 6), partner travels, 10-15 min/day, used to run half-marathons, 3 fitness apps none used consistently
**Environment:** iPhone 14 viewport (390×844), Chrome DevTools device emulation, https://getshift6.com

---

## What Worked

1. **Onboarding was fast and clean** — "Set up in 5 seconds" delivered. Typed "Pat," tapped "Use both," and dashboard appeared instantly. No loading spinner, no lag.

2. **MVD protocol actually has behavior** — Tapping the MVD chip switched the workout from "Heavy Squats" to the Minimum Viable Day workout (100 push-ups, 15-min walk, 5-min mobility). The app didn't just relabel — it changed the content.

3. **Heavy Meal protocol extends the dinner walk** — Post-Dinner Walk went from 10 min to 20 min when I toggled Heavy Meal on. The habit list reflected the change in real time.

4. **Daily habits are realistic for a busy parent** — 3-min balance stands during toothbrushing, 10-min lunch walk, 5-min floor work. These are genuinely achievable in a chaotic household.

5. **No shame language** — "Your streak is protected" is reassuring, not guilt-inducing. The app doesn't seem to punish missed days in the UI.

6. **The habit-workout split is smart** — Habits (walks, balance, mobility) are separate from the strength workout. For a parent who might only get a walk in some days, this is thoughtful design.

7. **MVD workout fits my 10 minutes** — 100 push-ups (accumulate), 15-min walk, 5-min mobility. The walk and mobility are concrete and doable. The push-ups are distributed, not a single brutal set.

---

## What Was Confusing

1. **"High CNS Fatigue" — what does that mean?** — I tapped it multiple times and still don't know what CNS is or why I should toggle this. No tooltip, no explanation. I guessed it means "tired," but I'm not sure.

2. **"MVD" label doesn't expand on the chip** — The chip just says "🛡️ MVD." The full name "Minimum Viable Day" only appears as a heading after tapping. As a first-time user, I had no idea what MVD stood for until I tapped it.

3. **"Base · Week 1" has no context** — Is this a deload week? A foundation phase? Something harder? There's no explanation of what "Base" means or what I'm supposed to feel/sense during this week.

4. **"Heavy Squats" is the default workout — with 0 lbs** — The dashboard shows "Heavy Squats" as today's workout, but all1RMs are 0 lbs. There's no guidance on what to do when starting from zero. Do I just tap Start and do bodyweight? Is that the intended flow?

5. **Onboarding subtitle says "1RM" unprompted** — The setup screen says "pick a starting 1RM or use both tracks." I had to infer "1RM" means "One Rep Max." For someone who's never lifted, this term is foreign.

6. **Which protocols are active?** — When I tap MVD, the heading changes to "Minimum Viable Day." But I can't tell if the other protocols (High CNS Fatigue, Heavy Meal, Travel) are still active or inactive. The chips don't show a clear active/inactive visual state.

7. **No 10-minute workout option visible** — The app defaults to "Heavy Squats" (45-min-sounding workout). I had to manually tap MVD to get something short. There's no "I only have 10 minutes" shortcut or acknowledgment.

8. **"Travel" protocol — no visible behavior** — Tapped it. Nothing obvious changed on the dashboard. Does it reduce volume? Change exercises? Add walks? I have no idea.

9. **No notification settings found** — I looked in Settings and the Account tab. I didn't see any workout reminder or notification configuration. The app appears to have no reminder system, or it's hidden so deeply I missed it.

10. **Streak is0 days with no explanation** — The Progress tab shows "Current streak: 0 days, Longest streak: 0 days." But there's no explanation of how streaks work. Do I lose it after one missed day? A week? Is there a grace period?

---

## What Broke

1. **PWA install prompt appeared on return to dashboard** — After completing onboarding, a native-feeling "Add Armor to Home Screen" prompt appeared. This is fine UX for a PWA, but it interrupted my flow. It felt like the app was asking me to install itself before I'd even seen the workout.

2. **Rest timer behavior untestable** — I couldn't test the rest timer mid-workout because: (a) the default workout shows0 lbs, and (b) I couldn't figure out how to start a workout without first setting 1RMs. The "Start" button on "Heavy Squats" led to a workout screen, but I didn't complete a full set to test the rest timer.

3. **Heavy Squats +0 lbs = no guidance** — Starting the default workout with all 1RMs at 0 lbs left me doing exercises with no load. The app didn't explain what to do in this state.

---

## What Felt Off

1. **Jargon everywhere without explanations** — "CNS," "1RM," "MVD," "Base phase," "cycle." The app speaks in shorthand that assumes a user who's already familiar with periodized training. As someone who ran half-marathons (endurance vocabulary), I don't know what "Base" or "CNS" means in this context.

2. **The app assumes you're starting a real program** — My reality as a busy parent is that I'll miss days, I'll have10-minute windows, I'll sometimes only get a walk in. The app's default state is "Heavy Squats" — a serious strength session — which feels disconnected from the "Minimum Viable Day" positioning in the App Store.

3. **No "getting started" guidance for true beginners** — After onboarding, there's no tour, no explanation of what the colored chips mean, no hint about what to do first. The app just drops you on the dashboard.

4. **MVD is not a "workout" in the traditional sense** — 100 push-ups "accumulate throughout the day" isn't a single workout session. If I only have 10 minutes at6am before the kids wake up, I can't "accumulate" push-ups. The MVD concept is great, but it doesn't map to a real 10-minute window.

5. **The Daily Habits list is long** — 3 min + 10 min + 20 min (with Heavy Meal) + 5 min = 38 minutes of habits. Plus the MVD workout. For someone with10-15 minutes, this is actually a lot. The app doesn't acknowledge that this might be too much for a busy day.

6. **The progress tab is a blank slate** — "No Sessions Yet — Complete your first workout to unlock your progress dashboard." This is deflate-ing. As a new user, I want to see what's possible, not an empty screen telling me I haven't earned data yet.

7. **No visibility into what "Heavy" means in practice** — "Heavy Squats" sounds serious. But I don't know if this is 5x5 heavy or something else. The app gives me no preview of what the workout entails until I'm inside it.

8. **The gym toggle (Full Gym / Home Gym) is small and understated** — On the dashboard, the gym toggle is two small buttons below the protocols. This feels like an afterthought, but for me (someone who might work out at home OR at a gym), this is actually one of the most important choices.

9. **No indication of what happens if I miss a day** — The streak display shows 0 days. I have no idea if I need to be perfect, or if there's a grace period. As a busy parent, missing days is guaranteed. The app gives no reassurance on this front.

10. **The app doesn't remember my protocols between sessions** — After toggling MVD on and Heavy Meal on, I refreshed the page and both were still active (good). But there's no indication of whether these persist, reset each day, or require re-selection.

---

## Top 5 Issues Ranked by Severity

### 1. [HIGH] "High CNS Fatigue" and "Travel" protocols have no explained behavior
- **Page:** Dashboard, PROTOCOLS section
- **Repro:** Tap the "😴 High CNS Fatigue" chip or "✈️ Travel" chip. Look for any change in the workout or daily habits.
- **Expected:** The chip should either explain what it does, or visibly change the workout/habits to reflect reduced fatigue / travel mode.
- **Actual:** Tapping High CNS Fatigue does nothing visible. Tapping Travel does nothing visible. These are black boxes.
- **Severity:** High — a user has no way to know if these protocols are working or even what they're supposed to do.

### 2. [HIGH] No notification/reminder system found
- **Page:** Settings tab, Account tab
- **Repro:** Look for any "Notifications," "Reminders," or "Alerts" setting in the app.
- **Expected:** A way to set a 9pm workout reminder that fires as a push notification.
- **Actual:** No notification settings visible anywhere. The app appears to have no reminder system, or it's so hidden that a new user can't find it.
- **Severity:** High — Pat explicitly needs reminders to remember workouts. Without them, the app won't fit into her chaotic life.

### 3. [MEDIUM] MVD is not achievable in a single 10-minute window
- **Page:** Dashboard, MVD workout
- **Repro:** With MVD active, look at the workout. Try to complete it in 10 minutes.
- **Expected:** The MVD workout should be completable in one10-minute session (e.g., 100 push-ups as10x10 or5 rounds of 20, a 15-min walk, and 5-min mobility — all fitting in a single window).
- **Actual:** The 100 push-ups are described as "accumulate throughout the day." The 15-min walk is 15 minutes on its own. This isn't a 10-minute workout — it's a "do what you can when you can" day. Fine for some, but doesn't match the "10-15 minutes" positioning.
- **Severity:** Medium — the core promise ("fits in10 minutes") feels broken for MVD specifically.

### 4. [MEDIUM] "Heavy Squats" default with0 lbs shows no guidance
- **Page:** Dashboard, Today's Workout card
- **Repro:** Without setting any 1RMs, tap Start on "Heavy Squats."
- **Expected:** The app should explain what to do when starting with 0 lbs — either guide to set a 1RM first, or default to bodyweight, or explain the0 lbs state.
- **Actual:** The workout starts with exercises at0 lbs. No explanation. No guidance. The user is left wondering if this is a bug or intended.
- **Severity:** Medium — this is the first workout a new user sees. A broken first impression is hard to recover from.

### 5. [MEDIUM] No explanation of streak grace period
- **Page:** Progress tab, Streak display
- **Repro:** Look at the streak counter. Miss a day (in theory). Check if there's any explanation of grace period or streak protection.
- **Expected:** The app should tell users: "Miss a day? Your streak is protected for X days" or show a grace period indicator.
- **Actual:** "Current streak: 0 days, Longest streak: 0 days" with no explanation of how streaks work. For a busy parent who WILL miss days, this is anxiety-inducing rather than reassuring.
- **Severity:** Medium — the app claims to protect streaks (in MVD copy) but never explains the rules.

---

## Would I Download This App?

**Maybe.**

The app has real promise — the habit-workout split is smart, MVD is a great concept, and the daily habits are realistic. But the jargon ("CNS," "1RM," "Base"), the invisible protocol behaviors, and the lack of notification settings make it feel like it's designed for people who already know how to periodize training. As someone who just wants to move for 10 minutes and not feel bad about it, I don't know if this app is for me yet. I'd need to see a "beginner guide" or at least a tooltip on "High CNS Fatigue" before I'd trust it.
