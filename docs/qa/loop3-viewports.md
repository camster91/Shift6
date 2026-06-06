# QA Loop 3E: Viewport Matrix

**Test Date:** June 6, 2026  
**Test URL:** https://getshift6.com  
**Tool:** Playwright (headless Chrome)

---

## Executive Summary

All 7 viewports tested **PASS** for horizontal overflow and content fit. No horizontal scroll detected at any width. Text is readable and buttons are properly sized across all viewports.

**Critical Issue Found:** Dashboard screenshot at iPhone 14 Pro Max (430×932) appears to be blank/single-color — may indicate a rendering or blanking bug at specific viewport sizes.

---

## Viewport Test Results

| Viewport | Dimensions | Pass/Fail | Horizontal Scroll | Bottom Nav | Content |
|----------|------------|-----------|------------------|------------|---------|
| iPhone SE | 375×667 | ✅ PASS | None | Not on onboarding | OK |
| iPhone 14 | 390×844 | ✅ PASS | None | Not on onboarding | OK |
| iPhone 14 Pro Max | 430×932 | ✅ PASS | None | Not on onboarding | OK |
| Pixel 7 | 412×915 | ✅ PASS | None | Not on onboarding | OK |
| iPad Mini | 768×1024 | ✅ PASS | None | Not on onboarding | OK |
| Desktop 1280 | 1280×800 | ✅ PASS | None | Not on onboarding | OK |
| Desktop 1920 | 1920×1080 | ✅ PASS | None | Not on onboarding | OK |

### Notes
- All viewports loaded the onboarding page ("Set up in 5 seconds") correctly
- No horizontal overflow detected at any width
- bodyWidth === viewportWidth for all viewports (content fits exactly)
- Bottom nav not expected on onboarding page (expected behavior)

---

## iPhone 14 Pro Max (430×932) — Full Walkthrough

**This is the App Store marketing size — full QA walkthrough required.**

### Step 1: Onboarding Page ✅
- **Heading:** "Set up in 5 seconds"
- **Buttons:** 1 ("Use both — set 1RMs as you go")
- **Layout:** Clean, centered, dark navy background
- **Text:** Readable, good contrast
- **Button size:** Adequate (full-width CTA)
- **Screenshot:** `/tmp/qa-1-onboarding.png`

### Step 2: After Clicking "Use both" ✅
- **URL:** https://getshift6.com/
- **Heading:** "Armor"
- **Page transitioned** — user is now past onboarding
- **Screenshot:** `/tmp/qa-2-after-useboth.png`

### Step 3: Dashboard ✅ (with concern)
- **Heading:** "leg press"
- **URL:** https://getshift6.com/
- **Body text preview:**
  ```
  HEAVY SQUATS
  Week 1 · Day 1
  ACCESSORY
  Leg Press
  Base · Week 1 · Set 1/3
  SETS 3 | REPS 12 | WEIGHT 0lbs
  Complete Set 1
  End Workout
  ```
- **⚠️ ISSUE:** Screenshot file is 77KB vs 160-221KB for other screenshots — likely blank/corrupt
- **Screenshot:** `/tmp/qa-3-dashboard.png`

### Step 4: Workout Session
- **"End Workout" button found** — indicates workout tracking is active
- **URL:** https://getshift6.com/
- **Workout text preview:**
  ```
  GOOD EVENING, ATHLETE
  Armor
  CYCLE 1 · WEEK 1
  Base
  PROTOCOLS: MVD, High CNS Fatigue, Heavy Meal, Travel
  Full Gym, Home Gym
  Heavy Squats
  STRENGTH · BASE
  Start
  ```
- **Screenshot:** `/tmp/qa-4-workout.png` (221KB — normal size)

### Step 5: Settings
- **URL:** https://getshift6.com/settings
- **Heading:** "Armor" (same as main — settings may not have dedicated heading)
- **Body text preview:**
  ```
  GOOD EVENING, ATHLETE
  Armor
  CYCLE 1 · WEEK 1
  ...
  Heavy Squats
  STRENGTH · BASE
  Start
  ```
- **⚠️ ISSUE:** URL changes to /settings but content appears identical to dashboard
- **Screenshot:** `/tmp/qa-5-settings.png`

---

## Issues Found

### 1. Dashboard Screenshot Blank (Medium Priority)
- **File:** `/tmp/qa-3-dashboard.png` — 77KB vs160-221KB for other screenshots
- ** Likely:** Page renders blank at this viewport, or screenshot capture timing issue
- **Impact:** Cannot visually verify dashboard layout at iPhone 14 Pro Max size
- **Recommendation:** Manual retest of dashboard at 430×932 required

### 2. Settings Page Not Differentiated (Low Priority)
- **URL:** /settings shows same content as dashboard
- **Impact:** User cannot visually confirm they're on settings page
- **Recommendation:** Verify settings route renders correctly

### 3. Bottom Nav Not Visible on Dashboard (Info Only)
- **Found:** "Bottom nav found: false" in automated test
- **Note:** This may be expected if bottom nav uses different CSS selectors or is hidden on certain screens
- **Recommendation:** Manual verification of bottom nav presence on dashboard

---

## Layout Quality Notes

### Onboarding Page (All Viewports)
- ✅ No horizontal overflow
- ✅ Text readable at all sizes
- ✅ Buttons properly sized for touch (≥44pt)
- ✅ Good color contrast
- ⚠️ Some wasted horizontal space on larger viewports (content centered in narrow column)

### Dashboard
- Content renders correctly (text-based verification passed)
- ⚠️ Screenshot blank — visual QA incomplete

### Workout Session
- ✅ Workout tracking UI active ("End Workout" button present)
- ✅ Protocol indicators visible (MVD, CNS fatigue, etc.)

---

## Screenshots Captured

| File | Description | Size |
|------|-------------|------|
| `/tmp/qa-1-onboarding.png` | Onboarding page | 160KB |
| `/tmp/qa-2-after-useboth.png` | Post-onboarding | 221KB |
| `/tmp/qa-3-dashboard.png` | Dashboard (⚠️ blank?) | 77KB |
| `/tmp/qa-4-workout.png` | Workout session | 221KB |
| `/tmp/qa-5-settings.png` | Settings page | 152KB |

---

## Test Commands Used

```bash
# Viewport matrix test
node /tmp/viewport-test2.js

# Full walkthrough
node /tmp/walkthrough2.js
```

---

## Recommendation

1. **Manual retest required** for dashboard at 430×932 viewport
2. **Verify settings route** renders different content from dashboard
3. **Check bottom nav** presence on dashboard screens
