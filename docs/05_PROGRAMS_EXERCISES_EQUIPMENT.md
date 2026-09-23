# SHIFT6 — Programs, Exercises & Equipment

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

The enumerated 20-program catalogue and 300+ exercise target are retained as implementation history and future breadth. #309 selects approximately three representative reviewed rep, timed and Barbell/strength Shifts; exact public IDs are pending. [The release manifest](../content/release-manifest.json) and per-record human review, not counts, control focused-v1 publication.


## Program model

A program contains:
- title;
- description;
- goals;
- experience range;
- equipment requirements;
- typical duration;
- days/week;
- schedule template;
- six-week progression strategy;
- workouts;
- exercise prescriptions;
- substitution rules;
- coach notes;
- contraindication/safety metadata where appropriate;
- version.

Users can duplicate any template into an editable personal program.

## Historical 20-program catalogue — future breadth

1. **SHIFT6 Foundations** — beginner, 3 days, full body, general gym.
2. **Barbell 30** — 3 strength days + cardio, rack/barbell/bench, 30-minute lifting sessions.
3. **Strength 3×5** — simple squat/press/deadlift-focused progression.
4. **Beginner Gym 3-Day** — machine + free-weight friendly.
5. **Upper/Lower Hypertrophy 4-Day** — intermediate muscle-building.
6. **Push/Pull/Legs** — 3 or 6 day configurable split.
7. **Dumbbell Only** — home/gym, 3 days.
8. **Minimal Home Gym** — bench + adjustable dumbbells/bands.
9. **Resistance Bands** — travel/home.
10. **Bodyweight Foundations** — no equipment.
11. **Calisthenics Strength** — pull-up/dip/push-up/squat progressions.
12. **Strength + Conditioning Hybrid** — 3 lifting + 2 conditioning days.
13. **Busy 20** — 20-minute full-body sessions.
14. **Mobility + Strength** — strength plus dedicated mobility.
15. **Healthy Ageing** — strength, power, balance, aerobic emphasis with conservative defaults.
16. **Return to Training** — lower initial volume and ramp-in for previously trained users.
17. **Runner Support** — 2 strength sessions around running schedule.
18. **Cyclist Support** — strength/core around cycling.
19. **Power & Athleticism** — jumps/throws/sprints where appropriate + strength.
20. **Cardio Base + Strength** — aerobic development with two full-body strength days.

Each program requires content review before public release.

### Launch-program implementation checkpoint — 2026-09-15

The typed launch catalogue now uses this exact canonical set rather than a parallel list of generic
program placeholders. Barbell 30 remains the canonical startable fixture. The other 19 programs
have executable six-week draft versions with stable program/version/workout/set IDs, declared
equipment, program-specific schedules, and deterministic progression rule references.

The generated drafts include the program-specific constraints called out above: Strength 3×5 uses
3×5 working prescriptions; Strength + Conditioning Hybrid has three strength and two conditioning
days; Busy 20 uses shorter volume/rest defaults; Healthy Ageing and Return to Training use lower
working volume; Runner Support and Cyclist Support keep two required strength sessions with optional
sport-specific aerobic sessions; and Cardio Base + Strength includes two strength plus two aerobic
sessions. These versions remain behind the public startability gate until content review is complete.

## Exercise catalogue target

Future catalogue target: **300+ high-quality reviewed exercise records**, not hundreds of near-duplicate low-quality entries.

Long-term target: 500–800 variants as media coverage grows.

## Exercise taxonomy

### Movement pattern
- squat;
- hinge;
- horizontal push;
- vertical push;
- horizontal pull;
- vertical pull;
- lunge/split stance;
- carry;
- rotation;
- anti-rotation;
- anti-extension;
- flexion;
- extension;
- locomotion;
- jump;
- throw;
- sprint;
- cyclical cardio;
- mobility.

### Primary muscles
Standard anatomical groups with simplified user-facing labels and detailed internal tags.

