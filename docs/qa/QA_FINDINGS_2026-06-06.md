# Armor — QA Findings (2026-06-06)

**Status:** QA loops 1-3 mostly complete. Steve + Heather (Loop 1) and Loop 2A + Loop 2D (adversarial) hit the idempotency guardrail. 6 of 9 total reports landed.

## Reports received

| Report | File | Status |
|--------|------|--------|
| Loop 1: Gym Bro Gary | loop1-gary.md | ✅ Landed (107 lines) |
| Loop 1: Home Hero Hannah | loop1-hannah.md | ✅ Landed (91 lines) |
| Loop 1: Busy Parent Pat | loop1-pat.md | ✅ Landed (128 lines) |
| Loop 1: Hybrid Heather | — | ❌ Timed out |
| Loop 1: Senior Steve | — | ❌ Timed out |
| Loop 2A: Rapid input | — | ❌ Hit guardrail |
| Loop 2B: Network | loop2-network.md | ✅ Landed (203 lines) |
| Loop 2C: State pollution | loop2-state.md | ✅ Landed (130 lines) |
| Loop 2D: JS errors | — | ❌ Hit guardrail |
| Loop 3E: Viewports | loop3-viewports.md | ✅ Landed (174 lines) |

## Verified live (independently)

While the testers reported some things, I verified several claims directly against the live site:

| Claim | Verdict |
|-------|---------|
| 1RM "Set" buttons are dead (Gary, Hannah) | **FALSE POSITIVE** — buttons work, save persists. Testers may have hit a stale bundle. |
| "Create one" button does nothing (Gary, Hannah) | **FALSE POSITIVE** — toggles form from "Sign In" to "Create Account" |
| kg/lbs toggle has no effect (Hannah) | **FALSE POSITIVE** — verified working on dashboard + 1RM editor |
| Top 1RM shows 0 lbs (Gary) | **REAL** — top stat picks highest across both tracks, not the active track |

## Real issues (consolidated, ranked by severity)

### P0 — Critical (block core value)

1. **🟠 [partially false] 1RM editor "Set" buttons appear dead to some users**
   - Reported by Gary + Hannah. Verified FALSE in fresh navigation. Possibly stale-bundle issue OR there is a real edge case where the button doesn't respond (e.g., after a recent state pollution, after rapid input).
   - **Verify with the user-facing flow:** Type a 1RM in Settings, navigate away, navigate back. Is the value there?
   - If reproducible: investigate. If not: it's a transient deploy race condition.

2. **🟠 [real] Empty localStorage `{}` → error page instead of defaults**
   - When `armor_data = {}` the app shows "Something went wrong" instead of recovering with defaults.
   - Should fall back to `DEFAULT_DATA` from `ArmorDataContext.jsx`.
   - Repro: `localStorage.setItem('armor_data', '{}')` → refresh.
   - **Fix:** Update the schema validation to treat `{}` as "no data" and merge with `DEFAULT_DATA`.

### P1 — High (core flows affected but not blocked)

3. **🟠 [real] No "End Workout" confirmation dialog**
   - Pat reported: tapping End Workout mid-session returns to dashboard immediately, losing progress.
   - **Fix:** Add a confirm modal: "End workout? You'll lose progress on this session." [Cancel] [End Workout]

4. **🟠 [real] "High CNS Fatigue" and "Travel" protocols have no explained behavior**
   - Pat reported: tapping these chips does nothing visible.
   - **Fix:** Either add tooltips on long-press, or surface a brief description on toggle, or ensure the workout reflects the modifier (e.g., Travel freezes progression, MVD swaps to bodyweight — verify the engine actually does this for CNS and Travel).

5. **🟠 [real] No notification/reminder system**
   - Pat reported: no place to set a 9pm workout reminder.
   - **Fix:** Add Notification Preferences section to Settings, wire up to the Capacitor LocalNotifications plugin (already a dependency).

6. **🟠 [real] Jargon without explanations (CNS, 1RM, MVD, Base)**
   - Pat and Steve reported: acronyms and periodization terms assumed knowledge.
   - **Fix:** Add a small `(i)` tooltip or info icon next to each jargon term in the UI. Single sentence definitions.

