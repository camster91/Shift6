# Senior Steve QA — Loop 1

**Tester:** Steve (61, retired accountant, beginner)
**Environment:** iPhone 14 viewport (390×844), Chrome DevTools emulation
**App:** https://getshift6.com (Armor PWA)
**Date:**2026-06-06

---

## What Worked

- **Onboarding flow** — "Set up in 5 seconds" was inviting. Name entry and gym selection were clear.
- **Home Gym / Full Gym toggle** — Easy to understand, large tap targets, good visual distinction.
- **Button sizes** — Start button, modifier chips, nav tabs all large enough for a 61-year-old finger.
- **Daily Habits section** — "Single-Leg Stands," "Lunch Walk," etc. are plain-English, actionable, and don't require any fitness knowledge.
- **Settings → 1RM editing** — The stepper interface (+/- buttons) is beginner-friendly. Much better than a raw number field.
- **Cycle/Week progress bar** — Visual and simple. "Week 1 of 6" makes sense.
- **No JS errors in console** — App is technically stable.

---

## What Was Confusing

- **"1RM"** — Never explained anywhere in onboarding or dashboard. Tooltip promised but didn't appear on click.
- **"MVD"** — Acronym with no explanation. The shield emoji gives no clue it means "Microvascular Disease" or similar.
- **"High CNS Fatigue"** — Complete jargon. Daughter would have to explain this. No tooltip appeared on click.
- **"Heavy Meal"** — Slightly confusing: does it mean "I just ate a lot" or "the protocol for when you've eaten heavily"? Could mean either.
- **"Travel"** — Same issue. Protocol or status?
- **"VO2 Max"** — Used in workout names ("VO2 Max + Pull") but never explained. I don't know what it measures or why it matters.
- **"@ 68%"** — On the workout card: "3×8 @ 68%". What is 68% of? A percentage of what?
- **"Base" phase label** — Appears repeatedly ("Strength · Base", "⚡ Base") but I don't know what makes this "Base" vs. something else.
- **The 5 workout previews on onboarding** — "Heavy Goblet Squats," "VO2 Max + Pull," etc. I had no idea what I was picking.

---

## What Broke

1. **Start button is completely dead** — Clicked it5+ times on the dashboard. No workout session ever launched. No error, no navigation, no feedback. The button has no `onclick` handler wired up. This is a **critical blocker** — a new user cannot start a workout at all.

2. **kg/lbs toggle doesn't work** — Clicked "kg" button in Settings. Values stayed in lbs. The toggle may have visually changed state but the unit conversion or display update is broken.

3. **Modifier tooltips promised but not delivered** — The5-fix changelog mentioned "jargon tooltips." Clicking MVD, High CNS Fatigue, Heavy Meal, and Travel produced zero tooltips, popups, or explanations. The feature appears to not be implemented yet.

4. **"155lbslbs" double-suffix bug** — The TOP1RM stat card reads "155lbslbs" — clearly a template error where "lbs" is concatenated twice.

5. **Onboarding "Begin with Home Gym defaults" button also dead** — Both primary CTAs on the onboarding final screen failed to navigate. I got through only by using the browser console to force-click the button.

---

## What Felt Off

- **The app looks "for fit people"** — Dark theme, crossed-swords logo, jargon everywhere. Subtext is dim gray and hard to read. Doesn't feel like a space designed for a61-year-old beginner.
- **No end-workout confirmation** — The changelog promised this fix, but I couldn't test it because the workout never started.
- **No0-lbs nudge visible** — The changelog promised a "0-lbs nudge" but I couldn't find a specific nudge card for when no weight is set. The workout just shows "65 lbs" without explaining where that number came from or what to do if I have no weights.
- **The1RM defaults seem pre-populated (95 lbs for Goblet Squat)** — I never set this. If these are defaults, there's no explanation of what they mean or that I can change them.
- **"Or skip — use both tracks"** — On the onboarding screen, the secondary option text implies there are two tracks but I have no idea what they are or why I'd want both.

---

## Top 5 Issues Ranked by Severity

| # | Severity | Issue | Impact |
|---|---|---|---|
| 1 | **Critical** | Start button has no click handler | User cannot start ANY workout |
| 2 | **High** | kg/lbs toggle doesn't function | International users can't use their preferred unit |
| 3 | **High** | Jargon tooltips not implemented | MVD, CNS, VO2 Max remain unexplained for beginners |
| 4 | **Medium** | "155lbslbs" display bug | Looks broken; erodes trust in data accuracy |
| 5 | **Medium** | Onboarding CTA buttons non-functional | Users may get stuck after setup and never reach the dashboard |

---

## Would I Download This App?

**No.**

The app looks promising and the daily habits are genuinely accessible, but the Start button doesn't work. I can't do a single workout. Combined with unexplained jargon (1RM, MVD, CNS, VO2 Max) and a dark, techy aesthetic that feels like it's built for gym bros, not a61-year-old beginner — I'd put it back in the app store and look for something simpler.
