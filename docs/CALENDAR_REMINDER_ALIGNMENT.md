# Calendar-aligned reminders — first issue 315 batch

Reminders now consume the existing saved calendar projection, including owned
schedule moves and recorded occurrence outcomes. Workout day slots remain relative
to the cycle start exactly as Calendar currently defines them. No second weekday
schedule is generated. Only current-prescription-week occurrences whose saved
local date is today/upcoming and within the seven-day reminder window are eligible.
Recorded completed/partial/skipped/in-progress sessions receive no new workout cue.
A missed week does not generate an invented make-up week or increase targets.

Calendar moves preview original/new dates and require confirmation before saving.
Once the local move commits, reminders are reconciled immediately. Reminder
failure does not undo the date; the calendar explains a failed refresh. Concurrent
refresh requests get a fresh trailing read so a just-saved move cannot simply join
an old in-flight snapshot. Action eligibility rechecks the actual local date when
opened/confirmed rather than holding yesterday's date after midnight.

The scheduler cancels only SHIFT6-managed workout reminders before writing a
bounded replacement. Existing opt-in and native permission checks remain in force;
paused/inactive cycles receive no new reminders. Cycle status does not fabricate
an explicit pause interval. Reflection copy now states that reviewing saved data
requires neither every workout nor a performance test; completion/next-cycle
transactions are unchanged.

## Verification and outstanding scope

Focused domain, scheduler, concurrency and calendar component tests cover a
Wednesday cycle start, saved moves, foreign-owner override isolation, recorded
outcomes, missed weeks, local DST dates, cancellation/retries without duplicate
native cues, explicit preview/cancel/confirm, commit-before-refresh and reminder
failure preserving the saved move. Native delivery timing, restart/background
behavior, large text and screen-reader confirmation need device evidence.

No migrations, lifecycle journals, review-date revisions, explicit pause/resume,
repeat-week, or reviewed return prescriptions are implemented by this batch.
Timezone travel still uses the existing cycle-start/local-date semantics; it is
not a frozen timezone anchor or a completed lifecycle contract. Qualified
short-session/return/re-baselining content remains gated under issue 309.
Full issue 315 and store readiness remain open.
