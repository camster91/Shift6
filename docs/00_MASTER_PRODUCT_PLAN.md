# SHIFT6 — Master Product Plan

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

The first focused journey is goal → typed baseline → today's offline-capable session → comparable measured progress → interruption/re-entry → optional Week 6 test and review → maintain, repeat, adjust, another goal or planned break. One primary Shift; six weeks is review, never a guaranteed outcome. The existing broad sections describe later capability unless listed as focused-v1 in the [contract](25_GOAL_FIRST_RELEASE_CONTRACT.md).


## 1. Vision

SHIFT6 is the long-term fitness app a user should not need to replace. It should serve beginners, experienced lifters, busy adults, home-gym users, commercial-gym users, runners, cyclists, people focused on mobility and healthy ageing, and users who simply want a clear sustainable plan.

The central product mechanic is the **SHIFT6 Cycle**: every active program is organized into six-week blocks with a clear starting baseline, weekly progression, fatigue management, adherence tracking, and an end-of-cycle review that informs the next block.

SHIFT6 should feel like a calm expert coach, not a gamified guilt machine.

## 2. Product principles

1. **Clarity before complexity.** The home screen answers: what am I doing today, how long will it take, and what changed?
2. **Six weeks is the unit of progress.** Daily workouts matter, but the app frames progress in six-week blocks.
3. **User owns the plan.** Any curated or AI-generated plan can be edited.
4. **AI proposes; the user approves.** The coach does not silently rewrite training.
5. **Offline first for workouts.** Logging must work in a basement gym with no signal.
6. **Health, not punishment.** No shame language, streak-loss guilt, or reckless progression.
7. **Evidence-aware.** Strength and conditioning recommendations should be conservative and explainable.
8. **Private by default.** Health data is not advertising data.
9. **Free core product.** At launch, training plans, logging, exercise library, progress, custom programming, and baseline AI coaching are free.
10. **Accessible by design.** Large text, reduced motion, colour contrast, VoiceOver/TalkBack, and non-colour status cues are first-class.

## 3. Core personas

### Beginner
Needs confidence, simple setup, technique help, realistic progression, and low cognitive load.

### Busy adult
Needs 20–45 minute sessions, equipment-aware substitutions, schedule flexibility, and clear next actions.

### Intermediate lifter
Needs custom programming, RPE/RIR, volume tracking, estimated 1RM, progression logic, and exercise history.

### Home-gym user
Needs equipment inventory, alternatives, barbell/dumbbell/band/bodyweight plans, and minimal setup changes.

### Cardio + strength user
Needs running/cycling/swimming or generic cardio sessions integrated with lifting and recovery.

### Healthy-ageing user
Needs strength, power, balance, mobility, aerobic work, conservative progression, and clear safety language.

## 4. Main product areas

### Today
Today's workout, readiness/check-in, coach note, warm-up, active cycle status, reminders, quick substitutions.

### Programs
Curated library, program recommendations, current plan, program builder, templates, imports/duplicates, custom schedules.

### Workout
Exercise sequence, sets/reps/load/RPE/RIR, timers, notes, supersets/circuits, swaps, warm-ups, cardio blocks, completion summary.

### Exercises
Hundreds of exercises with searchable metadata, equipment, movement pattern, muscles, instructions, cues, common mistakes, alternatives, media, history.

### Progress
Six-week cycle scorecard, strength trends, volume, estimated 1RM, cardio, mobility, consistency, body metrics, health signals, personal records.

### Coach
AI PT conversation, daily check-in, weekly review, cycle review, plateau detection, adaptation proposals, explanations, goal changes.

### Health
Optional Apple Health / Health Connect data: steps, workouts, heart rate, resting HR, HRV where available, sleep where available, weight/body metrics where supported.

### Profile & Settings
Units, equipment, training days, goals, experience, accessibility, notifications, health permissions, data export/delete, privacy, coach preferences.

## 5. SHIFT6 cycle lifecycle

