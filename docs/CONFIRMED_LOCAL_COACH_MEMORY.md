# Confirmed local Coach memory

13 October 2026 engineering candidate. Uses the frozen schema-13 foundation;
this batch adds no migration, provider activation, account, sync or remote field.

Coach now links to an inspectable local memory screen, including before a cycle
exists when setup is complete. Memory defaults off and remains off after restore.
Four practical kinds are permitted: preferred training time, preferred session
minutes, equipment preference and Coach style. Each change requires a preview
and explicit confirmation. Arbitrary chat, transcripts, notes, health prose and
inferred goals are not accepted by the memory repository.

Confirmed facts show their local record ID, confirmation time and revision.
The screen compares each preference against the current profile. Differences
are explained rather than silently resolving them: canonical profile, plan,
goals and recorded results remain authoritative. Preferences do not rewrite
those records, substitute gear, advance a cycle or affect deterministic targets.
Equipment preference is not proof of available equipment or physical ability.

Enabled preferences add a bounded, clearly separate note to deterministic local
Coach explanations. Safety routes are not diluted with preference text. Memory
is never inserted into provider context, sent to the optional Gemini service,
or turned into provider consent. Disable excludes all values from explanations
while retaining inspection/edit/forget controls. Current profile and memory are
queried again on focus and after an answer, with old responses invalidated.
Optional memory read failures omit remembered preferences and preserve canonical
local explanations. There is no feature-level memory cache outside mounted UI.

Writes use exclusive SQLite transactions, owner/profile checks, expected
revision and expected preference snapshot time. Distinct monotonic snapshot
times prevent same-millisecond changes from reusing a stale preview. Identical
operation retries return the currently confirmed fact; conflicting retries
reject. UI previews are consumed before awaiting writes and bind to the exact
preview plus owner/focus generation. Edits replace the confirmed value; no
unconfirmed suggestion or previous value is retained in a history table.
New fact IDs encode the owner/operation tuple, so two owners can use identical
operation IDs independently. Existing IDs remain stable during edits.

Forget deletes the fact completely, with no value-bearing tombstone. Repeated
deletion is harmless. Recreated preferences get a fresh operation-derived ID so
old delete callbacks cannot remove the replacement. Forget also changes the
snapshot token, preventing old confirmation retries from restoring that value.
It does not delete canonical records or previously exported backup files; the
screen states that distinction explicitly. Existing schema-13 export/restore
and scoped local deletion already include these tables.

Focused verification covers real SQLite creation/edit/identity/CAS/idempotency,
forget/recreate/stale retries, late-failure and owner/focus rollback, four-kind
export/validation/deletion/restore with restored enablement off. Component tests
cover inert preview, repeated confirmation, edited-preview and owner-change
invalidation, inspect conflicts and explicit enable/forget preview. Local service
tests cover disabled values and preserved urgent routes. These tests use synthetic
data and mocked UI routing; native memory navigation, keyboard, large-text,
force-close, and real participant usability remain pending root integration QA.

All **16 focused tests in four suites**, TypeScript and focused lint passed on
CAM-DESKTOP. The Coach component regressions also verify that a focus return
removes disabled preference text and a mocked provider receives neither practical
memory values nor local memory identifiers. No native or real-provider pass is
inferred from these checks.

Run focused checks from the repository root:

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/db/coachMemoryRepository.test.ts src/services/coachMemory.test.ts src/components/coachMemoryScreen.test.tsx src/components/coachScreen.test.tsx
node node_modules/typescript/bin/tsc --noEmit
```

This implements the four practical confirmed preference kinds. Conversational
memory extraction, health memory, raw conversation history, verified record
citations, model tool execution and online Coach are separate remaining work.
