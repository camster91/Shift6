# Local pasted movement targets — partial issue 337

Source increment based on `88ce95bf`, 13 October 2026. This is a strict local
notation parser and editable text preview, not AI/OCR, training advice, content
approval or full acceptance of issue 337. No service, key or new permission is
required. The public content manifest is unchanged.

## User path

Open or create your own private workout in the builder. Its existing metadata
(name/day/duration/equipment) is not inferred from imported notes. Add or select
the exact custom movement variant first; approved available catalogue entries
may also be used when the existing public gate permits them.

Choose **Import pasted movement targets** for the destination workout. Paste
user-owned notes using one explicit line per movement, for example:

```text
My squat | sets=3 | reps=8-12 | load=40kg | rest=90s
My hold | sets=2 | time=30s | rest=0s
My run | sets=1 | time=10min | distance=1miles | rest=2min
```

The example values demonstrate notation, not a recommended prescription. No
values are inferred. Preview displays each original line and the extracted
targets. Edit the pasted text to correct unresolved fields, then preview again.
Every row must resolve before **Add reviewed rows to this workout** is enabled.
Applying appends to the chosen private draft without saving/start/completion.
Use the existing **Save draft program** to persist it. Original lines are kept
in each imported workout movement's private notes.

## Boundaries

- Exact case-insensitive movement names only; no fuzzy matching, invented
  variant or automatically created movement. Duplicate names across distinct
  IDs are ambiguous and blocked. Only the owner's available movement set is used.
- Explicit sets (1–20), reps/range, hold time (s/min), distance (m/km/miles),
  optional load with kg/lb, and explicit rest (s/min, including zero). Targets
  must match the movement's declared tracking type. Absent/invalid values,
  duplicate fields, unstructured prose, supersets and unknown commands remain
  unresolved rather than inheriting builder defaults.
- Bounds are input-format safeguards, not a claim of safe training dose:
  1–20 lines, 10,000 characters total, 450 per line; finite bounded numeric fields.
- The append path revalidates text/current availability, program owner, private
  draft status and version ownership. Existing domain helpers create sets/rest/
  notes; original program/version objects remain unchanged. No raw SQL, URLs,
  code or document instructions are executed.
- **Unsubmitted preview text is not persisted** and is explicitly labelled as
  lost if the screen closes. After Save, imported rows/targets/original notes
  follow the existing local export/delete and saved-private-copy workflows.

## Remaining issue acceptance

This increment does not implement general free-form workout-note extraction,
editable per-field resolution, supersets/circuits, photo/OCR/provider processing
or unsaved-preview interruption recovery. Those require separate bounded design
and tests; this source increment must not close #337. Unknown choices cannot be
filled by guessed training prescriptions. Native iOS/Android keyboard, text
scaling and interruption testing and actual entry-time/error comparisons remain.

Focused verification: 21 tests in four suites passed (parser, preview, builder
save readback, existing builder persistence). These cover unit/range preservation,
mixed inputs, explicit rest, missing fields, unsupported commands/URLs, ambiguity,
size bounds, owner/current-availability checks, immutable append, inert preview,
edited-text repreview and saved original notes/targets. An initial cold-render
run exceeded the existing builder test's five-second timeout; isolated and later
combined reruns passed. That harness failure was not classified as an app defect.

The root owns combined `npm run verify` and native evidence after integration;
focused source checks do not establish device usability or public content review.
