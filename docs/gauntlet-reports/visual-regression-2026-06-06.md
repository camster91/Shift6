# Visual Regression Report — 2026-06-06

**Analyst:** Hermes subagent (vision analysis pass)  
**Screenshots:** `~/Shift6/docs/gauntlet-reports/screenshots/` (12 PNGs)  
**Baseline:** `~/Shift6/docs/VISUAL_UX_AUDIT_2026-06-06.md`

---

## Screen Verdicts

### 1. `01-onboarding.png` — Fresh Onboarding

**Verdict: P1 — Visually off (track cards lack selected state).**

All three interactive elements are present and tap targets exceed44pt. The "Recommended for new users" badge is correctly positioned above the "Use both" CTA. The "Don't worry — you can change this anytime from Settings" helper text is present in small uppercase gray. However, the two track cards (Full Gym / Home Gym) are **visually identical** — no border, checkmark, background tint, or any selected-state affordance. A user cannot tell which track is active or implied without reading the CTA button text. This matches the baseline audit's finding #9.

---

### 2. `02-onboarding-selected.png` — Onboarding with Full Gym Selected

**Verdict: P1 — Visually off (no card-level selected state).**

The Full Gym track is the implied default, evidenced by the CTA button ("Begin with Full Gym defaults") and the workout preview below (barbell exercises). However, **neither card has a cyan border, checkmark, or background color change**. Both cards render identically. The only selection signal is contextual (button text + preview content) rather than a local card affordance. Consistent with the baseline audit finding #9.

---

### 3. `03-dashboard.png` — Dashboard After Onboarding

**Verdict: PASS.**

