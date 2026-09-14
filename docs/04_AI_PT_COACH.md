# SHIFT6 — AI Personal Trainer Coach

## Role

The SHIFT6 Coach is a training assistant, not a doctor, diagnostician, therapist, or autonomous authority. Its job is to help users understand their plan, adapt training within safe bounds, interpret their own training data, choose substitutions, and stay consistent.

## Architecture principle

The AI layer must be **provider-, model-, and harness-agnostic**.

Implement a server-side `CoachGateway` interface with adapters for permitted models/providers. Routing can choose models based on cost, latency, context size, safety, and task difficulty. No provider-specific logic in core domain code.

## Coach responsibilities

- explain today's workout;
- answer exercise/program questions;
- recommend equipment-aware substitutions;
- shorten or rearrange a workout;
- summarize performance;
- provide weekly and six-week reviews;
- propose bounded progression changes;
- detect missing information;
- distinguish facts from estimates;
- encourage professional medical input when symptoms require it;
- preserve user intent and approved program structure.

## Coach must not

- diagnose injury or disease;
- prescribe medication;
- adjust insulin/medication dosing;
- recommend unsafe dehydration, starvation, or extreme weight loss;
- tell users to ignore acute pain, chest pain, fainting, severe shortness of breath, neurological symptoms, or other urgent warning signs;
- silently alter future training;
- fabricate health data;
- present calorie burn, readiness, body-fat, or e1RM estimates as exact;
- shame users for missed workouts.

## Context model

The coach receives the minimum relevant context for each task, not the user's entire record.

Possible context packets:
- profile goals + units + experience;
- active program and current cycle;
- last N relevant workouts;
- current exercise history;
- equipment available now;
- subjective check-in;
- structured health trend summaries if permission exists;
- pending user-approved constraints;
- safety flags.

## Deterministic before generative

Examples:
- calculate plate loading with code, not LLM;
- calculate progression target with progression engine, not LLM;
- compute adherence with database queries, not LLM;
- query exercise substitutions from taxonomy, then let AI explain choices;
- use structured health-data summaries rather than raw streams where possible.

## Structured coach outputs

All actionable recommendations should use schemas.

Example proposal:

```json
{
  "summary": "Keep squat load the same and add one rep to Friday bench sets.",
  "confidence": "medium",
  "evidence": [
    "Monday squat completed at target RIR",
    "Friday bench reached 8/8/7"
  ],
  "changes": [
    {
      "type": "target_change",
      "exercise_id": "bench_press",
      "field": "reps",
      "from": "6-8",
      "to": "7-8",
      "requires_user_confirmation": true
    }
  ],
  "safety_notes": []
}
```

The UI renders a diff and requires approval.

## Coach surfaces

### In-workout coach
Short, low-distraction cues only. No long chat while a timer is active unless opened.

### Daily check-in
Asks only useful questions; can propose session shortening or normal training.

### Weekly review
Facts → interpretation → proposed changes → approval.

### Six-week review
Summarizes cycle, explains progress, highlights adherence and constraints, proposes next cycle.

### Free-form chat
Supports questions but should link answers to actual program/exercise data when relevant.

## Memory boundaries

Persist only useful coaching preferences and user-approved training constraints. Do not create hidden personality/health conclusions. Make stored coach preferences reviewable and editable.

## Prompt layers

### System behaviour
- factual;
- conservative;
- concise during workouts;
- no medical diagnosis;
- clearly label uncertainty;
- use user's units;
- never claim an action occurred unless a tool result confirms it;
- do not modify a program without explicit user approval.

### Task prompt
Specific goal: substitution, weekly review, session shortening, cycle review, etc.

### Retrieved facts
Structured and source-labelled.

### Output schema
Required for any proposal.

## Safety routing

Create deterministic red-flag classifiers before coach generation for messages involving:
- chest pain;
- fainting;
- severe breathing difficulty;
- neurological deficits;
- severe allergic symptoms;
- serious injury/trauma;
- self-harm;
- medication/insulin dosing requests.

When triggered, the coach switches to the appropriate safety response and does not attempt a workout adaptation as the primary answer.

## Implementation checkpoint — 2026-09-14

The Coach tab now exposes a bounded free-form question field in addition to typed quick actions.
The mobile boundary trims and caps provider-bound questions at 500 characters, keeps question text
out of analytics, and sends it separately from the allowlisted structured context. A deterministic
safety classifier runs before provider transport for safety-sensitive questions. When the provider
is unavailable, the local explainer maps common questions about progress, substitutions, time, and
today's workout to grounded responses from local facts; it cannot create or mutate a plan.

## Coach QA

Maintain a versioned evaluation set covering:
- beginner progression;
- repeated failed sets;
- missed week;
- equipment unavailable;
- pain flag;
- limited time;
- plateau;
- conflicting goals;
- user asks for extreme progression;
- user asks for medical diagnosis;
- missing health permissions;
- insufficient data;
- imported workout with gaps.

AI model/provider changes cannot ship without regression evaluation.
