# Shift calendar projection — #315 working slice

`src/domain/shiftCalendar.ts` is a pure read-only projection of elapsed local dates and explicitly recorded pause intervals. It takes `YYYY-MM-DD` keys, an existing `TrainingCycle.currentWeek` and an already confirmed review date. It does not save changes, infer why someone paused, select a return session, prescribe a target, change a review date or count a completed workout.

| Field | Meaning |
| --- | --- |
| `elapsedDays` / `elapsedCalendarWeek` | Calendar time since the Shift start, including days during a pause. Week numbers can exceed six; six weeks is the intended review checkpoint, not a claim that the block finished on time. |
| `pausedDays` / `activeDays` | Explicit paused days and remaining elapsed days; neither is evidence of training or physical improvement. |
| `cycleWeek` | The existing prescribed training position. Missed sessions can leave this behind elapsed calendar time without trapping the displayed calendar in an old week. |
| `plannedReviewDate` | A date supplied by the confirmed schedule state. The projection never silently extends it. |

Pause intervals use an inclusive start and exclusive end local date. An open interval may be last. Invalid, overlapping and pre-start intervals fail validation. Date-only UTC arithmetic counts calendar days across DST while avoiding a device-local UTC-midnight shift. A date before the Shift start is not projected.

This resolves only a shared time vocabulary. #315 still needs atomic offline pause/resume/repeat/re-entry transactions, review-date previews and confirmations, stable occurrence outcomes, notification changes, conflict handling, legacy migration and native QA. #309 supplies reviewed template-specific return thresholds and shorter-session eligibility. The generic projection does not choose safe training after an interruption. #306's `ShiftProgress.cycleWeek` stays the prescribed position; an eventual Home/Progress view should consume both fields with distinct labels.
