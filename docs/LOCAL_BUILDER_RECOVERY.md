# Private builder recovery

Implementation for #337/#275 uses the existing schema13 recovery table. Source
regressions are separate from native/human acceptance, which remains pending.

After builder source and local library loading, the app checks the current owner's
route (mode and source version) for recovery. A found draft requires an explicit
Resume or Discard choice. An unsaved draft keeps its program/version IDs, workouts, actual
targets, added custom movements, original pasted text and preview text. It does not
save a canonical plan, start a cycle, append imported rows, approve public content,
send a provider request, or create an outbox record. The current content gate and
movement availability are reapplied. Catalogue IDs cannot be shadowed by recovered
private movements. A recovered preview is parsed again; missing or invalid values
remain unresolved and block Add reviewed rows.
If its version already exists in saved plans, the choice explicitly says Resume
as a new private copy. The copy retains contents and remaps pasted-text workout
references; it cannot overwrite the saved version or its training history.

Edits autosave a separate owner-scoped recovery snapshot after a 300 ms delay.
Background/navigation cleanup flushes the last snapshot for that same owner and
route. “Recovery saved locally” appears only after that write succeeds; it does not
mean the program appears in saved plans. Failed writes show a warning. Revisions
use compare-and-swap inside exclusive SQLite transactions; a stale editor cannot
overwrite or discard another editor's newer draft. A conflict requires reopening
and choosing a draft. Historical IDs remain route-reachable after owner adoption
or local backup restore because SQL owner scope and the encoded route are used.

Save draft program and Start retain the canonical transactions. Recovery is cleared
only after the explicit canonical action succeeds, and only when its snapshot still
matches and has no unadded import text. Unadded/unresolved pasted text stays in
private recovery after the plan is saved. New edits made while Save was pending remain recoverable. Failed canonical
saves retain recovery. Discard deletes this recovery only; saved plans/history remain.
Owner/source/database changes invalidate stale UI callbacks. No migrations or backup
schema changes are introduced by this implementation.

Recovery includes state already committed to the private builder model and pasted
text. Workout metadata and target editors must finish Done/blur first; unfinished
custom-movement form values require Add custom movement before they enter the model.
The UI explains these limits. A force-stop before the recovery write completes may
lose the last unsaved keystrokes; wait for its saved indicator. Malformed or ambiguous
recovery records block automatic replacement and offer retry/back. Public fitness
content remains gated for qualified human review.

Regression evidence: actual SQLite tests preserve targets/imports without canonical
or sync writes, enforce owner scope and stale revisions, retain prior records on
disk failure, and verify owner adoption. Component checks cover explicit recovery,
discard, background flush/reopen, failed canonical save, successful clear-after-write,
newer edits during delayed Save, stale owner reads and recomputed import previews.
These are source checks, not native force-close, TalkBack, iOS, or human usability
acceptance. The integrated binary needs those checks before closing the issues.
