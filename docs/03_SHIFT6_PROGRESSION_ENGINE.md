# SHIFT6 — Six-Week Progression Engine

## Purpose

The progression engine is the product's deterministic core. AI may explain or recommend around it, but basic progression cannot depend on an LLM.

## Data inputs

Per completed set/session:
- exercise;
- load;
- reps;
- duration/distance;
- RPE or RIR when collected;
- completion status;
- rest;
- pain/discomfort flag;
- notes;
- workout duration;
- optional heart-rate data.

Context:
- goal;
- experience;
- equipment;
- schedule;
- recent adherence;
- prior cycle;
- preferred progression style;
- optional recovery signals.

## Progression strategies

### Double progression
Use rep range. Increase reps until all working sets reach top of range with target effort, then increase load and return toward lower end.

### Linear load progression
Small load increase after successful sessions while effort remains within limits.

### Rep-target progression
Maintain load until total-rep target is reached, then increase.

### RPE/RIR autoregulation
Adjust target load or reps within a bounded range using prior performance and user-reported effort.

### Time/density progression
For conditioning: same work in less time, more work in fixed time, or longer intervals.

### Duration/distance progression
For cardio: conservative time or distance increase with optional intensity constraints.

### Skill progression
For bodyweight/calisthenics: progress/regress exercise variation with stable form criteria.

## Default strength rules

- Do not recommend load increases after form/pain flags.
- Require successful completion and acceptable effort trend.
- Use smallest available equipment increment.
- Upper-body increases often smaller than lower-body.
- Missed workout does not automatically trigger regression.
- One poor session is not a plateau.
- Repeated failures trigger review rather than automatic punishment.

## Six-week framework

### Week 1 — baseline
Conservative targets, validate exercise selection, collect effort data.

### Week 2 — repeatability
Progress only clear wins. Ensure soreness/fatigue is tolerable.

### Week 3 — build
Normal progression.

### Week 4 — build
Normal progression with first formal trend review.

### Week 5 — challenge
Strongest planned stimulus where appropriate, still bounded by program intent.

### Week 6 — consolidate
Choose based on program:
- normal training + review;
- reduced volume;
- rep PR opportunities;
- technique focus;
- test submaximal performance.

No forced 1RM testing.

## Readiness modifier

Readiness should be conservative and transparent.

Minimum subjective inputs:
- energy 1–5;
- soreness 1–5;
- sleep quality 1–5;
- time available;
- discomfort yes/no.

Optional objective inputs:
- sleep duration;
- resting HR trend;
- HRV trend;
- recent training load.

Readiness must never be a mysterious 0–100 score without explanation. Prefer labels such as:
- normal plan;
- consider lighter volume;
- consider technique/recovery session;
- stop and seek appropriate care if concerning symptoms are reported.

## Change types

Automatic, low-risk:
- timer defaults;
- suggested warm-up load calculations;
- display order;
- next target generated from deterministic progression when inside user-approved rules.

Requires confirmation:
- exercise substitution;
- working set count change;
- training-day change;
- program goal change;
- meaningful load reduction/increase outside normal progression;
- adding/removing cardio;
- ending/starting a cycle.

Never automatic:
- medical advice;
- training through pain;
- extreme volume/intensity spikes;
- medication/nutrition dosing;
- restrictions based on inferred medical status.

## Plateau detection

A plateau is considered only when:
- sufficient comparable sessions exist;
- adherence is adequate;
- targets were attempted;
- no major schedule/equipment change explains the data;
- multiple exposures show no progress or repeated failure.

Possible responses:
- smaller increments;
- rep-range change;
- additional rest;
- reduced fatigue;
- exercise variant;
- technique focus;
- change volume;
- change frequency;
- repeat cycle.

Coach must explain uncertainty.

## Barbell 30 seed progression

Main lifts:
- squat: 3×5;
- bench: 3×5 Monday, 3×6–8 Friday;
- deadlift: 3×3–5 Wednesday;
- overhead press: 3×5;
- RDL: 2–3×6–8;
- row: 2–3×8–10;
- pull-ups/chin-ups: 2 sets with reps in reserve;
- unilateral legs, calves, core as programmed.

Progress when all working reps are clean and approximately 1–3 reps remain in reserve. Default load jumps must respect available plates and user experience.

## Cycle review output

The engine produces structured facts first:
- completion rate;
- progression events;
- regressions;
- PRs;
- estimated strength trend;
- average reported effort;
- cardio minutes;
- session-duration trend;
- discomfort flags;
- exercise substitutions;
- skipped sessions and reasons.

The AI coach receives those facts and turns them into an understandable review. The AI is not allowed to invent measurements that are absent.

## Deterministic implementation checkpoint — 2026-09-13

`src/domain/progression.ts` now provides a provider-independent first engine boundary:

- readiness is reduced to explainable labels and conservative actions;
- linear load, double progression, rep target, RPE/RIR, volume, density, time, distance, cardio, and skill strategies return typed deterministic decisions;
- discomfort and poor-form flags hold normal progression for the affected movement;
- plateau detection requires comparable sessions, adequate adherence, attempted targets, and repeated lack of progress;
- cycle facts aggregate adherence, volume, cardio, effort, duration, records, regressions, and discomfort without an LLM;
- Week 6 guidance is derived from the program's declared meaning and never assumes a universal deload.

This checkpoint is unit-tested domain logic, not yet connected to active workout persistence, cycle creation, or the Coach proposal UI.

## Deterministic next-cycle copy checkpoint — 2026-09-14

`src/domain/cycleProgression.ts` now connects completed local performance to the Review → “Build a
progression copy” path. Completed sets are matched by canonical exercise ID and immediate source
workout ID, so repeated movements in one week cannot borrow evidence from another exposure. The
new private version applies only ordinary deterministic target decisions; volume, density, and
skill changes remain explicit review items. Missing history, limited/rest readiness, and discomfort
hold the source prescription. The result includes a typed change list for the builder to show
before the user saves or starts the next cycle, and never mutates the completed snapshot.
