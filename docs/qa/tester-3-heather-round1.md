# Tester 3 - Heather Round 1

## Date
June 7, 2026

## Bundle Status
✅ FRESH BUNDLE CONFIRMED
- "Start express" button visible (10-Minute Express card)
- FirstRunTour showing on first dashboard load
- Reminders section present in Settings
- No stale bundle indicators

## Onboarding
✅ "Use both" selected → dashboard without second screen
✅ Name "Heather" entered successfully
✅ Tour can be dismissed

## 1RM Settings
- Barbell Squat: already 185 lbs (gym default)
- Goblet Squat: shows "95 lbs" (was trying to set to 50)
- ⚠️ Could not determine if clicking the 95 lbs button opens an edit modal — clicks had no visible effect in snapshot
- Need to investigate: is the Goblet Squat value editable or is it a static display?

## Dashboard
✅ "Start express" button visible (10-Minute Express card)
✅ "Top 1 rep max: 225lbs" shown (highest across gym exercises: 185 squat, 135 bench, 225 deadlift)
✅ Week 1, Base phase showing
✅ 4 protocol toggles visible (MVD, High CNS, Heavy Meal, Travel)
✅ 4 daily habits showing

## Critical Bug Found 🚨
**Start button causes crash**: Clicking "Start" on the workout card produces "Something went wrong" error screen.
- Error is reproducible (happens every time)
- "Reload App" recovers, but crash repeats on next Start attempt
- This blocks all workout testing

Steps to reproduce:
1. Open app → onboarding → "Use both"
2. Dashboard loads
3. Click "Start" on workout card (e.g., "Heavy Squats")
4. Error: "Something went wrong — The app hit an unexpected error. Your data is safe"
5. Only options: "Reload App" or "Reset Data & Start Fresh"

## Swap Exercise Button
❌ Could not test — workout crashes on Start

## End Workout Confirmation
❌ Could not test — workout crashes on Start

## Progress Tab
Not yet tested due to crash blocking workout completion.

## Settings → Reminders
✅ 3 toggles present:
1. Toggle daily habits reminder
2. Toggle workout reminder
3. Toggle product updates

⚠️ Could not verify persistence — clicked daily habits toggle but could not confirm state change through accessibility tree

## Summary
The app shows a fresh bundle with correct content, but a critical bug blocks all workout functionality. The "Start" button crashes the app consistently.