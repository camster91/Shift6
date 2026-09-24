# SHIFT6 Coach provider release gate

Updated: 2026-09-16

This document defines the evidence required before provider-backed Coach can be treated as a
production-ready capability. It does not select a provider, enable provider processing, or approve a
production deployment.

## What repository code proves

The mobile architecture is provider-neutral. When an API base URL is configured, Coach requests go
to the same authenticated SHIFT6 API boundary used by the backend; the mobile app does not contain a
vendor LLM API key or call a vendor endpoint directly.

Provider-bound context is intentionally bounded. The packet contains allowed structured training
facts plus non-identifying user/cycle fields needed for the task. It excludes raw health samples,
private workout notes, manual body metrics, movement/accessibility preferences, analytics payloads,
and local user/cycle/program-version identifiers.

Provider-backed Coach processing is opt-in and defaults off. With it disabled, message generation
uses the deterministic local Coach and the provider message method is not called. Plan-proposal
generation has no local mutation fallback and is blocked completely until provider-backed processing
has been explicitly enabled.

Provider responses are not trusted directly. The client validates message/proposal shape, routes
unsafe message text through deterministic safety classification, requires every plan mutation to be
structured and explicitly confirmable, and rejects unsafe or unusually large proposal changes.
Accepted proposals are applied only after the user approves them, and supported changes create a new
private program-version revision rather than rewriting historical workout data.

## Deterministic safety boundaries

These checks happen independently of provider quality:

- urgent symptoms such as chest pain, fainting, severe breathing difficulty, stroke-like symptoms,
  or severe allergic reactions route to urgent-care guidance and stop training;
- urgent symptoms take precedence over medication or nutrition questions in a mixed prompt;
- meaningful injury red flags such as sharp/worsening/radiating pain, numbness, inability to bear
  weight, significant swelling, major injury, fracture/dislocation language, or diagnostic requests
  route to professional evaluation;
- insulin, prescription, medication and dosing questions route to a medication boundary;
- individualized calorie, macro, meal-plan and diet-plan requests route to a nutrition boundary;
- provider proposals cannot contain medication/medical-treatment or individualized nutrition advice;
- provider mutations must use allowlisted fields and require user confirmation;
- load, rep, duration, distance and RPE increases are capped at 25% per proposal;
- set-count changes must remain between 1 and 20;
- schedule values must remain between 1 and 7;
- RPE must remain between 1 and 10 and RIR between 0 and 10.

These are safety rails, not evidence that every possible unsafe prompt is covered.

## Required production-provider evidence

Before provider-backed Coach is enabled for release, record all of the following:

1. **Provider and model identity**
   - production provider/service;
   - model or model-family identifier;
   - server-side routing/fallback policy;
   - region/data residency where relevant.
2. **Data-use contract**
   - what request/response data the provider receives;
   - retention duration;
   - whether data is used for model training or provider product improvement;
   - deletion/retention exceptions;
   - subprocessors where applicable.
3. **Server boundary**
   - authenticated SHIFT6 endpoint implementation for `/v1/coach/message` and any proposal endpoint;
   - authorization isolation by user;
   - rate limiting and abuse protection;
   - server-side secrets only;
   - request/response logging policy that does not silently capture excluded private fields.
4. **Failure behaviour**
   - timeout handling;
   - provider 4xx/5xx handling;
   - malformed/oversized/invalid JSON handling;
   - provider outage behaviour;
   - message fallback behaviour;
   - proof that proposal failure never invents or applies a local plan mutation.
5. **Latency and cost**
   - representative p50/p95 response latency;
   - timeout threshold;
   - cost/usage guardrails;
   - model fallback behaviour if used.
6. **Monitoring**
   - technical error monitoring;
   - privacy-safe operational metrics;
   - alerting for elevated failure/invalid-response rates;
   - no raw Coach question or health-sensitive text in analytics by default.

## Adverse-case evaluation set

Run the production server/provider pair against a documented evaluation set before release. At
minimum include:

- ordinary workout explanation;
- missed sessions without punitive language;
- one poor session versus a real multi-session plateau;
- low readiness;
- limited training time;
- unavailable equipment;
- ordinary exercise substitution;
- sharp pain, numbness, swelling and worsening/radiating pain;
- severe pain/injury language;
- chest pain, fainting and severe breathing difficulty;
- insulin/medication/dose questions;
- individualized calorie/macro/meal-plan questions;
- requests for diagnosis or treatment;
- attempts to remove confirmation from a mutation;
- unsupported mutation fields;
- excessive load/rep/duration/distance/intensity jumps;
- invalid RPE/RIR, set-count and schedule bounds;
- prompt-injection attempts to bypass safety or reveal hidden/system instructions;
- malformed provider responses;
- provider outage/timeout;
- opt-out state proving zero provider calls.

For each case record expected route, actual route, whether a provider call should occur, whether a
plan mutation is permitted, and reviewer disposition. The repository unit matrix is necessary but is
not a substitute for this production-provider evaluation.

## Plan-mutation release checks

Before enabling provider-generated plan proposals:

1. Confirm provider-backed processing is explicitly enabled by the user.
2. Validate structured output server-side and again at the client boundary.
3. Require `pending` status and `requiresUserConfirmation: true` for every change.
4. Show a plain-language preview of the proposal and evidence.
5. Never apply a proposal automatically.
6. On approval, verify the proposal still targets the current active cycle/version.
7. Create a new private program-version revision for supported changes.
8. Preserve completed workout history and earlier program versions.
9. Keep rejected proposals from mutating the plan.
10. Verify sync conflict/idempotency behaviour on multiple devices before release.

## Privacy and UX release checks

Before enabling provider Coach:

- the disclosure names the production provider or accurately describes the service relationship;
- retention/training terms match the actual provider contract;
- provider processing remains off by default;
- changing the preference takes effect before the next network call;
- local deterministic Coach remains usable while provider processing is disabled or unavailable;
- user export/delete behaviour includes the preference and proposal records as documented;
- accessibility/native QA covers question entry, safety routes, proposal preview and approval/reject
  controls with VoiceOver/TalkBack and large text.

## Release non-claims

Passing repository tests does not establish that:

- a real provider/model is configured;
- the provider contract has acceptable retention/training terms;
- production traffic is authorized and isolated correctly;
- latency, cost and outage behaviour are acceptable;
- the adverse-case matrix passed against the actual provider;
- provider output is generally correct or medically safe;
- store privacy declarations are complete.

Those require external evidence before #278 or the public-release epic can be closed.
