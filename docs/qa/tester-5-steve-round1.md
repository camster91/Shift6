# Tester 5 - Steve Round 1

## Date
June 7, 2026

## Bundle Status
✅ FRESH BUNDLE CONFIRMED
- "Start express" button visible
- FirstRunTour showing
- Reminders section present in Settings

## Onboarding
✅ Name "Steve" entered
✅ "Use both" → direct to dashboard (no second screen shown for Steve)
✅ Tour dismissible

## First Impression
- Text size: normal (readable for senior user)
- Button size: standard tap targets
- "Start express" button visible on dashboard
- Top 1RM shows 225lbs (highest across gym defaults)

## Dashboard
✅ 10-Minute Express card (Start express button) visible
✅ Top 1RM: 225lbs
✅ Week 1, Base phase showing
✅ 4 protocol toggles: MVD, High CNS Fatigue, Heavy Meal, Travel

## Modifier Tooltips
❓ Could not verify tooltips - hovering not captured well in browser testing
❓ MVD toggle: workout changes to "Minimum Viable Day" but NO Start button visible
❓ The MVD card shows only the title icon and name - no exercise list, no Start button

## Start Button Behavior
❌ **MVD workout has no Start button** — the MVD protocol replaces the workout card with just a title (no exercises, no start)
⚠️ This is confusing - where does Steve start his workout?

## 10-Minute Express
✅ Button visible but unclear if it works when no primary workout card is showing

## End Workout Confirmation
❌ Could not test — no workout could be started

## Welcoming Assessment (61-year-old)
- Bundle is fresh with good content
- "Start express" is visible and inviting
- However, the MVD workout has no Start button — confusing UX
- No jargon tooltips visible in the protocol toggles
- The crash on "Start" button (found in Heather's testing) would affect Steve too

## Summary
- Fresh bundle confirmed
- MVD workout card has no Start button — user cannot start workout when MVD is active
- The "Start express" button is visible but relationship to MVD unclear
- No tooltip explanations for modifiers like "MVD", "High CNS Fatigue"
- Critical: workout cannot be started when MVD protocol is active