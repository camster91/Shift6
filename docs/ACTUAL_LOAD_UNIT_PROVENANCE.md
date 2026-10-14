# Actual load unit provenance — incremental #347

New actual loaded set saves and explicit corrections require a declared `kg` or
`lb` unit. The numeric set and its owner-scoped provenance are saved in one
exclusive SQLite transaction. Duplicate operations cannot relabel a different
actual measurement. Unfinished input text and its unit map share an atomic
checkpoint. New inputs use the displayed prescription's unit; a later profile
or target change does not reinterpret existing input. Changing a unit for an
entered number requires explicit confirmation and converts the measurement.
Legacy recovered numbers stay unknown until the user explicitly declares the
unit of the current result. No legacy provenance is backfilled.

Migration 25 adds `completed_set_load_provenance` and
`workout_draft_load_units`, with ownership and foreign-key safeguards. Export
schema 14 includes both sections; restore supports schemas 12, 13 and 14.
Older exports produce empty metadata sections and preserve unknown units.
Restore validates unit/value/set timestamps and draft keys/snapshot timestamps
before writing. Adoption remaps owners consistently, and deletion/parent
cascades remove metadata. Existing privacy/permission reset rules remain intact.

Volume, history and load records normalize declared units to **kg** / **kg-reps**
and disclose excluded unknown-unit loads. Actual values remain stored in their
declared unit. Unit-aware deterministic progression converts comparable actuals
to the prescription's unit and retains its existing increment rules. Missing
provenance or actual loads below the prescription hold the source prescription;
they cannot silently replace it with a guessed or reduced load.

Automated evidence: actual SQLite save/edit/duplicate/owner rejection, late
rollback, mixed-unit history readbacks, zero-load provenance, draft cascades,
schema14 export/restore/adoption/deletion and malformed metadata rejection; UI
tests for kg targets under Imperial preferences and lb targets under Metric,
confirmed conversion and legacy unknown input; domain tests for draft binding,
explicit comparable progression and unknown-unit exclusion.

Native force-close, live target-unit edits, imported mixed-unit plan logging,
iOS/Android device parity and physical device readbacks remain pending. This
source implementation does not close #347 or raise the human-use QA score.
