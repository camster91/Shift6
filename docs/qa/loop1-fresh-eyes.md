# QA Loop 1 — Fresh Eyes (different people, same app)

**Date:** 2026-06-06
**Goal:** Find issues the original audit missed because the auditor got used to the design.
**Method:** 5 subagents, each with a different persona, each opens the app cold and writes a report.

**Loop instructions (paste this prompt to each subagent):**

```
You are a brand new QA tester for the Armor fitness PWA. You have never seen this app before.
Open https://getshift6.com on iPhone 14 viewport (390×844). Do NOT clear localStorage first —
you'll see what a first-time user sees.

Your job: be adversarial. Pretend you don't trust the app. Pretend you're evaluating whether
to install it. If anything feels off, slow, ugly, confusing, or wrong — write it down. Be specific.

**Walk through this in order, doing what a real user would do (not what a developer would do):**

1. **First impression (5 seconds)**
   - Open the URL. What's the very first thing you see?
   - Does it load fast or slow? Time it mentally.
   - Does anything flicker, jump, or shift as it loads?
   - Is there a PWA install prompt? What does it say?

2. **Onboarding (60 seconds)**
   - Read the copy carefully. Is anything unclear?
   - Type a name. Is the cursor visible? Is the keyboard intrusive?
   - Try tapping "Full Gym" then "Home Gym" then "Full Gym" — does the selection move?
   - Don't tap the Use both button. Just look at it. Is "Recommended for new users" badge obvious?
   - Now tap "Use both" with the name field empty. What happens?
   - Now type a name and tap. How long until the dashboard appears? Is there a loading state?

3. **Dashboard (no 1RMs set) (60 seconds)**
   - What does the cycle progress card tell you? Is "Base · Week 1" clear?
   - What do the 4 protocol chips mean? Are the icons recognizable (🛡 😴 🍝 ✈️)?
   - Tap each protocol chip. Does it activate? Do the colors change?
   - Tap "Home Gym" then "Full Gym". Does the switch feel snappy?
   - The "Today's Workout" card says "Heavy Squats" with a Start button. Tap Start.
   - What do you see? Are the numbers (0 lbs) concerning? Is there guidance?

4. **Workout session (90 seconds)**
   - The screen says "Leg Press" with 3 sets × 12 reps × 0 lbs. Tap Complete Set 1.
   - A rest timer should appear with a countdown. How does it feel?
   - Tap Skip Rest. Does it advance to the next set?
   - Tap Complete Set 2 and 3. The screen says "Workout Complete" or advances to next exercise.
   - Try going through the whole workout. How long does it take? Is anything confusing?
   - Tap End Workout partway through. What happens?
   - Tap the X (close) button at the top. Does it warn before discarding?

5. **Progress tab (30 seconds)**
   - Tap the Progress tab in the bottom nav.
   - What do you see? Is the empty state helpful or deflating?
   - Are there placeholder cards? Are they obviously empty?

6. **Account tab (30 seconds)**
   - Tap the Account tab.
   - You see a profile section (avatar with "A", name "Athlete", "Not signed in").
   - You see an "Export my data" button. Tap it. Does a file download?
   - You see a sign-in form. Tap the email field, then the password field. Is the form usable?
   - Tap "Don't have an account? Create one". Does the form change?

7. **Settings tab (30 seconds)**
   - Tap the Settings tab.
   - You see 7 sections. Are they all visible? Do they look like the same design system?
   - Tap "kg" in Weight Unit. Does anything change visually? Check the dashboard for kg/lbs.
   - Tap the first "Set" button on a 1RM exercise. Type 100. Press Enter. Does it save?
   - Tap "Reset All Data". A modal appears. Tap Cancel. Does it dismiss?

8. **Final check**
   - Rotate to landscape (or just look at the viewport). Anything broken?
   - Tap the back button on a phone. Does the app handle it?
   - Try a very fast double-tap on a button. Any lag or visual glitch?

**Output:** Write to `~/Shift6/docs/qa/loop1-<your-persona>.md`. Use this structure:
- What worked
- What was confusing
- What broke
- What felt off
- Top 5 issues ranked by severity
- Would I download this app? (Yes / No / Maybe + 1 sentence why)

DO NOT fix anything. DO NOT propose code changes. You are a user.
```