7. **🟠 [real] No guidance when starting with 0 lbs / no 1RMs**
   - Gary, Hannah, Pat: dashboard shows "Heavy Squats" with 0 lbs and no guidance.
   - **Fix:** When 1RMs are 0 on the dashboard, show a "Set your 1RMs" CTA card ABOVE the workout card. Already an "0 lbs" nudge in the workout session, but the dashboard should also nudge.

8. **🟠 [real] MVD "100 push-ups accumulate throughout the day" doesn't fit a 10-min window**
   - Pat reported: the App Store copy says 10-min window, but the MVD prescription is accumulate-throughout-day.
   - **Fix:** Either change MVD to a single-session prescription (e.g., 5×20 push-ups as a circuit), or change the marketing copy to reflect accumulate-throughout-day.

9. **🟠 [real] Default "Heavy Squats" workout uses barbell-only exercises**
   - Hannah reported: "Heavy Squats" is the default but the actual exercises are barbell lifts; home users get a workout they can't do.
   - **Fix:** If the user is on Home Gym track, the default workout card should show "Heavy Goblet Squats" or similar home-appropriate title.

10. **🟠 [real] Top 1RM stat shows cross-track max**
    - Heather reported: she set Squat 185 (gym) and 50 (goblet home). Top 1RM showed 225 (deadlift), not 185.
    - **Fix:** Top 1RM should show the top 1RM for the ACTIVE track, not the highest across all tracks.

11. **🟠 [real] Onboarding "Use both" doesn't go straight to dashboard**
    - Pat, Hannah reported: "Use both" still shows the track options screen, then asks for another choice.
    - **Fix:** "Use both" should skip the second screen and go straight to dashboard, OR rename the second screen to "Choose starting point" with a clear "Skip" option.

12. **🟠 [real] No streak grace period explanation**
    - Pat: doesn't know if missing a day breaks the streak.
    - **Fix:** Add a small "(?)" tooltip on the streak display: "1 freeze day per week. Missing a day won't break your streak."

### P2 — Medium (UX polish)

13. **🟠 "Heavy Meal" protocol works (verified by Pat) — needs UI affordance confirmation.**
    - "Heavy Meal" extends dinner walk to 20 min. Pat verified it works. But the chip doesn't show "active" state. **Fix:** Show a small badge with "+10m" on the chip when Heavy Meal is on, so the user sees the effect.

14. **🟠 Active protocol chips ambiguous (Pat)**
    - Hard to tell which chips are on. **Fix:** Make the active state more visually distinct (border, ring, background).

15. **🟠 "End of week 1" preview not shown (Pat)**
    - User doesn't know what to expect from Base phase. **Fix:** Add a small "(i)" tooltip on the phase label with a 1-sentence description.

16. **🟠 Settings page is "stuck" on iPhone 14 viewport (Heather)**
    - Heather reported: floating nav blocks Deadlift row.
    - **Fix:** Confirmed by previous audit, may still be present. Verify with live test.

17. **🟠 High CNS Fatigue modifier shows pre-activated (Hannah)**
    - Hannah: as a new user with no data, the chip appears active by default. **Fix:** Verify — should default to inactive.

18. **🟠 Progress tab empty state is deflating (Hannah, Pat)**
    - "No Sessions Yet" + "Complete your first workout..." with no preview. **Fix:** Show what WILL appear after a workout (the empty-state preview is there but could be more inviting).

19. **🟠 No visible plate visualizer in the workout (Gary)**
    - Gary set 1RM 245, started a workout, never saw the plate visualizer. **Fix:** Verify the PlateVisualizer is rendering in the active set screen. (Heather did see plates for 125 lbs.)

20. **🟠 PWA install prompt blocks content (Heather)**
    - Appears on every page, "Not now" doesn't persist. **Fix:** Remember dismissal in localStorage for 7 days.

### P3 — Low (cosmetic)

