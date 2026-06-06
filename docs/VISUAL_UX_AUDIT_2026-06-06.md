# Armor — Visual + UX Audit (2026-06-06)

Walked every screen on the live PWA at getshift6.com (iPhone 14 viewport, 390×844). Compared to Strong, Hevy, Future, Apple Fitness+.

**Live verification pass (2026-06-06 PM):** Clicked through every screen, opened the 1RM editor, started a workout. Found 3 of the original "Top 10" findings were false positives caused by vision model misreads. Corrected list below.

## Overall verdict

The app is **architecturally complete but visually and functionally thin.** Dark theme, custom typography, and a real periodization engine are there. But every screen feels like a developer's MVP: empty states with no preview of what fills them, a workout session missing rest timer + previous-performance reference, and an Account screen that's a sign-in gate instead of an account.

**The brand promise ("5 Pillars of Longevity", "Train Through Chaos") outruns the product.** The app delivers on the 5-day split and contingencies. It does not deliver on VO2max as a first-class experience, daily habits beyond checkboxing, or a progress screen that makes a 6-week commitment feel rewarding.

---

## Screen-by-screen

### 1. Onboarding (current: single screen)
**Works:**
- Clean single-column layout, cyan accent consistent with brand
- "Set up in 5 seconds" copy sets the right expectation
- Touch targets well above 44pt

**Broken / weak:**
- No progress indicator. The copy says "5 seconds" but multi-step is implicit.
- No selected state on the Full Gym / Home Gym cards — and the CTA offers a third path ("Use both"). Relationship between cards and button is ambiguous.
- Emojis (🏋️ 🏠) in cards feel mismatched with the otherwise premium dark UI.
- No "Skip" affordance despite the subhead implying name is optional.
- Button not pinned to the bottom — risk of clipping on short viewports.

### 2. Dashboard (Today tab)
**Works:**
- Strict top-down hierarchy: greeting → cycle progress → protocols → track switcher → workout card → habits → stats
- 6-segment cycle progress bar with phase label is the visual anchor
- Plate visualizer implied to be there (per the code) but not visible in this state

**Broken / weak:**
- 🔴 **"Travel / Vacation" chip truncates** at right edge of container (reads "Travel /1" in vision). Classic `flex-wrap` / overflow bug. This was supposedly fixed in commit `c5fd6301` (`fix: prevent modifier protocol chips from shrinking/wrapping`) but the bug is live.
- "0/4" daily habit count next to a list of unchecked items is deflating as first impression.
- The QuickStat tiles ("0 lbs / Top 1RM") show 0 because no 1RMs set — also deflating.
- The bottom tab bar (Today/Progress/Account/Settings) sits over the habit list on smaller viewports. Not a regression but the visual offset looks unrefined.

### 3. Workout Session
**Works:**
- Header close button + workout title + week/day metadata
- Sets/Reps/Weight card is the only data surface — clear focal point
- Cyan "Complete Set" button is dominant, action-oriented

**Broken / weak:**
- 🔴 **No plate visualizer inside the session.** The `PlateVisualizer` component exists (`src/components/PlateVisualizer.jsx`, 26-line SVG renderer per skill) and the `armor-v3` skill says it ships in the workout session. It is NOT rendering here. The session is showing Leg Press (an accessory) with 0 lbs because no 1RMs are set, and the bar+plates graphic is missing.
- 🔴 **No rest timer.** Auto-starts on set complete in Strong, Hevy, Future. Not present.
- 🔴 **No previous-performance reference** ("last time: 135×10"). This is Strong/Hevy's #1 retention feature.
- No per-set list — the model is "one set at a time" rather than a table the user can scan. Slower logging.
- No +/- weight steppers (`+5 / +10`). User has to type.
- "0 lbs" with no 1RMs set means the math is invisible. User has to go to Settings → set 1RMs → come back. Friction.
- "End Workout" is a low-emphasis gray text link. Should be a confirmed destructive action.

### 4. Progress
**Works:**
- Empty state with trophy icon + helpful copy ("Complete your first workout to see your progress here")
- Active tab treatment is accessible (not just color — uses background highlight)

**Broken / weak:**
- 🔴 **Empty state has no preview of what will populate.** No skeleton chart, no "your week-1 base phase starts now" hook. Users don't know what they're working toward.
- 🔴 **No streak counter.** This is the most basic retention tool in any fitness app.
- No volume/weight/reps history chart at all (because no data).
- No 6-week milestone system. The "Heavy → Peak → Deload" arc is the unique value prop — and the Progress screen ignores it.
- No PR detection surfacing. `usePRDetection` hook exists (26 lines) but no consumer.

### 5. Account
**Works:**
- Clean sign-in card, two fields, single CTA
- Reassurance copy ("Local data is always safe", "Revision counter — no data loss from conflicts")
- Last built on June 6 version stamp

