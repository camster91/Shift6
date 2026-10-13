## Problem

Source-confirmed at `91eea026090bd7a7c4544f5624c6462306b838a1` on Windows `Cam-DESKTOP`.
Native UI reproduction is untested for this specific finding; this issue must not
be read as a native or human QA pass/failure claim.

`saveProgramVersionInTransaction` in `src/db/programRepository.ts` handles an
existing version ID by updating `version_json`, status, version and creation time.
The owner/program boundary is enforced, but the saved version is mutable. In
`app/builder.tsx`, Save leaves the same private draft/version in the open editor;
subsequent changes and Save use that same version ID. The training cycle stores
the version ID, so a later write can rewrite the plan referenced by existing
training/cycle history. This is distinct from actual-load unit provenance #347.

## Reproduction

Repository sequence (synthetic data):

1. Save a private program and version `v1` for a local owner.
2. Create a training cycle that references `v1`.
3. Call `saveProgramVersion` again for that owner/program with the same version ID
   but a changed workout target/title.
4. Read `user_program_versions.version_json` and the cycle's referenced version.

Expected: the original saved snapshot remains unchanged; changed content requires
an explicit new private copy/version, and no earlier history is rewritten.
Actual source behavior: `ON CONFLICT(id) DO UPDATE` overwrites the saved JSON.

UI sequence to verify on native Android and iOS: build a private plan, Save, keep
the builder open, edit a target/title and Save again; also verify an existing cycle
continues to resolve its original version. Recovery already detects a saved
version and offers an explicit new-copy Resume, but that does not guard every
repository caller or an editor that remains open after Save.

## Acceptance

- [ ] Saved version JSON/status/version/time cannot be overwritten under the same ID.
- [ ] Identical retries are idempotent and retain owner/program protections.
- [ ] Reject changed content before mutating program metadata or sync records; prove rollback with real SQLite.
- [ ] Builder explains the immutable boundary and provides explicit new-private-copy editing with preserved workouts/targets/custom movements and remapped pasted-text references.
- [ ] Failed/stale saves preserve private recovery; no silent copy, start or import action occurs.
- [ ] Existing cycles and results continue to resolve their original saved version.
- [ ] Run regression checks and native Android/iOS sequences before closing this issue.

Related #275, #345 and #337. Public fitness content remains gated for qualified review.
