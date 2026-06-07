# Tester 2 - Hannah Round 1

## Date
June 7, 2026

## Bundle Status
✅ FRESH BUNDLE CONFIRMED
- "Start express" button visible
- FirstRunTour showing
- Reminders section present in Settings

## Onboarding
✅ Name "Hannah" entered
✅ "Use both" → direct to dashboard (no second screen)

## Dashboard
⚠️ "Top 1 rep max: 225lbs" shown — not "—" as expected for home user with no 1RMs
⚠️ Default 1RMs are pre-populated (gym defaults) even for home-only users
❌ No 0-lbs nudge visible — dashboard shows 225lbs without prompting Hannah to set her own

## 10-Minute Express Card
✅ "Start express" button visible

## Settings → Estimated 1RMs
🔴 **CRITICAL BUG: Home gym 1RM values are NOT editable**
- Goblet Squat: shows "95 lbs" but NO "Set" button — cannot be edited
- DB Bench Press: shows "100 lbs" but NO "Set" button — cannot be edited
- DB Romanian DL: shows "155 lbs" but NO "Set" button — cannot be edited

In contrast:
- Barbell Row: has "Set" button ✅
- Shoulder Press: has "Set" button ✅

**Hannah cannot set her Goblet Squat to 50 lbs as specified in her persona**

## Home Gym Workout Default
❌ "Heavy Squats" workout still shows — not home-appropriate
❌ Workout shows barbell exercises (Squat, Bench, Deadlift) even for home-only user
⚠️ No automatic switch to home exercises when Home Gym track is selected

## Account → "Create one" Button
⚠️ Button labeled "Don't have an account? Create one"
❌ Clicking "Create one" does NOT toggle to register mode — form stays the same
⚠️ This is a UX bug — the button appears to do nothing

## kg/lbs Toggle
✅ Toggle exists (lbs/kg buttons in Settings)
⚠️ Could not verify if toggling updates dashboard values — would need to test with editable values

## Summary
- Home gym 1RMs are completely non-editable (no Set buttons for Goblet Squat, DB Bench, DB RDL)
- This blocks Hannah from setting her home exercise 1RMs
- Default workout still shows barbell exercises, not home-appropriate
- "Create one" button does not toggle register mode
- Fresh bundle confirmed but critical editing functionality missing for home users