**Broken / weak:**
- 🔴 **This is a sign-in gate, not an Account screen.** No avatar, no name, no sync status, no device list, no subscription state, no data export.
- No "Forgot password?" link.
- No SSO (Apple, Google). For an iOS-first app, missing Sign in with Apple is an App Store flag.
- No "Continue without account" CTA visible. The copy says local data is safe, but the user has to dismiss the gate.
- No data export, no delete account, no notification preferences. GDPR/CCPA 101.

### 6. Settings
**Works:**
- Equipment Track toggle (Full Gym / Home Gym)
- Theme switcher
- Current Cycle read-out
- Reset All Data (destructive action)
- Version stamp
- **1RM editor IS wired up** — clicking "Set" opens an inline number input with a save button. ✅ Verified live.
- **Section headers exist** — "🏆 FULL GYM" and "🏠 HOME GYM" with icons group the exercises by track. ✅ Verified live (the original audit screenshot had the bottom nav occluding the Home Gym header).

**Broken / weak:**
- 🔴 **"Set" inline editor is easy to miss** — it's a 20-character-wide number input. A modal would be more discoverable.
- 🔴 **No visual feedback when a 1RM is saved** — the row just snaps back to the "Set" / "X lbs" state. No toast, no checkmark, no animation.
- Profile "Name" row shows "Athlete" — likely a placeholder literal, not editable inline.
- No units toggle (lbs/kg is hardcoded).
- No notification preferences, no workout time preference, no audio cues toggle.
- No data export, no analytics opt-out, no contact support.
- No link to privacy policy or terms of service.

---

## Top 10 issues ranked by user impact (REVISED after live verification)

1. **No rest timer in workout session** — every competitor has it. Looks amateur without it. Highest impact, biggest retention driver.
2. **No previous-performance ("last time you did X")** — Strong/Hevy's #1 retention feature. Not in the code at all.
3. **Workout shows "0 lbs" with no in-context nudge to set 1RMs** — the dashboard and Settings should cross-link; right now they're disconnected.
4. **Account screen is a sign-in gate, not an account screen** — no profile, no sync status, no subscription, no data export.
5. **No streak counter on Progress** — `streakData` is computed in context but no UI surfaces it.
6. **No Progress charts** — empty state with no preview of what fills it.
7. **Travel chip truncation** — visible regression, the supposed fix didn't ship.
8. **1RM editor inline input is small and gives no save feedback** — wired up but easy to miss and no confirmation animation.
9. **Onboarding cards have no selected state** — ambiguous which is the right choice.
10. **No kg/lbs toggle** — hardcoded to lbs, blocks international users.

---

## The 5-7 missing UI primitives (build once, refactor everywhere)

Per the `react-spa-design-system-enforcement` skill. The codebase has 3 components (Celebration, ErrorBoundary, PlateVisualizer) and no `src/components/ui/` directory. Pages reinvent the same patterns:
- "Card" appears as `armor-surface-1` or `bg-white/[0.02]` in 6+ places with different padding
- "Button" is `<button className="armor-press rounded-...">` in 4+ variants across pages
- "Stat tile" is hand-coded in the dashboard and the empty Progress state
- "Page header" (h1 + subtitle) is unique per page

**Build these 7:**
1. Card (variants: padded, interactive, with header slot)
2. CardHeader (title + description + action)
3. PageHeader (h1 + count chip + description + actions)
4. Button (5 variants × 3 sizes, loading state, forwardRef)
5. StatTile (icon + value + label + optional trend)
6. EmptyState (icon + title + description + primary action) — the Progress screen already has a use case
7. SectionHeader (icon + label + count + action)

After that, the 6 pages lose 500-1500 lines and stop reinventing styling.

---

## What I'd ship first (proposed order)

**Week 1, in order:**
1. Fix 1RM editor — wire the "Set" buttons to an actual modal, group by track with headers. 2-3 days.
2. Add plate visualizer to the workout session (it exists, just isn't being called). 1 day.
3. Add rest timer with haptic. 2 days.
4. Add previous-performance ("Last time: 135×10") to the session. 1 day.
5. Fix Travel chip overflow regression. 15 minutes.

**Week 2:**
6. Build the 7 UI primitives + refactor the 6 pages to use them.
7. Streak counter + session count + simple volume chart on Progress.
8. "Last time" inline reference in Settings (so the 1RM editor isn't just a number field).

**Week 3:**
9. Account screen rewrite — show profile, sync status, subscription tier, data export.
10. Onboarding cards get selected state + "Skip" link.

That's roughly the Phase 0 + 1 from the shipping plan, scoped to the visual ceiling. After this Armor should pass the App Store first-impression bar.

---

## Honest assessment

The bar to ship to the App Store in Health & Fitness is **high**. Strong, Hevy, Future, Apple Fitness+, and Peloton are all polished to a degree the current Armor is not. You can ship a v1.0.0 and get approved, but you'll get 1-2 star reviews saying "feels like a beta" within the first week.

The 3-week scope above gets Armor from "developer MVP" to "shippable indie fitness app." It's enough to get 4-star reviews and early traction. The HealthKit integration, social features, and 25-exercise library come in v1.1+ once you have user feedback to drive the priorities.
