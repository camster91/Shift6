# Armor — Test Team Plan (Hermes agents as users)

**Date:** 2026-06-06
**Owner:** Cam (orchestrator) → me (planner) → 8 subagents (testers)
**Goal:** Before App Store submission, run 8 personas through 3 rounds of testing. The gauntlet catches what breaks; the testers catch what sucks.

## Why personas-as-agents

The audit catches mechanical issues (broken buttons, missing data, layout overflows). It does not catch:
- A 58-year-old first-time fitness user being confused by "RPE 7" on the workout screen
- A competitive lifter noticing the periodization engine is rounding to the nearest 5 lbs when Strong rounds to 2.5
- A parent who opens the app at 9pm, gets nagged by a workout reminder, and never comes back

The testers are AI agents, but each one carries a persona — age, fitness level, motivation, patience, vocabulary. They walk the app the way that persona would. They report what they find.

## The 8 personas (6 from USER_PERSONAS.md + 2 added)

| # | Name | Age | Profile | What they test for |
|---|------|-----|---------|-------------------|
| 1 | **Home Hero Hannah** | 28-35 | Bodyweight only, beginner, 20-30 min | Equipment accuracy, exercise variety, no-gym-required flow |
| 2 | **Gym Bro Gary** | 22-30 | Barbell gym 5-6×/week, intermediate-advanced | Plate visualizer precision, RPE, PR detection, 1RM math |
| 3 | **Hybrid Heather** | 30-40 | Gym 2-3×, home 2×, mixed experience | Per-workout track switcher, cross-track data flow, "use both" UX |
| 4 | **Busy Parent Pat** | 32-45 | Time-starved, interrupted, expresses mode | MVD protocol, rest-timer background survival, streak grace |
| 5 | **Senior Steve** | 55-70 | Beginner, accessibility, recovery | Text size, jargon, warmup flow, haptic intensity |
| 6 | **Athlete Alex** | 18-35 | Competition prep, periodization, explosive | Deload week math, peak/taper, PR detection, advanced tracking |
| 7 | **Returning Rita** | any | Used the app 3 weeks ago, hasn't opened it since | Sign-in flow, data persistence, "where was I" UX, "last time" surfacing |
| 8 | **First-Timer Finn** | any | Never used a fitness app, downloaded Armor on a friend's rec | Onboarding clarity, "what do I do first" guidance, empty states, jargon |

## The 3 rounds

Each persona runs the rounds in sequence. Each round produces a single markdown report. The orchestrator (me) consolidates all 24 reports into one `tester-findings-<date>.md` ranked by severity.

### Round 1 — Happy path (per persona, ~30 min)

The persona does what a normal user does in their first 2-3 sessions:

1. Open the app cold. Land on onboarding or sign-in.
2. Complete onboarding (or sign in if returning).
3. Land on the dashboard. Read the cycle progress. Try to start today's workout.
4. Do the workout — log every set, complete it.
5. Check the Progress tab. Try to understand what they see.
6. Open Settings. Look at the 1RM editor. Try to set 1RM.
7. Open Account. See what's there.
8. Sign out (or close the app).

**Output:** `tester-<n>-<persona>-round1.md` with:
- What worked
- What was confusing
- What crashed
- What felt off (visually, tonally, or behaviorally)
- Top 3 issues ranked by severity, each with: title, location (page + element), repro steps, expected vs actual, persona-specific impact

### Round 2 — Stress the edges (per persona, ~30 min)

The persona does the things a normal user does in week 2-4:

1. Sign up fresh (not sign in). Verify email flow if any.
2. Try "Forgot password" — even if the email doesn't exist, observe the error.
3. Set 1RMs for ALL 8 exercises (5 full_gym + 3 home_gym).
4. Switch tracks mid-workout (start a full_gym workout, switch to home_gym, complete it).
5. Toggle every modifier (MVD, High CNS Fatigue, Heavy Meal, Travel) and see what changes.
6. Do a workout with all 4 modifiers active at once.
7. Complete the workout. Verify the cycle advanced.
8. Go to Progress. See the workout you just did.
9. Toggle units (lbs/kg).
10. Try to delete your account. (Or export data, if delete is broken.)
11. Try a workout with no 1RMs set. What does the "0 lbs" state do?
12. Background the app mid-workout. Return 5 minutes later. Did the rest timer survive?

