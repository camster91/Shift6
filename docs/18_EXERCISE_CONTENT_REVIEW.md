# SHIFT6 exercise content and media review workflow

Updated: 2026-09-16

This document defines the evidence required before an exercise or exercise-media item can be treated
as public launch content. It does not approve any current exercise record or media asset.

## Current state

The repository currently contains 58 foundational exercise records. They are intentionally marked
`draft`, are media-free, and are suitable for product-development and cycle-structure testing only.
The launch target remains at least 300 unique public exercise records that pass the publication gate.

`assessExerciseCatalogue()` is the canonical repository-level launch check. It reports:

- the public-record count;
- the publication-ready count;
- duplicate stable IDs;
- whether the 300-record launch threshold is actually satisfied.

A larger draft catalogue does not satisfy the launch gate. A record only counts as
publication-ready when `assessExerciseContent()` returns `readyForPublication: true`.

## Exercise review gate

A curated public exercise must have, at minimum:

- a stable non-empty exercise ID;
- a clear name;
- a movement pattern;
- at least one primary muscle;
- at least one equipment requirement, including `bodyweight` where appropriate;
- setup guidance;
- at least one instruction;
- at least one technique cue;
- at least one common-mistake note;
- at least one safety note;
- an explicit tracking type;
- `contentStatus: 'reviewed'`;
- a human review timestamp in `reviewedAt`.

The reviewer is responsible for checking that the movement description, instructions, technique
cues, common mistakes, safety notes, equipment requirements, muscle tags, movement pattern, tracking
method, and substitutions are internally consistent. Repository validation can detect missing fields;
it cannot establish that technique guidance is biomechanically correct.

Custom exercises remain private by default. A user-authored record is not converted into public
catalogue content simply by changing `contentStatus`.

## Media is optional

An exercise with no media can still be publication-ready. Missing imagery or video must not make the
exercise unusable or break workout logging.

If media exists, each item has one of three review states:

- `draft` — not reviewed for public use;
- `technique-review` — awaiting or undergoing human technique review;
- `approved` — eligible for public use only if the provenance gate also passes.

The repository must never treat a non-approved media item as production-ready.

## Provenance schema

Approved media requires provenance metadata:

- `sourceKind`: `original`, `licensed`, `generated`, or `user-provided`;
- `sourceLabel`: a human-readable source or production reference;
- `rightsConfirmedAt`: evidence that usage rights were checked;
- `sourceUri` when licensed media comes from an external source;
- `license` when the source is licensed;
- optional creator attribution where useful;
- `techniqueReviewedAt` for generated media.

Do not place credentials, private download tokens, or contract secrets in these fields.

## Generated exercise imagery

Generated exercise imagery can move through draft and technique-review states, but it cannot pass
the publication gate merely because it looks plausible or because a model generated it successfully.

Before generated media is marked `approved`:

1. A human must compare the depicted setup and execution against the reviewed exercise record.
2. The reviewer must check hand/foot position, joint position, equipment placement, range of motion,
   direction of force, spotting/rack context, and any safety-sensitive detail visible in the asset.
3. Rights/use terms for the generation workflow must be confirmed.
4. `techniqueReviewedAt` and `rightsConfirmedAt` must be recorded.
5. Alt text must accurately describe the useful visual information without making unsupported health
   or performance claims.

The content gate fails approved generated media when human technique review evidence is missing.

## Licensed and user-provided media

Licensed approved media must retain enough provenance to identify the source and licence basis. A
link alone is not licence evidence.

User-provided media is not automatically suitable for the public catalogue. Public use requires a
separate rights confirmation and the same technique/content review expected for other media.

## Batch review procedure

For each content batch:

1. Add or update records as `draft`.
2. Run repository validation/tests and fix structural blockers.
3. Review technique/instructions/safety metadata with a qualified human reviewer.
4. Record `reviewedAt` only after that review is complete.
5. Add media separately; keep it draft until provenance and technique review are complete.
6. Run the per-record publication gate.
7. Run the catalogue-level 300-record gate.
8. Sample the batch in the Exercise Library, exercise detail, substitution flow, program builder, and
   active-workout display.
9. Verify stable IDs against history/program references before replacing or retiring existing IDs.
10. Record reviewer/date/source evidence in the content-production workflow before public release.

## Stable-ID rule

Exercise history, programs, substitutions, and variants refer to stable IDs rather than display
names. Editing a title or copy must not create a new ID. A new ID is appropriate only for a genuinely
distinct exercise identity or variant boundary. Retired IDs must not be silently reused.

## Release non-claims

Passing repository validation does not prove:

- that 300+ reviewed records currently exist;
- that a technique reviewer approved the content;
- that media licences are legally sufficient;
- that generated media is anatomically or mechanically correct;
- that app-store health/fitness declarations are complete;
- that exercise content has been verified on native devices.

Those claims require their own evidence before #274 or the public-release epic can be closed.
