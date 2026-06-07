# Tester 4 - Pat Round 1

## Date
June 7, 2026

## Bundle Status
✅ FRESH BUNDLE CONFIRMED
- "Start express" button visible
- FirstRunTour showing on first load
- Reminders section present in Settings

## Onboarding
✅ Name "Pat" entered
✅ "Use both" → direct to dashboard (no second screen)
✅ Tour dismissible

## Dashboard
✅ "Start express" button visible (10-Minute Express card)
✅ "Top 1 rep max: 225lbs" shown
✅ Week 1, Base phase
✅ 4 protocol toggles visible
✅ 4 daily habits showing

## 0-lbs Nudge
❌ Not visible — "Top 1 rep max: 225lbs" shows instead of a 0-lbs nudge
⚠️ A new user with no 1RMs set might not see a prompt to set them

## Streak Grace Hint
❌ Not visible in dashboard scan

## Toggle MVD
❌ When MVD is toggled ON:
- Workout card changes to "Minimum Viable Day" heading
- But NO Start button appears
- No exercises shown
- User cannot start a workout when MVD is active

## Toggle High CNS Fatigue
✅ Button toggles, but could not see workout card label change
❓ Could not verify "CNS fatigue: 60% 1RM, hypertrophy" label — workout crashes on Start

## Toggle Travel
✅ Button toggles, but could not verify "Travel: bodyweight subs" label
❓ No workout card shown when Travel is toggled (same issue as MVD)

## Start Workout
❌ **Start button crashes app** — "Something went wrong" error appears when clicking Start on any workout
- Reproducible: happens every time
- Blocks all workout testing

## End Workout Confirmation
❌ Could not test — workout crashes on Start

## Settings → Reminders
✅ 3 toggles present:
1. Toggle daily habits reminder
2. Toggle workout reminder
3. Toggle product updates

## Busy Parent Assessment (10-15 min/day)
❌ App does NOT fit into 10 minutes currently — Start button is broken
⚠️ Even when MVD is active, there's no Start button to begin the workout
⚠️ The "Start express" button exists but doesn't navigate to a workout when clicked (same crash bug)

## Summary
- Fresh bundle with good content
- Critical bug: Start button crashes app
- MVD protocol shows workout card with no Start button — user cannot start workout
- No end-workout confirmation could be tested due to crash
- Reminders section has 3 toggles (correct)
- 10-minute fit is blocked by the crash bug