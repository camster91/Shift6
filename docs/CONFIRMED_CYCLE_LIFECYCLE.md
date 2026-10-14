# Confirmed local cycle timing

The cycle dashboard now offers confirmed Pause, Resume and a planned review
date. Home's empty state links to the saved cycle so a pause does not strand
the resume control. The dashboard selects an active cycle first, or the latest
saved cycle when none is active. Workout navigation is disabled while paused.

Pause and resume record the confirmed action on today's date in the cycle's
anchored time zone. Review dates must be today or later. Confirmation shows the
exact date and states that saved results and prescribed targets remain intact.
The private journal lists the confirmed dates. It does not prescribe a return
dose or turn elapsed time into completed training.

Legacy paused cycles can resume with a root return event. Their earlier pause
start and interval remain unknown; no synthetic pause is created. Same-day
pause/resume retains both timestamped events but contributes no invented whole
calendar day duration. Repeat-week execution remains pending a distinct
occurrence identity contract and qualified return prescriptions remain gated.

Repository operations use an exclusive transaction, an owned current-status
check and the expected journal parent. Identical operation retries are
idempotent; changed payload retries reject. A failed status write rolls back its
new event. Resuming rejects when another cycle is active. Saving a new cycle
records the actual old active→paused transition at the time of that write;
it never backdates the pause to the old cycle's start.

Reminder refresh occurs after a successful write. Failure to refresh reports
that the local action was saved and points to reminder settings. Neither a
stale owner/focus callback nor cancelled confirmation can write. The review
date is a saved planning record; this change does not add a review-date-specific
notification scheduler.

Evidence: real SQLite tests cover confirmed transitions, immutable saved sets
and prescriptions, operation conflicts, stale parents, foreign ownership,
rollback, root legacy resume, actual new-cycle saving and schema13 validation.
Component tests cover confirmation, no preconfirmation writes, legacy copy,
exact review-date preview and stale-owner rejection. Native lifecycle UI,
force-close and notification rescheduling checks remain pending integration.