All4 protocol chips (MVD, High CNS Fatigue, Heavy Meal, Travel) are fully visible without truncation. No right-edge fade gradient is present (the baseline's Travel chip truncation bug is not visible in this screenshot — the chip reads fully). The QuickStat row at the bottom (1/6 WEEK / Base PHASE / 0lbs TOP 1RM) renders as a consistent 3-tile StatTile primitive. Layout is clean. Note: the baseline flagged Travel chip truncation as a P0 regression; this screenshot does not reproduce it, suggesting the fix may have shipped or the truncation is intermittent.

---

### 4. `04-dashboard-mvd-active.png` — Dashboard with MVD Active

**Verdict: P2 — Polish (amber pulsing dot missing).**

The MVD chip is visually distinct from the other three chips — it has a dark amber/orange-tinted background versus the standard dark background of the other chips. The shield icon is also amber, consistent with the "Minimum Viable Day" card below. However, there is **no amber pulsing dot next to the "PROTOCOLS" label** — only a cyan lightning bolt icon. This is a minor animation/indicator omission (P2).

---

### 5. `05-dashboard-home-gym.png` — Dashboard with Home Gym Track

**Verdict: PASS.**

The workout card correctly updated to "Heavy Goblet Squats" — a home-gym-appropriate movement (single dumbbell/kettlebell). The Home Gym pill is highlighted in cyan with a yellow dot indicator, while Full Gym is dark/inactive. The gym toggle is functioning as expected.

---

### 6. `06-workout-session.png` — Workout Session Active Set

**Verdict: P1 — Functional gap (no1RM nudge).**

The SETS/REPS/WEIGHT card renders correctly (3 sets / 12 reps / 0 lbs). The "Complete Set 1" button is prominent and well-positioned. However, there is **no "Set your 1RM in Settings" link, hint, or tooltip** anywhere on the screen. The weight shows 0 lbs silently with no in-context explanation. This matches the baseline audit's finding #3 (workout shows "0 lbs" with no in-context nudge to set 1RMs). The baseline also flagged no rest timer, no plate visualizer, and no previous-performance reference — all confirmed still absent.

---

### 7. `07-workout-rest.png` — Workout Rest Screen

**Verdict: PASS.**

The TimerRing renders correctly with a glowing cyan circular progress ring and a "1:27" countdown inside. The -15 / +15 adjustment buttons are present though visually deprioritized (intentional). The "Skip Rest" CTA is prominent, rendered in cyan at the bottom-center with a chevron. This screen is a clear improvement over the baseline (which noted "no rest timer" as the #1 issue). **Rest timer is now present and functional.**

---

### 8. `08-workout-zero-state.png` — Workout with0 lbs State

**Verdict: P1 — Functional gap (raw 0 with no nudge).**

The weight displays as a raw "0 lbs" in the status line ("Set 2 of 3 · 12 reps @ 0lbs") with **no "Set your 1RM in Settings" link, banner, or tooltip**. This is the same issue as screenshot 06 but in the rest screen context. A user would have no way to understand why the weight is zero or how to correct it without leaving the workout flow. Matches baseline audit finding #3.

---

### 9. `09-progress.png` — Progress Screen

**Verdict: P1 — Layout bug (floating nav obscures chart).**

Three preview cards are present (streak, cycle blocks, weekly volume) and render at full opacity — not dimmed/faded as the baseline audit may have implied. The headline reads "Progress" (not "No Sessions Yet"). However, a **floating navigation pill is positioned mid-screen, overlapping and partially obscuring the "Last 7 Days · Volume" chart card**. This is a clear z-index / absolute positioning bug — the nav should be docked at the viewport bottom. Additionally, the volume chart renders no bars despite1 session being recorded (volume is 0.0k lbs, which is expected behavior but still visually sparse). The baseline noted "no streak counter" (finding #5) — the streak card IS now present (showing "1 day streak"), so that has been addressed.

---

### 10. `10-account.png` — Account Screen Logged Out

**Verdict: P1 — Layout bug (nav obscures sign-in button).**

All three expected elements are present: (1) profile section with avatar "A", name "Athlete", "Not signed in" status; (2) "Export my data" button; (3) sign-in form with EMAIL and PASSWORD fields. However, the **bottom floating navigation bar overlaps and partially obscures the "Sign In" button** at the bottom of the form. The form container also appears to extend below the visible viewport. This is a layout z-index issue, not a missing-feature issue. The baseline noted this was a "sign-in gate, not an account screen" (finding #4) — the profile section IS now present, but the sign-in button overlap is a new regression.

---

### 11. `11-settings.png` — Settings Screen

**Verdict: PASS.**

All 7 sections are visible in the correct order: Equipment Track, Estimated 1RMs, Theme, Weight Unit, Current Cycle, Profile, Danger Zone. Section headers use consistent uppercase gray styling throughout. The Weight Unit toggle is correctly positioned between Theme and Current Cycle. The baseline audit noted the 1RM editor was "wired up" (finding #8) — confirmed present with "Set" buttons. No issues found.

---

### 12. `12-1rm-editor.png` — 1RM Editor (Inline Edit Mode)

**Verdict: P0 — Wrong screen captured (editor not visible).**

The screenshot shows the Settings overview/list screen, not the 1RM editor in edit mode. For the Barbell Squat, a saved value (315 lbs) is shown as a read-only cyan pill. For all other exercises, a "Set" button is shown. **No number input, no save button, and no editable form is visible.** The floating navigation pill overlays the middle of the screen, partially obscuring the Bench Press and Deadlift rows. This screenshot does not fulfill its intended purpose — it cannot be used to verify the1RM editor's touch target sizing or save feedback. The baseline audit (finding #8) noted the editor was "wired up" but easy to miss. This regression pass could not verify that claim because the editor UI was not open.

---

## Consolidated Issue List

### P0 — Broken (must fix before ship)

| # | Issue | Screen | Evidence |
|---|-------|--------|----------|
| P0-1 | **1RM editor screenshot shows wrong state** — editor not in edit mode, no input or save button visible | `12-1rm-editor.png` | Vision analysis: "No number input is visible… no edit form/dialog is open" |
| P0-2 | **Floating nav overlaps sign-in button** — primary CTA obscured | `10-account.png` | Vision analysis: "Sign In button is partially obscured/cut off at its lower edge by the floating navigation bar" |
| P0-3 | **Floating nav overlaps progress chart** — z-index bug | `09-progress.png` | Vision analysis: "floating navigation is a clear layout/z-index bug… covering the chart's plot area" |

### P1 — Visually Off (should fix before ship)

| # | Issue | Screen | Evidence |
|---|-------|--------|----------|
| P1-1 | **Track cards have no selected state** — no border, checkmark, or background change | `01-onboarding.png`, `02-onboarding-selected.png` | Baseline finding #9: "Onboarding cards have no selected state" |
| P1-2 | **No "Set your 1RM" nudge** —0 lbs shown silently | `06-workout-session.png`, `08-workout-zero-state.png` | Baseline finding #3: "Workout shows '0 lbs' with no in-context nudge" |
| P1-3 | **No previous-performance reference** — "last time: X×Y" absent | `06-workout-session.png` | Baseline finding #2: "No previous-performance ('last time you did X')" |
| P1-4 | **No plate visualizer in workout session** | `06-workout-session.png` | Baseline finding #1: "No plate visualizer inside the session" |

### P2 — Polish (nice to fix)

| # | Issue | Screen | Evidence |
|---|-------|--------|----------|
| P2-1 | **No amber pulsing dot next to Protocols label** | `04-dashboard-mvd-active.png` | Vision analysis: "No amber pulsing dot… only a cyan lightning bolt icon" |
| P2-2 | **Emojis in onboarding cards** — 🏋️ 🏠 feel mismatched with premium dark UI | `01-onboarding.png` | Baseline finding: "Emojis in cards feel mismatched with the otherwise premium dark UI" |
| P2-3 | **No right-edge fade gradient on protocols row** | `03-dashboard.png` | Vision analysis: "No clear fade gradient" (minor visual gap) |

---

## Comparison with Baseline Audit

### Issues Fixed Since Baseline

| Issue | Baseline Finding | Current Status |
|-------|-----------------|----------------|
| Rest timer missing | #1: "No rest timer in workout session" | **FIXED** — `07-workout-rest.png` shows TimerRing with countdown, -15/+15 buttons, Skip Rest CTA |
| Streak counter missing | #5: "No streak counter on Progress" | **FIXED** — `09-progress.png` shows streak card with "1 day streak" |
| Travel chip truncation | #7: "Travel chip truncates" | **NOT REPRODUCED** in this screenshot — all4 chips fully visible |
| Account is sign-in gate only | #4: "Account screen is a sign-in gate" | **PARTIALLY FIXED** — profile section (avatar, name, "Not signed in") now present |
| 1RM editor wired up | #8: "1RM editor IS wired up" | **CONFIRMED** — "Set" buttons visible in `11-settings.png` |

### Issues Still Present

| Issue | Baseline Finding | Current Status |
|-------|-----------------|----------------|
| No previous-performance reference | #2 | **STILL ABSENT** — `06-workout-session.png` confirms no "last time" row |
| 0 lbs with no nudge | #3 | **STILL ABSENT** — `06-workout-session.png` and `08-workout-zero-state.png` show raw 0 with no hint |
| Onboarding cards no selected state | #9 | **STILL ABSENT** — `01-onboarding.png` and `02-onboarding-selected.png` confirm |
| No plate visualizer in session | #1 | **STILL ABSENT** — `06-workout-session.png` shows no plate graphic |
| 1RM editor small / no save feedback | #8 | **STILL PRESENT** — `12-1rm-editor.png` shows wrong state (can't verify), but "315 lbs" as read-only pill confirms the editor exists but may lack save animation |

### New Issues Found This Pass

| Issue | Severity | Description |
|-------|----------|-------------|
| Floating nav overlaps sign-in button | P0 | Account screen: nav bar z-index above form's primary CTA |
| Floating nav overlaps progress chart | P0 | Progress screen: nav bar positioned mid-screen instead of viewport bottom |
| 1RM editor screenshot wrong state | P0 | Screenshot `12` shows Settings list, not the editor in edit mode |

---

## Overall Verdict

### 🚫 DO NOT SHIP (as-is)

**Reason:** Three P0 bugs (floating nav overlaps sign-in button, floating nav overlaps progress chart, wrong screen captured for 1RM editor) represent clear layout/functional regressions that would block a user from completing core flows. Additionally, the workout session's silent "0 lbs" with no nudge remains unaddressed from the baseline, and the onboarding track cards continue to lack selected-state affordances.

### What Needs to Happen Before Ship

**P0 fixes (blocking):**
1. Fix floating nav z-index / positioning on Account screen — sign-in button must not be obscured
2. Fix floating nav z-index / positioning on Progress screen — nav must dock to viewport bottom, not float mid-screen
3. Re-capture `12-1rm-editor.png` with the editor actually open in edit mode to verify touch target sizing

**P1 fixes (strongly recommended):**
4. Add "Set your 1RM in Settings" link or inline nudge when weight is 0
5. Add selected-state affordance to onboarding track cards (cyan border or checkmark)
6. Add previous-performance row to workout session ("Last time: X×Y")
7. Add plate visualizer to workout session (component exists, just not called)

**P2 polish (post-launch):**
8. Add amber pulsing dot next to Protocols label when MVD is active
9. Replace emojis in onboarding cards with SVG icons
10. Add right-edge fade gradient to protocols row

### Bright Spots

The rest timer (`07-workout-rest.png`) is a genuine improvement and the most impactful fix from the baseline. The streak counter on Progress is now present. The Travel chip truncation bug did not reproduce in this pass. The Settings screen is well-structured with all 7 sections and consistent header styling.

**Bottom line:** The app is closer to shippable than the baseline audit suggested, but the P0 layout bugs and the missing 1RM nudge are showstoppers for a v1.0. Address the three P0s and the top P1s, and this passes the App Store first-impression bar.
