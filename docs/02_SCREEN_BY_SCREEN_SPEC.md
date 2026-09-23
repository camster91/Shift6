# SHIFT6 — Screen-by-Screen Product Specification

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

The numbered inventory below predates #304 and is a broad feature inventory. The focused flow and screen/state issue map are in [the contract](25_GOAL_FIRST_RELEASE_CONTRACT.md). #307 simplifies onboarding to a chosen Shift and baseline; #308 centres Today; #310 focuses the session; #312/#315 provide review and return. Health, Coach setup and broad browsing cannot be prerequisites.


This is the canonical mobile information architecture. Screens may later merge, but each capability must remain represented.

## A. Launch & onboarding

### 1. Splash
Purpose: brand recognition and startup state.
Requirements: SHIFT6 mark, lightweight loading, offline detection, no unnecessary delay.

### 2. Welcome
Actions: Start free, sign in, continue as guest.
Explain six-week concept in one sentence.

### 3. Goal selection
Multi-select with one primary goal:
- general health;
- strength;
- muscle;
- conditioning;
- fat-loss support;
- mobility;
- athletic performance;
- healthy ageing;
- return to consistent training.

### 4. Experience
Beginner / intermediate / advanced, plus optional years training.

### 5. Equipment inventory
Searchable toggle groups: full gym, rack, barbell, plates, bench, dumbbells, kettlebells, cable stack, pull-up bar, bands, machines, cardio equipment, bodyweight only, custom equipment.

### 6. Schedule
Days/week, preferred days, typical session duration, preferred training time.

### 7. Movement considerations
Optional non-diagnostic questions: movements to avoid, current discomfort, pregnancy/postpartum selection only if app has vetted content, accessibility needs. Safety language required.

### 8. Units
Metric / imperial; mixed units configurable later.

### 9. Health connection
Optional Apple Health / Health Connect permissions. Explain each requested data type and why. Skip is equally prominent.

### 10. Coach setup
Tone: concise / supportive / technical.
Coach intervention: conservative / balanced / proactive.
Never infer medical conditions.

### 11. Recommended plan
Show 1–3 programs with fit explanation. Allow browse all or build custom.

### 12. Account
Create account, Apple/Google sign in, email, or remain guest. Guest data should be migratable to account.

## B. Home

### 13. Home dashboard
Above fold:
- greeting;
- current SHIFT6 cycle week/day;
- Today card with duration and primary workout;
- Start Workout CTA;
- coach note if relevant.

Below:
- weekly schedule strip;
- 6-week cycle progress;
- quick metrics (workouts, cardio minutes, sleep/steps only if connected);
- next session;
- recent PR or milestone;
- recovery/check-in entry.

### 14. Today detail
Full session preview, warm-up, expected time, equipment, modifications, coach notes.

### 15. Calendar
Month/week schedule, completed/skipped/moved sessions, drag or reschedule, cycle weeks visually grouped.

## C. Programs

### 16. Program library
Search + filters:
- goal;
- days/week;
- duration;
- experience;
- equipment;
- training style;
- home/gym;
- cardio included;
- mobility included.

### 17. Program detail
Hero, overview, target user, schedule, equipment, six-week progression preview, sample week, exercises, expected session length, start/duplicate/edit.

### 18. Current program
Cycle overview, week navigation, program notes, edit future sessions, pause/end cycle.

### 19. Program builder
Name, description, goal, cycle length fixed at six by default but templates can contain repeating structures, days, workout assignment, progression strategy.

### 20. Workout builder
Add/remove/reorder exercises; sections; supersets; circuits; cardio; warm-up; cooldown; target sets/reps/load/RPE/time/distance.

### 21. Template picker
Choose from common workout templates: full body, upper, lower, push, pull, legs, strength, hypertrophy, circuit, cardio, mobility.

### 22. Import/duplicate
Duplicate any editable program into My Programs. No modification of canonical templates.

## D. Exercise system

### 23. Exercise library
Search by name, movement, muscle, equipment. Filter by difficulty, unilateral/bilateral, compound/isolation, mobility, power, cardio.

### 24. Exercise detail
- media;
- setup;
- execution steps;
- breathing/bracing cues;
- common mistakes;
- muscles;
- equipment;
- alternatives;
- regression/progression;
- personal history;
- records;
- favourite.

### 25. Exercise substitution
During workout. Show best substitutes ranked by movement pattern, muscle target, equipment, and plan intent. Explain differences.

### 26. Custom exercise
User can create name, category, equipment, instructions, notes, media/photo optional. Custom exercises are private unless explicit sharing exists later.

