# Local Coach-guided setup — incremental #340

This optional route reuses the existing setup fields, owner-scoped
`onboarding_drafts` recovery, profile save and reviewed-content filter. It is a
deterministic guided form, with short prompts and existing choice cards; no
provider request, natural-language extraction or additional transcript is used.

From the first standard setup question choose **Let local Coach guide setup**.
Returning users can also choose **Review setup with local Coach** in Coach.
Missing choices are requested; saved answers are reused. A complete review lists
name, focus, self-described experience, equipment, schedule, units, health and
Coach preferences, plus optional movement/accessibility choices. Each is editable.
Existing supportive/conservative/off defaults are shown explicitly in the review.
**Confirm and save reviewed setup** is the only profile-save action. It does not
create a baseline, plan or cycle, grant permissions or enable provider services.

Answers and the current standard question index use the existing recovery format
and therefore its owner isolation, export and deletion coverage. Switching back
to standard setup waits for a draft checkpoint; a failed checkpoint keeps the
user on the current surface. Reopening guided setup recomputes the first missing
question, or returns to review if complete. No additional chat state is stored.
Saving is single-flight and requires available local storage. The normal private
plan workflow follows setup; public templates remain subject to qualified review.

Scope still pending for #340: native interrupted-flow and keyboard/accessibility
QA, participant comparisons against six-step setup (#316), optional language
extraction with ambiguity handling, and any reviewed-template recommendation
evaluation. Automated checks do not establish a human usability pass or issue
completion. No provider or microphone/health integration was activated.
