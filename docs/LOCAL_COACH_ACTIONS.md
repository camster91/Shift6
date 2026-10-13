# Local Coach controls — first capability batch

Engineering candidate, 13 October 2026. This is a reversible first step toward
issues 339–341, not their completion. It introduces no provider activation,
model tool calls, new memory database, consent scope or migration.

## Existing workflows with fewer navigation steps

Coach shows three relevant primary controls, with the remaining local controls
behind **More local controls**. Before a cycle exists it offers setup/private-plan
workflows instead of inventing a training context. A private plan requires an
existing confirmed profile. Unavailable controls explain the missing requirement.

The typed registry includes setup, blank private builder, workout controls,
calendar, personal goal, training history, eligible movement guidance, optional
health controls and Profile export/data controls. These are fixed app routes,
not arbitrary URLs. Their availability is checked against fresh owner-scoped
records on every selection.

The dispatcher performs **reads and navigation only**. Opening `/workout`
creates/saves a session in the existing app; therefore Coach's workout control
opens Home instead. The user then explicitly starts/resumes using the existing
workflow. Selecting a Coach control does not save a set, alter a plan, record
a measurement, delete data or request a health/notification permission.

## Actual workout and current facts

The local context uses the owned active cycle's saved calendar, including
rescheduling and the current prescribed week. An in-progress attempt takes
priority even if an earlier attempt at that occurrence was partial. Otherwise
only an occurrence scheduled for today is selected. Completed/skipped sessions,
paused cycles, mismatched snapshots, unscheduled days and missing records do not
fall back to the first workout or a guessed weekday session.

Home now uses that same read-only selector. With several unfinished workouts it
offers the newest recorded attempt, matching Coach. If the first workout on a
shared date is complete, both choose the remaining current workout. On a day
without available training, Home keeps the saved cycle and calendar visible
instead of manufacturing a Start action. Weekly cards resolve exact saved
workout IDs, including moved sessions. Opening Home still performs no session
write; Start/Resume remains an explicit user action.

Local explanation reports missing workout availability honestly. The Coach tab
invalidates and reloads its context on every return so prior workout/progress
facts are not silently reused after logging. Asynchronous responses and route
resolution retain the existing owner guards. Public movement guidance passes
the existing review gate with no development-preview exception; owned custom
movement guidance remains available as private user content.

## Verification and limits

Focused tests cover saved calendar versus first-workout selection, rescheduling,
resumption after partial completion, paused/version mismatch, pre-cycle states,
owner/schedule isolation, stale availability, public content gates, unknown action
names/SQL/URL payloads, no writes during navigation resolution, compact controls
and a simulated tab return refreshing the displayed progress facts. Existing
Coach transport and local explainer regression tests remain in the focused set.

**32 tests in six suites**, TypeScript, focused lint and formatting passed for
this candidate. Component focus simulation is not native tab-navigation QA.
The root integration run owns full `npm run verify` and native acceptance after
combining branches; no physical-device/provider integration is claimed here.

The Home/Coach follow-up passed **20 tests in four focused suites**, TypeScript
and focused lint. Its three rendered Home regressions cover multiple unfinished
attempts, completed-first same-date selection and retaining the cycle without an
invented start action. Native verification of this follow-up remains pending.

Remaining work for the issues includes confirmed model-action previews and
execution/readback, conversational field extraction with recoverable state,
inspectable confirmed memory with forget/export/restore/delete semantics,
task-specific evidence IDs/provenance/freshness and response fact binding. Existing
generic `factsUsed` labels are not verified record citations. No issue should be
closed or full-featured AI advertised on the strength of this first batch.
