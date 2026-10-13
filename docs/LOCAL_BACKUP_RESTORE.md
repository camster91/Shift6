# Local backup restore — issue 331

Implementation candidate, 13 October 2026. This adds local recovery for the
guest release; it does not enable accounts, a backend, cloud backup or sync.
Physical iOS/Android picker and large-history fault testing remain release gates.

## User path

On a fresh installation, choose **Restore a local export instead** on the first
setup screen, before entering new answers. Merely opening setup or pressing this
entry does not save a placeholder profile/draft. Profile also offers **Restore a
local export**, with an explicit existing-data conflict rather than replacement.

Choose a SHIFT6 JSON export, then review its schema, timestamp, section counts
and limitations. Choosing or previewing a file writes no training records.
**Confirm local restore** opens a separate confirmation dialog; Cancel leaves
the installation unchanged. Restore reports success only after its transaction
commits. Continue opens the recovered records, or setup if the export contains
only an interrupted setup draft.

If any local records or outbox entries already exist, restoration is rejected.
There is no merge, overwrite or implicit deletion. An entered setup draft also
counts as existing data. Preserve/export current records before using the
separate, explicit local-deletion flow if recovery into that installation is
desired. Duplicate restores are rejected by the same policy.

## Supported format and graph

- Export **schema 12** only, up to **20 MiB** and **50,000 records**. The export
  format version differs from the SQLite migration version; neither is imported
  from a backup. Older/future export versions are rejected with a compatible-build
  explanation. Optional recovery sections omitted by earlier schema-12 exports
  are treated as empty, never fabricated.
- All 25 schema-12 record sections participate: profile/equipment/considerations,
  body and imported health history, program/version/custom-movement snapshots,
  cycles, sessions, completed sets, workout drafts/check-ins, personal goals,
  immutable protocols, observations/corrections, target revisions, goal journals,
  goal/setup drafts, Coach proposal history, notification preferences, cycle
  reviews and schedule overrides.
- Unknown envelope, table-column and nested-object fields are rejected. IDs,
  owners, primitive types, bounded JSON, duplicate identities, references and
  prescription/version identities are checked before writes. Goal corrections
  retain their original date/protocol and journals remain append-only records.
  Recovered goal drafts preserve their `inputUnits`.
- The destination is the current guest. Explicit relational owner fields and
  program `ownerId` are remapped consistently; IDs containing the old owner text
  are preserved. Substring replacement would corrupt stable references.
- SQL identifiers come solely from the checked-in table map/migrations; values
  use parameters. Authentication credentials, schema changes and sync outbox
  replay cannot be provided by the export.

## Connections and media

Health connection preferences, provider Coach consent and all five notification
choices restore **off**, even if the OS retained a previously granted permission.
Imported health history is retained as historical data. The user must reconnect
or reenable optional features on this device. Restore never requests or grants
OS health/notification permissions and never applies a historical Coach proposal.

JSON exports do not include media bytes. Custom movement media links are detached
during restore, rather than retaining inaccessible old-device file URIs or making
an unexpected remote request. Add custom media again on the new device. Built-in
bundled artwork remains the installed app's content. Preview and confirmation
explain these deliberate resets before any mutation.

## Atomicity and file privacy

Restore revalidates the file, opens an exclusive SQLite transaction, verifies
foreign-key enforcement on that transaction connection, rechecks an entirely
empty target, inserts the graph with deferred constraints and performs a foreign
key check. Any late write/constraint failure rolls back the entire operation.
There is no intermediate saved-success claim.

The system picker copies the chosen document into app cache for bounded reading.
That temporary copy is removed after reading, including validation failure.
Cleanup only targets a URI beneath the app's actual cache directory; it never
deletes the user's provider/original backup. Preview data remains in memory until
cancel, navigation or restore. No raw backup is sent to a service or analytics.

## Verification

Real `node:sqlite` tests use the actual migrations and a synthetic schema-12
fixture originally exported during native QA. They cover round trip/reexport,
all supported tables, immutable versions, owner remapping, unsaved workout inputs,
goal input units/journals/corrections/revisions/review, consent/reminder resets,
media detachment, duplicates/nonempty targets, malformed/future files, foreign
owners, orphan references, nested unknown fields and a late transaction failure.

Picker tests cover cancel, bounded/invalid data and cache-versus-original cleanup.
UI tests establish inert preview, separate confirmation and conflict handling.
The fresh-setup entry test confirms it creates neither a profile nor draft.
Automated coverage does not establish physical recoverability or usability.

The implementation's full `npm run verify` completed on this PC: **544 tests in
91 suites**, Expo Doctor 21/21, formatting/lint/TypeScript, assets/secrets/release
configuration, production dependency audit (zero known vulnerabilities), 79-file
vendor inventory, five security regressions and both Hermes exports passed.
The local log is `restore-verify.log`; native picker execution is still pending.

Before closing issue 331, test the signed candidate on physical iOS and Android:
actual file-provider selection, cancellation, a large supported history,
background/process interruption, reexport comparison, missing-media disclosure,
empty install and existing-record refusal. Record device, source SHA, binary hash
and observed results. Store submission is a separate action.
