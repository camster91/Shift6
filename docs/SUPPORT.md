# SHIFT6 mobile support

SHIFT6 is being prepared for its first guest-only iOS and Android release.
It is not yet available in the App Store or Google Play.

Report a reproducible problem at https://github.com/camster91/Shift6/issues with
your device model, operating system version, app build and the steps that caused
it. Do not include private health data or an unredacted export in a public issue.

Your training records are saved locally. Export from Profile before changing
devices or uninstalling; this release has no SHIFT6 cloud recovery. Keep exported
files private. Local records can also be deleted from Profile.

The local-recovery candidate can restore a SHIFT6 **schema-12 JSON export** into
an empty guest installation. On the first setup screen, choose **Restore a local
export instead**, or use **Restore a local export** in Profile. Review the file
summary and limitations, then confirm separately. Choosing or previewing a file
does not save training records. This feature is under device verification;
its presence does not establish physical iPhone/Android recovery testing.

Restore accepts files up to 20 MiB and 50,000 records. It does not merge or
overwrite existing records, including entered setup drafts. Duplicate imports
are rejected. Older/future export schemas require a compatible app build.
Do not delete current records just to resolve a conflict without first keeping
the copy you need; local deletion is a separate explicit action.

Recovered health history stays historical. Health connections, provider Coach
consent and all notification choices restore off; reconnect or enable them
deliberately on this device. The app never grants OS permissions during restore.
Custom movement media bytes are not in JSON exports, and old media links are
detached. Add that media again; built-in bundled artwork remains available.
See [local backup restore](LOCAL_BACKUP_RESTORE.md) for supported records and limits.

The picker may copy the selected file into temporary app cache for reading;
the app removes that copy after reading and leaves your original backup intact.
Keep the original export safe. Local export/restore does not create cloud backup,
sync or an account, and no backup is sent to an AI provider.

For a denied health or notification permission, review SHIFT6 permissions in
your phone's settings. Health and reminders are optional.

Do not use the app to decide whether an exercise or target is medically suitable.
Public training content remains unavailable until its review is complete.
