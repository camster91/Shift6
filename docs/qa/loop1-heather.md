# QA Report: Hybrid Heather — Loop 1

**Tester:** Hybrid Heather (34, Marketing Director)
**Environment:** iPhone 14 viewport (390×844), Chrome DevTools emulation, PWA at https://getshift6.com
**Date:** 2026-06-06
**Fixes claimed:** 5 fixes shipped — 0-lbs nudge, "Use both" skips second screen, TOP 1RM = active track, mid-workout track switch saves sets, streak grace hint

---

## 1. First Impression (5 sec)

**What was tested:** Opened URL. Observed onboarding screen.

**Finding:** ✅ "Use both — set 1RMs as you go" button is prominent and front-and-center. Clean dark UI. The onboarding correctly leads with "Set up in 5 seconds" and doesn't demand a 0-lbs entry upfront.

**Status:** PASS — First-run experience is better. The "Use both" path is the recommended path, no weight demanded.

---

## 2. Onboarding — "Use Both" Flow

**What was tested:** Typed "Heather". Clicked "Use both — set 1RMs as you go".

**Finding:** ✅ Went straight to dashboard. No second screen appeared. The fix works.

**Status:** PASS — "Use both" skips the second screen as promised.

---

## 3. Dashboard (No 1RMs Yet)

**What was tested:** Observed dashboard for 1RM guidance nudge and modifier labels.

**Findings:**
- ❌ **No 1RM guidance nudge visible** — no banner or prompt suggesting "Set your 1RMs here"
- **Modifier labels (4 total):** MVD, High CNS Fatigue, Heavy Meal, Travel
- ⚠️ **"MVD" is opaque** — the label alone doesn't convey what it does; a user unfamiliar with the terms would need tooltips
- ✅ **"High CNS Fatigue"** is self-explanatory
- ✅ **"Heavy Meal"** is self-explanatory
- ✅ **"Travel"** is self-explanatory

**Status:** PARTIAL — No 0-lbs nudge on dashboard. Modifiers mostly clear, but "MVD" needs either a tooltip or clearer label.

---

## 4. Set Both 1RMs

**What was tested:** Settings → Full Gym (Barbell Squat 185 lbs ✅ already set). Home Gym (Goblet Squat was 95 lbs, needed to be 50 lbs).

**Findings:**
- ✅ **Full Gym Barbell Squat 1RM** already set to 185 lbs — correct
- ❌ **Goblet Squat 1RM cannot be edited** — clicking the "95 lbs" button does nothing (no input field, no modal, no response)
- ❌ **TOP 1RM = 225lbslbs** (Full Gym active) — shows **Deadlift 225** (cross-track value), not Barbell Squat 185 (active track's primary). "lbs" is duplicated.
- ❌ **TOP 1RM = 155lbslbs** (Home Gym active) — shows **DB Romanian DL 155** (cross-track), not Goblet Squat 95 (active track's primary). "lbs" duplicated here too.
- ❌ **The "Top 1RM" fix is NOT working** — it shows the highest cross-track 1RM, not the active track's relevant max.

**Status:** FAIL — TOP 1RM still shows cross-track max, not active-track max. Goblet Squat 1RM is uneditable. Duplicate "lbs" display bug.

---

## 5. Mid-Workout Track Switch

**What was tested:** Started Full Gym workout → clicked Start button.

**Finding:** ❌ **Start button is unresponsive** — clicking "Start" on the Heavy Squats card does nothing. No workout execution screen appears. Multiple attempts confirmed.

**Status:** FAIL — Cannot start a workout to test mid-workout track switching.

---

## 6. Progress Tab — Streak Grace Hint

**What was tested:** Navigated to Progress tab. Looked for "ⓘ 1 freeze day per week" streak grace hint.

**Finding:** ❌ **No streak grace hint found.** Progress tab shows:
- "0 day streak"
- "Longest: 0 days"
- Empty 7-day volume chart
- "No Sessions Yet" empty state
- No info icon, no tooltip, no freeze day explanation

**Status:** FAIL — Streak grace hint not present.

---

## 7. Daily Habits — Heavy Meal Modifier

**What was tested:** With "Heavy Meal" modifier active, habit list shows Post-Dinner Walk.

**Finding:** ⚠️ **Could not complete test** — Heavy Meal modifier was already active (orange highlight on "High CNS Fatigue" in the snapshot, but modifiers may toggle). The Post-Dinner Walk shows 10 min in the habit list. With Heavy Meal active, it should go to 20 min — but there is no visible change in the habit list to confirm this.

**Status:** INCONCLUSIVE — Cannot confirm habit duration updates in real time.

---

## 8. The Hard Test — Does Dual-Track Life Feel Easier?

**Summary assessment:**

| Fix | Status |
|-----|--------|
| 0-lbs nudge on dashboard | ❌ Not visible |
| "Use both" skips second screen | ✅ Working |
| TOP 1RM = active track max | ❌ Not working (still shows cross-track) |
| Mid-workout track switch saves sets | ❌ Couldn't test (Start broken) |
| Streak grace hint | ❌ Not present |

**Overall:** 1 of 5 fixes confirmed working. The hybrid user experience is **not yet easier**. The two most impactful fixes for Heather (TOP 1RM showing active track max, and mid-workout switching) are both broken.

---

## Bugs Filed

1. **BUG-1:** TOP 1RM displays cross-track max instead of active track's primary lift max
2. **BUG-2:** Duplicate "lbs" suffix in TOP 1RM display ("225lbslbs")
3. **BUG-3:** Goblet Squat 1RM button (95 lbs) is not editable — no input appears on click
4. **BUG-4:** Start button on workout card is unresponsive — workout cannot be started
5. **BUG-5:** No 1RM setup nudge on dashboard for new "Use both" users
6. **BUG-6:** No streak grace hint on Progress tab
7. **BUG-7:** "MVD" modifier label is opaque — unclear what it does

---

## Console Call Count: 6 / 40
## Click Count: 13 / 20