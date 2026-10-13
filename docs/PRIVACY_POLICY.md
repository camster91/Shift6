# SHIFT6 guest-release privacy policy

Draft for the mobile guest/local-recovery candidate; updated 13 October 2026.
The app is not yet publicly released. Physical-device recovery and final signed
build declarations remain under verification.

SHIFT6 saves your profile, training plans, workout entries, personal goal
measurements, body metrics, preferences and reminders in local app storage.
It does not require an account. This release does not send these records to a
SHIFT6 server, an AI provider, an analytics service or a crash-reporting service.

Local SQLite records are protected by the operating system's app sandbox.
SHIFT6 does not add separate database encryption. Device backup and restore
settings are controlled by Apple/Google and your device; those services may
copy app storage according to their settings.

Optional Apple Health or Health Connect access requires your permission. You
can decline, revoke access in system settings, or disconnect and remove imported
health records from SHIFT6. Optional reminders use native notification permission.

The optional voice-entry candidate requests microphone access only when you
choose to speak a set entry; iOS also requires speech authorization. It requires
available on-device English recognition and has no SHIFT6 cloud transcription
fallback or automatic language-model download. Manual entry remains available.
An unconfirmed transcript is held in memory for review and discarded when capture
ends or the context changes. Applying reviewed numbers fills the existing draft;
the usual set-save control is still required to record an actual result.

Audio recording persistence is disabled, and SHIFT6 does not deliberately save
audio or transcripts in its records, logs or JSON exports. Confirmed numeric
input follows the normal draft/set export and deletion rules. Actual device
recognizer behavior, permissions and candidate traffic still require native
verification before final store disclosures. See [voice acceptance scope](LOCAL_VOICE_SET_INPUT.md).

You can export your local records as a JSON file from Profile. SHIFT6 keeps a temporary copy in private app cache so the receiving app can read it. A later export removes copies older than a day, and deleting local records removes the temporary copies for that user. Device storage management may also clear cache files. Choosing a destination in the
system sharing interface may send that export outside your device; you control
the destination. Treat exports as private files.

The local-recovery candidate can read user-selected schema-12, 13 or 14 JSON exports
(up to 20 MiB and 50,000 records). File selection and preview are inert; restoring
requires a separate explicit confirmation. Restore only accepts an empty guest
installation, including no saved setup draft, and does not merge or overwrite
existing records. Unsupported schemas or invalid references are rejected.
Validation and a single transaction protect against partial database writes;
failed imports do not create an intermediate saved-success state.

The system picker copies the selected file into private app cache for bounded
reading. That temporary copy is removed after reading, including validation
failure; the original file in your chosen provider is not deleted. Preview data
stays in memory until cancellation, navigation or restore. The app does not send
the raw backup to a server, AI provider or analytics service. Your selected file
provider may have its own cloud storage behavior outside SHIFT6's control.

Restored records are assigned to the current guest without importing account
credentials, schema changes or replaying cloud-sync entries. Imported health
history remains historical. Health connection preferences, provider Coach consent
and all notification choices reset off, even if Android/iOS retained an earlier
permission grant. Reconnecting is a separate user action; restore itself neither
requests nor grants OS permissions and does not apply historical Coach proposals.

JSON exports contain no custom media bytes. Restore removes custom movement
media links so inaccessible old-device URIs or remote URLs are not opened
unexpectedly. Add custom media again on this device. The app's installed bundled
artwork is separate from your backup. These resets are disclosed in the preview
and confirmation. See [local backup restore](LOCAL_BACKUP_RESTORE.md).

Optional local Coach memory stores only practical preferences you explicitly
confirm. It defaults off; disabling retains inspection and forget controls.
Forget removes the current local preference, but cannot remove copies in an
earlier export. Memory does not replace profile or training records and is not
sent to an AI provider. Restoring a backup leaves memory use off.

Private builder recovery stores committed editor values and unapplied pasted
text separately from saved plans. A saved indicator appears after its local
write. Resume or discard is explicit; resuming a previously saved version uses
a new private copy. Pending custom-movement forms require Add before recovery
includes them. Load-unit metadata records explicitly declared actual units;
legacy missing units remain unknown rather than inferred from preferences.

You can delete local records from Profile. Uninstalling may also remove records,
depending on device backup/restore behavior. This release has no SHIFT6 cloud
backup or recovery service.

For support, open a GitHub issue at https://github.com/camster91/Shift6/issues.
Do not post private health data, passwords or an unredacted data export in a
public issue.

Store privacy declarations must be checked against the final signed build.
Future connected features would require an updated policy before activation.