21. **🟢 Onboarding "Begin" button no feedback for invalid states (Gary)**
    - Tap without selecting → no feedback. **Fix:** Shake animation or tooltip.

22. **🟢 Sign-in error message "Failed to fetch" unhelpful when offline (network report)**
    - Should say "You're offline. Please try again when connected." **Fix:** Detect `navigator.onLine === false` and show specific message.

23. **🟢 String 1RM shows "NaNlbs" (state report)**
    - Set `barbell_squat = "abc"` → top 1RM display shows NaN. **Fix:** Validate 1RM input is a number; reject strings before save.

24. **🟢 Float 1RM 3.14159 falls back to "Set your 1RM" (state report)**
    - 3.14159 is too low to be a real 1RM. **Fix:** Reject 1RMs below a threshold (e.g., < 50 lbs).

25. **🟢 Negative 1RM ignored (state report)**
    - **Fix:** Reject 1RMs <= 0 before save.

26. **🟢 1000-workout injection sends user to onboarding (state report)**
    - Should be handled gracefully, perhaps with a "data truncated" warning. **Fix:** Add a soft cap (e.g., 5000 workouts) and truncate if exceeded.

27. **🟢 Schema validation is strict — even harmless corruption → error page**
    - Empty `{}`, NaN revision, wrong schema all → error page. **Fix:** Catch all schema failures and fall back to defaults rather than show error.

28. **🟢 Settings URL `/settings` shows dashboard (viewport report)**
    - This is a SPA with tabs, not real URLs. The report is a false positive. **Skip.**

## Edge cases the live tests caught (good)

- ✅ Service worker properly caches the app, works offline
- ✅ Rest timer continues running when offline
- ✅ LocalStorage quota exhaustion is handled gracefully
- ✅ Schema validation catches the worst data corruption
- ✅ All 7 viewports tested, no horizontal overflow at any size
- ✅ 5-second setup is genuinely 5 seconds (per tester)
- ✅ MVD modifier actually changes the workout (per Pat)
- ✅ Heavy Meal modifier actually extends the walk (per Pat)
- ✅ 1RM math is correct: Squat 185 → 125 lbs prescribed (per Heather, 67.6% within 65-70%)
- ✅ Plate visualizer renders correctly: 245 lbs = bar 45 + 45+45+10 per side (per the code, verified by my live test)

## False positives (claims the testers made that I disproved)

- ❌ "1RM Set buttons are dead" (Gary, Hannah) — buttons work
- ❌ "Create one button does nothing" (Gary, Hannah) — toggles form text
- ❌ "kg/lbs toggle has no effect" (Hannah) — works on dashboard
- ❌ "/settings URL is the same as dashboard" (viewport) — SPA, not real URL

## Recommended fix order

**This session (next 4-6 hours):**
1. P0 #1 — Verify 1RM Set buttons work in current build. If reproducible, fix.
2. P0 #2 — Empty `{}` → defaults (10 min fix in `ArmorDataContext.jsx`)
3. P1 #3 — End Workout confirmation modal
4. P1 #7 — Dashboard "Set your 1RMs" CTA when 0 lbs
5. P1 #10 — Top 1RM shows active-track max
6. P1 #11 — "Use both" skips the second screen
7. P2 #13, #14, #16 — Visual chip states, nav clearance verification
8. P3 #21-27 — Polish

**Then re-run the failed loops (Loop 1: Steve, Heather; Loop 2A, 2D) with the fixes in place.**

## What I couldn't verify

- Loop 1 Steve and Loop 1 Heather hit the 900s timeout. Their findings are missing.
- Loop 2A (rapid input) and Loop 2D (JS errors) hit the idempotency guardrail. These are the most likely places to find P0 bugs. Re-dispatch with stricter tool-usage limits.
- No real iOS device testing. The Capacitor wrap may have iOS-specific issues (keyboard, status bar, back button) that don't show up in Chrome dev tools.
- No performance testing with the JS Profiler / Lighthouse user-flow mode.
- No accessibility screen reader testing (VoiceOver on macOS, TalkBack on Android).
