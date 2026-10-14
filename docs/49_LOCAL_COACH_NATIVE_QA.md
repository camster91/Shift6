# Local Coach memory and returning setup native QA

14 October 2026. Provisional engineering score remains **53/100** under doc 34; no human participants or usability acceptance. Device: CAM-DESKTOP, hardware-accelerated Shift6-QA Pixel 7 emulator, Android 16/API36 x86_64. Source `db4e8c290d8a801d5305ca57ffed414ecbd1d2dc`, guest-only APK SHA-256 `4010c8ab7f80187ed80a284c1ca78809b2bb8807a367801ea55d77d7d8c27f7f`. Full verification/build evidence and exact run instructions are in [doc47](47_ATOMIC_HANDOVER_QA.md). ADB controls were authorized; no Expo Go or backend was used.

## Observed passes

1. **Confirmed practical memory.** Coach > Inspect local Coach memory initially shows memory off and no facts. Review enabling > Confirm local memory change enables local explanations. Select Remember evening > Preview practical preference > Confirm local memory change saves one practical fact and displays its confirmation date. It explicitly flags the conflict with canonical Morning setup. Force-close and reopen `/coach-memory`: Evening and the conflict explanation remain. Expected and actual: profile, goals, plan and achieved results remain authoritative.
2. **Memory controls.** Review disabling > Cancel memory preview leaves memory visibly on. Later Review disabling > Confirm turns memory off while the Evening fact remains inspectable. External JSON received/opened by QA JSON Receiver has 1,077 records; only `coachMemoryPreferences` and `coachMemoryFacts` differ from baseline, with all 34 other arrays unchanged. Review enabling > Cancel memory preview visibly leaves memory off. Review forgetting Training time > Confirm removes the fact; cold reopen shows none. The earlier independent exported Evening copy remains on disk, matching the disclosed boundary that forgetting does not delete external files. Cancellation checks here establish observed UI state; no intermediate export was taken for each cancel.
3. **Returning guided setup.** `/coach-onboarding` reuses actual Name/General health/Beginner/Dumbbells/3 days/45min/Morning/Imperial/Not now answers. Edit Schedule > 60 min > Continue returns to an editable summary. Force-close and reopen restores 60 min. Before final confirmation, native Profile still shows 45 min. External JSON has one owner-bound `onboardingDrafts` row at step 9 with 60 min and unchanged canonical profile; only that draft and memory preference differ from the initial backup.
4. **Explicit final save.** Return to guided setup > Confirm and save reviewed setup opens the Program Library. Cold Profile shows 60 min, Morning and Imperial. Final external JSON has 1,076 records, no onboarding draft, no memory facts, and memory disabled. The only changed profile fields are session minutes 45→60 and confirmation/update timestamps; the existing empty considerations retain their content with a new confirmation timestamp. All 33 other arrays are identical, including every set/session/cycle/goal/measurement and handover receipt. No automatic cycle, goal baseline, health permission or provider consent is created.

## Failures and limits

The first harness attempt requested a nonexistent `Cancel` label; the actual control is `Cancel memory preview`. The matcher refused input, so this is a harness label failure, not an app defect. A subsequent correctly labeled cancellation was observed. Preview confirmation blocks require scrolling on this emulator; this report claims no participant evidence of effort reduction or accessibility acceptance. No reproducible data-integrity defect appeared in these cases.

The optional dated-review questions and local voice scenarios in the [next-case plan](qa/2026-10-14-coach/next-coach-native-plan.md) remain unexecuted in this report. Successful speech recognition, TalkBack, current iOS journeys, physical devices, natural-language onboarding, broad capability coverage and participant task times remain pending. Gemini remains disabled preparation.

## Evidence

- [coach-memory-initial-db4.png](qa/2026-10-14-coach/coach-memory-initial-db4.png)
- [coach-memory-evening-preview-db4.png](qa/2026-10-14-coach/coach-memory-evening-preview-db4.png)
- [coach-memory-evening-confirmed-db4.png](qa/2026-10-14-coach/coach-memory-evening-confirmed-db4.png)
- [coach-memory-cold-recovered-db4.png](qa/2026-10-14-coach/coach-memory-cold-recovered-db4.png)
- [coach-memory-disabled-retained-db4.png](qa/2026-10-14-coach/coach-memory-disabled-retained-db4.png)
- [coach-memory-enable-cancel-db4.png](qa/2026-10-14-coach/coach-memory-enable-cancel-db4.png)
- [coach-memory-forget-preview-db4.png](qa/2026-10-14-coach/coach-memory-forget-preview-db4.png)
- [coach-memory-forgotten-cold-db4.png](qa/2026-10-14-coach/coach-memory-forgotten-cold-db4.png)
- [coach-guided-returning-db4.png](qa/2026-10-14-coach/coach-guided-returning-db4.png)
- [coach-guided-sixty-recovered-db4.png](qa/2026-10-14-coach/coach-guided-sixty-recovered-db4.png)
- [coach-guided-unsaved-profile-db4.png](qa/2026-10-14-coach/coach-guided-unsaved-profile-db4.png)
- [coach-guided-saved-profile-cold-db4.png](qa/2026-10-14-coach/coach-guided-saved-profile-cold-db4.png)
- [coach-memory-comparison-db4.json](qa/2026-10-14-coach/coach-memory-comparison-db4.json)
- [coach-guided-draft-export-db4.json](qa/2026-10-14-coach/coach-guided-draft-export-db4.json)
- [coach-guided-final-export-db4.json](qa/2026-10-14-coach/coach-guided-final-export-db4.json)
- [coach-guided-comparison-db4.json](qa/2026-10-14-coach/coach-guided-comparison-db4.json)

The [raw evidence manifest](qa/2026-10-14-coach/evidence.json) identifies hashes and sizes; accompanying XML and receiver screenshots are included. The current synthetic QA fixture intentionally ends with 60 min setup, memory off and no remembered preference. Earlier backups remain independent.
