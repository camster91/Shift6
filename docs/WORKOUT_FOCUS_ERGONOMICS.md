# Workout focus and ordinary-difficulty ergonomics — issues 310 / 311

This batch improves the existing guest workout interface. It does not replace
logging, progression rules, recovery records, or qualified content review.

## Current set and confirmation

The default view presents one next unsaved set in the existing workout order,
with exercise/set count, actual editable fields and a reachable confirmation
footer. Suggested values remain suggestions until the user confirms the actual
result. A set advances focus only after its local save succeeds. Failures leave
the same set/input available. The original rest behavior starts after persistence;
this batch does not establish restart/background timer reliability.

Review all sets and adjustments reveals saved sets/editing, session notes,
equipment controls, substitutions and the full original workout. Saved and
unfinished values still use the existing authoritative completed-set/draft
hydration. Editing a set must be saved before finishing the workout.

Previous performance uses the existing query scoped to cycle, workout and exact
immutable version, then matches movement and set number. It does not borrow an
assisted/different movement. Where the stored set lacks an explicit load unit,
the UI says saved units rather than inventing a conversion. Target explanations
come from the existing deterministic decision, not a generated prescription.

## Optional difficulty and discomfort

After a saved set, Too easy / Just right / Too hard records only the user's chosen
plain-language self-report in the existing private session note. It never
fabricates RPE/RIR or records more completed work. Missing feedback remains
missing; the choice does not change a target. Existing user notes are retained;
a full 500-character note reports refusal instead of truncating it. Repeating an
identical note entry is idempotent, while revised reports retain earlier text.

This is an ergonomic feedback capture, not completed adaptive progression.
Structured movement/set feedback, engine integration and fully traceable set
amendments need coordinated persistence/export/restore semantics and the relevant
reviewed content contracts. No new draft fields or database migrations are added.

Discomfort has its own visible stop action and separate confirmation. It uses the
existing partial/skipped-with-discomfort transaction and preserves recorded sets;
it never marks untouched or partial work fully complete. It does not prescribe
training through pain or infer medical status. Existing progression handling is
unchanged; this batch does not claim full movement-level discomfort/re-entry rules.

## Evidence and remaining gates

Focused tests cover actual-value confirmation, persistence-before-focus advance,
failed-save recovery, matching previous set context, no inferred effort scores,
bounded note preservation, explicit discomfort confirmation and untouched skip.
Existing hydration/repository/progression tests are regression evidence.
Synthetic component mocks do not validate native notifications, keyboard layout,
voice/screen-reader navigation, large text, haptics, rest timer recovery or human
usability. Root owns exact-build native QA and integration verification.

Qualified shorter/return/re-baselining rules remain gated under issue 309. No
automatic exercise completion, measured-goal advancement, fabricated content
approval or launch-completion claim is introduced. Issues 310/311 remain open.