## E. Active workout

### 27. Workout preflight
Start button, equipment check, warm-up, current readiness answer, estimated time.

### 28. Active workout
Must work offline.
Components:
- exercise card;
- previous performance;
- target;
- set rows;
- load/reps/time/RPE/RIR;
- complete set action;
- rest timer;
- notes;
- swap;
- reorder;
- add set;
- skip with reason;
- coach cue;
- progress through session.

### 29. Rest timer
Overlay/live activity where supported. Adjustable default by exercise category.

### 30. Plate calculator
Optional utility for barbell users. Supports bar weight and available plates.

### 31. Exercise media
Full-screen demo, written steps, audio off by default.

### 32. Workout pause/resume
Persist state locally. Survive app termination/restart.

### 33. Workout summary
Duration, sets, volume, PRs, cardio, subjective difficulty, pain/discomfort flag, notes, next-session preview.

### 34. Post-workout check-in
RPE, energy, soreness/discomfort, optional comment. Coach uses structured values.

## F. SHIFT6 progress

### 35. Cycle dashboard
The signature screen.
- week 1–6 timeline;
- adherence;
- key lifts;
- cardio minutes;
- total volume;
- confidence/effort trend;
- coach status;
- next review.

### 36. End-of-cycle review
Before/after metrics, highlights, problems, coach recommendations, user reflection, next cycle choices.

### 37. Strength progress
Exercise selector, e1RM estimate, heaviest set, rep PRs, volume, frequency, six-week overlays.

### 38. Training volume
Per muscle/movement/exercise with clear caveat that set counting is an approximation.

### 39. Cardio progress
Duration, distance, pace/speed, zones if available, weekly minutes.

### 40. Consistency
Training days, completion rate, reschedules. Avoid punitive streak emphasis.

### 41. Body metrics
Optional weight, circumference, body fat estimate with explicit uncertainty, progress photos stored privately.

### 42. Health trends
Optional connected data: steps, resting HR, HRV, sleep duration, workout heart rate. Only show claims supported by available data.

### 43. Records
PR history with filters and share card export.

## G. AI Coach

### 44. Coach home
Today's coach note, questions, pending proposals, weekly review status.

### 45. Coach chat
Conversational UI grounded in user-approved training data. Structured quick actions: explain plan, substitute exercise, shorten workout, adjust target, review progress.

### 46. Daily check-in
Energy, sleep perception, soreness, time available, motivation, discomfort. Coach may recommend but not silently modify.

### 47. Weekly review
Adherence, effort, progress, fatigue, next week. Explicit list of proposed changes.

### 48. Plan change proposal
Diff view:
- current;
- proposed;
- reason;
- expected effect;
- risks/trade-offs;
- accept all / accept selected / reject.

### 49. Plateau review
Triggered only after enough evidence. Distinguish insufficient data from plateau.

### 50. Cycle coach review
Six-week retrospective plus next-block proposal.

## H. Cardio, mobility, recovery

### 51. Cardio session
Mode, duration/distance, intensity target, heart-rate zone optional, live timer, manual and connected-device import.

### 52. Interval builder
Work/recovery intervals, rounds, warm-up/cooldown, audio/haptic cues.

### 53. Mobility session
Short routines by area and duration. No diagnostic claims.

### 54. Power/balance session
Jumps, throws where equipment exists, bike sprints, balance drills. Conservative defaults.

### 55. Recovery
Easy activity, mobility, sleep/steps context, subjective readiness. Avoid fake precision.

## I. Profile & settings

### 56. Profile
Cycle count, training history, goals, equipment, optional body metrics.

### 57. Equipment manager
Add/remove equipment and indicate home/gym locations.

### 58. Training preferences
Days, session duration, preferred exercise styles, disliked exercises, substitutions.

### 59. Health integrations
Apple Health / Health Connect permissions by data type, sync status, last sync, disconnect.

### 60. Notifications
Workout reminders, rest timer, weekly review, cycle review, coach messages. Granular control.

### 61. Accessibility
Text size guidance, reduced motion, haptics, audio cues, high-contrast option if needed.

### 62. Data & privacy
Export, delete account, download data, AI data use explanation, health-data controls.

### 63. About/help
FAQ, exercise disclaimer, contact, version/build, licences.

## J. System states required for every relevant screen

- skeleton/loading;
- first-use empty;
- offline;
- sync pending;
- sync conflict;
- partial data;
- permission denied;
- error with retry;
- account expired/auth refresh;
- accessibility large-text state.

No screen is considered complete without its system states.