### Before week 1
- choose goal;
- choose or build program;
- set training days and session duration;
- select equipment;
- record baseline working weights/reps or complete an introductory calibration;
- choose progression style;
- optionally connect health data;
- coach explains the block.

### Weeks 1–2 — establish
Emphasize technique, repeatability, conservative effort, and accurate logging.

### Weeks 3–4 — progress
Increase load, reps, density, duration, or complexity only when completion and effort data support it.

### Week 5 — productive challenge
Highest intended training stimulus for many general plans while still keeping reserve and safety limits.

### Week 6 — consolidate and review
Program-specific choice: slightly reduced volume, performance checks, rep PRs, technique review, or normal training followed by cycle assessment. The app should not assume every user needs a classic deload.

### End-of-cycle review
Display:
- adherence;
- completed sessions;
- strength changes;
- rep/load PRs;
- cardio changes;
- total training volume;
- perceived effort trend;
- pain/soreness flags;
- readiness/recovery trend where available;
- user feedback;
- coach recommendations.

User then chooses: repeat, progress, modify, change goals, or select a different program.

## 6. Free-launch scope

### Required for first public release
- iOS and Android;
- guest/local training; accounts and sync only if exact-build evidence supports them;
- goal-first onboarding and a comparable or explicitly deferred baseline;
- approximately three reviewed pilot Shifts; the historical 20-program catalogue is a future expansion;
- every enabled pilot exercise reviewed; 300+ reviewed exercise records remain a future catalogue target;
- relevant equipment and safe substitutions;
- active workout logging;
- rest timers;
- offline workout completion;
- honest six-week review, optional assessment and next choice;
- measurement progress separate from adherence, plus pause and re-entry;
- local export/delete and accurate guest recovery explanation;
- accessibility baseline;
- privacy-safe measurement if enabled, with exact binary/native release evidence.

Custom builders, broad exercise search, Health integrations, provider-backed Coach, accounts/sync,
advanced metrics and reminders remain gated supporting work or future breadth. None is required to
complete the core Shift lifecycle. See [the release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md).

### Post-launch expansion
- Apple Watch companion;
- Wear OS companion;
- richer live activity / lock-screen timers;
- coach voice mode;
- nutrition/protein/hydration modules;
- social/community features only if they improve adherence without harming privacy;
- trainer/client mode;
- advanced readiness models;
- device integrations;
- richer exercise video library;
- localization.

## 7. Non-goals for launch

- diagnosis or treatment of medical conditions;
- rehabilitation prescriptions;
- medication or insulin dosing advice;
- fully autonomous plan changes without confirmation;
- calorie-burn claims presented as precise truth;
- public social feed;
- ads based on health behaviour;
- complex marketplace or subscription gating.

## 8. Product language

Preferred language:
- “Next step” rather than “You failed”.
- “Cycle progress” rather than obsession with streaks.
- “Suggested adjustment” rather than “AI changed your plan”.
- “Training readiness” only when enough data exists; otherwise “How are you feeling today?”
- “Estimate” on e1RM, calories, readiness, and similar derived metrics.

## 9. North-star product metrics

Primary:
- percentage of new users who complete first workout;
- percentage reaching week 2;
- percentage completing a six-week cycle;
- percentage starting a second cycle;
- weekly completed workouts per active user;
- custom-program save rate;
- accepted vs rejected coach changes.

Guardrails:
- injury/pain reports after coach changes;
- sync failures;
- workout-log data loss;
- health-permission abandonment;
- accessibility defects;
- excessive notification disablement;
- AI responses blocked by safety rules.

## 10. Initial flagship program

The conversation that triggered this rebuild becomes a launch program: **Barbell 30 — Strength + Conditioning for Life**.

Schedule:
- Monday: squat + bench + row + pull-up/core;
- Wednesday: deadlift + overhead press + unilateral legs + row + calves/core;
- Friday: squat + bench volume + RDL + row/pull-up + core;
- Tuesday/Thursday: 30–45 minute easy/moderate cardio;
- Saturday: optional active day;
- Sunday: rest.

It should support substitutions, session shortening, gym equipment constraints, and 6-week progression.