### Equipment
- bodyweight;
- rack;
- barbell;
- plates;
- bench;
- dumbbell;
- kettlebell;
- cable;
- pull-up bar;
- dip station;
- resistance band;
- suspension trainer;
- medicine ball;
- landmine;
- machines by class;
- bike;
- rower;
- treadmill;
- elliptical;
- sled;
- box/step;
- foam roller/mobility tools;
- custom.

### Exercise attributes
- bilateral/unilateral;
- compound/isolation;
- skill level;
- stability demand;
- loadability;
- impact level;
- space requirement;
- spotter/rack recommended;
- home friendly;
- common substitutions.

## Substitution engine

Rank by:
1. same movement pattern;
2. same primary muscles;
3. available equipment;
4. similar program intent;
5. similar skill/stability demands;
6. user preferences/history;
7. safety constraints.

Show explanation, e.g. “Dumbbell bench press preserves the horizontal press and chest/triceps emphasis but requires more stabilization than the machine press.”

## Program builder UX

Users can:
- create from blank;
- duplicate template;
- name cycle;
- choose days;
- add workouts;
- add sections;
- reorder;
- create supersets/circuits;
- set set/rep/time targets;
- choose RPE/RIR;
- add progression rule;
- define substitutions;
- save as reusable template;
- preview six weeks before starting.

## Workout editing rules

During an active cycle:
- changes to today's workout can be one-time or “apply to future sessions”;
- user sees exactly which future workouts will change;
- past completed workouts are immutable except notes/correction workflow;
- coach proposals use same diff mechanism as manual edits.

## Barbell 30 canonical seed

### Monday
- 4 min easy/moderate bike warm-up
- Back Squat 3×5
- Bench Press 3×5
- Barbell Row 3×8
- Pull-up/Chin-up 2 sets
- Plank 2×30–60 sec
- Optional lateral raise or shoulder accessory when time allows

### Tuesday
- 30–45 min easy/moderate cardio

### Wednesday
- 4 min bike warm-up
- Deadlift 3×3–5
- Overhead Press 3×5
- Reverse Lunge 2×6–8/leg
- Barbell Row 2×8–10
- Standing Calf Raise 2×12–20
- Hanging Knee Raise 2 sets

### Thursday
- 30–45 min easy/moderate cardio

### Friday
- 4 min bike warm-up
- Back Squat 3×5
- Bench Press 3×6–8
- Romanian Deadlift 3×6–8
- Pull-up/Chin-up 2 sets
- Barbell Row 2×8–10
- Core 2 sets

### Saturday
Optional active day, easy cardio, family activity, walk, bike, hike, sport.

### Sunday
Rest / normal movement.

### Additional longevity elements
Across the program/cycle include small doses of:
- power: jumps, light push press, or bike accelerations where appropriate;
- mobility: ankles, hips, thoracic spine, shoulders;
- balance: single-leg tasks;
- shoulder external rotation/rear-deltoid work;
- hamstring knee-flexion work;
- rotational/lateral core;
- at least one short higher-intensity cardio exposure when appropriate;
- regular easy/moderate aerobic work.

These can be optional blocks so the core 30-minute strength sessions remain realistic.

## Exercise filtering checkpoint — 2026-09-15

The Exercise Library implementation applies the planned catalogue filters in the typed domain
search boundary: difficulty, unilateral/bilateral stance, compound/isolation classification, and
mobility/power/cardio focus. Classification is stored on seeded records with a conservative
primary-muscle fallback for older JSON. The current 58-record tranche remains draft and media-free;
eight band-native movements were added so Resistance Bands can be exercised without pretending
bodyweight or dumbbell movements are band-compatible. This does not claim the 300+ reviewed launch
catalogue.

## Custom exercise authoring checkpoint — 2026-09-14

The private builder now captures the documented custom-exercise inputs: name, movement category,
tracking type, difficulty, equipment options, primary muscles, instructions, and private notes.
The domain factory trims list values, rejects missing muscles or equipment, derives a conservative
compound/isolation classification, and keeps the record draft/private. Optional media and
technique review remain separate content-production work.

Private exercises are loaded into subsequent builder visits and the exercise picker searches them
alongside foundational movements. This keeps reuse user-scoped while leaving public catalogue
publication and sharing outside the current boundary.