**Output:** `tester-<n>-<persona>-round2.md` with:
- Edge case behaviors (good and bad)
- Broken flows (sign-up, password reset, delete, export)
- Security concerns (any path that lets a user see another user's data, any missing rate limiting, any way to crash the server)
- Copy that confused the persona

### Round 3 — Competitor comparison (per persona, ~60 min)

The persona uses a competitor for 15 minutes, then returns to Armor:

1. Open **Strong** (or Hevy for the more advanced personas). Sign in.
2. Do one workout in the competitor. Note: how was the onboarding? what was the data model? how did logging feel? what did the plate visualizer do? what surprised you?
3. Open **Future** (if you have access — coach-based). Note: how does a coached app feel different? what does the accountability loop do?
4. Open **Apple Fitness+** (or **Google Fit**) for 5 minutes. Note: the OS-level integration angle.
5. Return to Armor. Open every tab. Take notes on:
   - What Armor does better than the competitor
   - What Armor does worse
   - What's missing that the persona did NOT notice until they used the competitor
6. Answer the final question: "Would I download Armor again? Why or why not? What's the one thing that would change the answer?"

**Output:** `tester-<n>-<persona>-round3.md` with:
- Feature gaps ranked by "would have noticed this without the comparison"
- Copy/tone gaps (Armor's "Train Through Chaos" vs Hevy's "Track. Plan. Progress.")
- The "would I download again" answer with reasoning

## The orchestrator's consolidation

After all 24 reports land, I:

1. Read every report (24 × ~500 lines = 12,000 lines)
2. Extract every distinct issue
3. Deduplicate (the "Travel chip truncation" will show up in 5+ reports)
4. Rank by severity:
   - **P0 (Critical):** crashes, data loss, broken core flow. Fix before App Store submission.
   - **P1 (High):** features work but feel wrong, copy that confuses, modals that don't close. Fix in v1.0.1.
   - **P2 (Medium):** polish, motion, missing keyboard shortcuts, copy polish. v1.1.
   - **P3 (Low):** nice-to-haves, backlog.
5. Group by component (WorkoutSession, Progress, Account, Settings, Onboarding, design system) for the fix pass
6. Write `tester-findings-<date>.md` with:
   - Executive summary (top 5 issues, total issue count by severity)
   - P0 list with full repro steps
   - P1 list (titles only, link to full report)
   - P2/P3 list (titles only)
   - Per-persona "would I download again" rollup
7. Surface to Cam with: total counts, top 3 issues, time estimate for the fix pass

## The persona prompt template

Each tester agent gets a self-contained brief. The brief is what the agent uses to BE the persona — not just check a checklist. The full template:

```markdown
# You are <Persona Name>

<2-3 paragraphs describing the persona in first person: who you are, why you're
opening Armor, what you expect, what would frustrate you, what you don't
care about.>

## Your environment
- Browser: Chrome on iPhone 14 (390×844 viewport)
- Live site: https://getshift6.com
- You have a real email you can sign up with (use a +tag alias like
  armor-tester-hannah@gmail.com so you can identify your account later)
- The app has a PWA install prompt — ignore it
- If the app asks for notifications permission, decline
- Don't use developer tools unless you're checking for JS errors in the
  console (which is encouraged — surface them in your report)

## Round <N>: <name>

<step-by-step instructions for what to do, in order. Each step is one user
action, not a checklist of internal states.>

For each step, write down:
- What you saw (literal description, not a fix)
- What you expected
- Anything that confused you, broke, or felt off
- If you see a JS error in the console, copy the error text and note the URL

## Output

Write your findings to `~/Shift6/docs/tester-reports/tester-<n>-<persona>-round<N>.md`.

Use this structure:

# <Persona> — Round <N>

## What worked
- ...

## What was confusing
- ...

## What broke
- ...

## What felt off
- ...

## Top 3 issues (ranked)
1. **<title>** — <page>, <element>
   - Repro: ...
   - Expected: ...
   - Actual: ...
   - Impact: <why this matters to <Persona>>

## Persona-specific notes
<anything else you'd want Cam to know about how this app feels to <Persona>>

## Verdict
<one paragraph: would I download this again? What's the one thing that would change the answer?>

## Critical rules

1. **You are a USER, not a developer.** You do not read source code. You do not
   check git history. You open the app and try to do things. If something
   confuses you, that's a finding. If the design is ugly to you, that's a
   finding. You don't propose fixes.

2. **You are not alone.** Other testers are running in parallel. Don't worry
   about deduplication — just report what you see. The orchestrator dedupes.

3. **Be specific.** "The settings page is bad" is useless. "I tapped the
   Barbell Squat 'Set' button on Settings and nothing happened" is a finding.

4. **Use the live site.** https://getshift6.com. Not localhost. The deploy is
   the build that ships.

5. **Time-box yourself.** Spend ~30 minutes on Round 1, ~30 on Round 2,
   ~60 on Round 3. If you run out of things to test, write "no more issues
   found in the time available" and stop.
```

## Execution sequence

**Before testers run:**
- 24 features shipped (4 streams, 4-6 weeks)
- Gauntlet passes 12/12
- Live site at getshift6.com is the version to be tested

**Day 1 — Setup**
- Create `~/Shift6/docs/tester-reports/` directory
- Generate the 8 persona briefs from this template
- Create the 8 individual test scripts in `~/Shift6/docs/tester-scripts/`
- Each script is a self-contained goal + context + toolsets for the subagent

**Day 2 — Round 1 (parallel)**
- Dispatch 8 subagents via `delegate_task` in a single batch
- Each runs the Round 1 script
- Each writes `tester-<n>-<persona>-round1.md`
- Wait for all to complete (~30-45 min real time)

**Day 3 — Round 2 (parallel)**
- Same pattern, 8 subagents, Round 2 scripts
- Wait for all to complete

**Day 4 — Round 3 (parallel)**
- Same pattern, 8 subagents, Round 3 scripts (includes competitor use)
- Wait for all to complete

**Day 5 — Consolidation**
- Read all 24 reports
- Write `tester-findings-<date>.md`
- Surface to Cam

**Day 6-7 — Fix pass**
- Dispatch fix workers per P0 issue (1-2 days)
- Re-run gauntlet after fixes
- Re-run affected tester scripts to confirm the fix

## What success looks like

After the tester team runs and the fixes land:
- Every P0 issue from the findings is resolved
- The re-run gauntlet passes 12/12
- The re-run of any affected Round 1/2 script shows the issue gone
- The "would I download this again" answers skew positive
- The 6 weeks of work + 1 week of testing is enough to ship v1.0.0 to the App Store

## What failure looks like (and how to handle it)

- **A tester times out at 900s without writing the report.** Per the `ship-fast-delegation` skill, check `git status` for partial work, then re-dispatch with a tighter scope.
- **A tester reports a bug that's actually a feature.** Surface to Cam. Don't fix without sign-off.
- **A tester reports a bug Cam already knows about.** Note it as "known, scheduled" in the consolidation, don't double-count.
- **A tester finds a critical security issue (auth bypass, data leak).** STOP. Surface to Cam immediately. Don't proceed to fix pass without Cam's review — security fixes may need a coordinated deploy.
- **8 testers produce 200+ issues total.** Don't panic. The consolidation ranks them. P0 list is the fix-pass scope. P1-P3 are backlog.

## Note on agent budget

The 8 testers running in parallel use 8 of the 7-worker budget. Per the
`ship-fast-delegation` skill, the budget is **total workers including main
chat**, so 8 is over cap. Two options:

1. **Run in 2 batches of 4.** Round 1 = testers 1-4, then testers 5-8. Takes 2x as long per round but stays within budget.
2. **Use background processes instead of `delegate_task`.** Each tester runs as a `terminal(background=true, notify_on_complete=true)` with its own playwright session. The orchestrator polls. 8 background processes are not subject to the worker cap because they're processes, not subagents.

I'll default to option 2 for the tester team — playwright is a long-lived process anyway, and per-test scripts are bounded, so background+notify is the right shape. The orchestrator polls 8 processes and consolidates when all 8 report done.
