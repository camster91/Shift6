# Local voice fallback and reviewed draft native QA

14 October 2026. Provisional engineering score remains **53/100** under doc34;
human acceptance is unverified. CAM-DESKTOP, WHPX/host-GPU Pixel7 emulator,
Android16/API36 x86_64, font1.0, offline guest release. Frozen native source
`de0711b08757be2b9e3443350ebabccd33ae937c`, APK SHA256
`69e6431ef8aef784572f44d735dc4e661a375003497f39fd72de3983c32929b5`.
Full verification/build receipts are in [doc50](50_LOCAL_COACH_REVIEW_QA.md).
No Expo Go, backend, participants or actual exercise was used.

## Observed passes and exact changes

1. Home > View cycle dashboard > Pause cycle > Confirm pauses the original
   active private plan. All saved cycles > inspect QA Cycle B > Resume cycle >
   Confirm > Back to Home > Resume workout opens its existing QA Session.
   The native focus view shows **3 of 5 sets**, the next duration-only QA Hold
   set and its unsaved 25-second input. The external baseline contains **1,082
   records**: two new lifecycle events; no new session or completed set. Existing
   draft values/unit maps are identical, with refreshed autosave timestamps.
   Cycle statuses change separately. This is deliberate fixture preparation,
   not an automatic Coach or voice action.
2. Use optional voice set entry > Speak a set entry produces the actual native
   refusal: **“The selected offline language model is not installed. Use manual
   entry; no cloud fallback is used.”** The manual correction editor appears.
   Successful speech recognition is **blocked**, not passed. No microphone
   permission prompt was observed, and native package inspection after this
   case shows `RECORD_AUDIO: granted=false`. This is not a denied-permission
   case or a physical-phone recognition test.
3. Type `40 pounds, 8 reps` > Review corrected values. The duration-only set
   refuses both fields and requires explicit duration; Use reviewed values is
   disabled. It does not interpret the planned 25 seconds as a reported result.
4. After the editor-clear defect below, reopen Speak a set entry and enter
   `26 seconds, RPE seven` into the fresh manual editor > Review corrected
   values. Native preview shows **duration:26 seconds / rpe:7**. This is typed
   parser coverage, not a spoken transcript or natural-language Coach service.
5. Use reviewed values in unsaved set fills that exact draft and displays
   duration/RPE inputs. The view remains **3 of 5 sets**; Complete was not
   tapped. External JSON still has 1,082 records. Exactly one existing draft
   set changes duration25→26 and RPE blank→7. Draft/load-map timestamps update;
   the actual unit map and other draft values are unchanged. **All 34 other
   record arrays**, including every completed set/session, goal, measurement,
   private version and Coach receipt, are identical to the post-resume baseline.

The native receiver received/opened each stated JSON outside the app. One
baseline helper stopped after receiver selection because its next UI dump was
empty. A later fresh receiver observation displayed schema17/1,082 records;
reading that newly received file verified its current export timestamp and
actual contents. This was a harness interruption, not assumed failed delivery.
No audio-retention audit, successful recognition, microphone-denial behavior,
latency/error rate or provider activation is inferred.

## Reproduced correction-editor failure, issue #364

Expected: an opened correction field remains editable after all text is deleted,
with Review disabled while empty. Actual, twice on this binary: clearing the
last text unmounts both the editor and Review control. The first select-all/delete
attempt to replace the unsupported phrase failed its exact readback assertion;
a separate delete-only reproduction verifies correct native focus before
deletion and then asserts that the labeled EditText disappears. Entering a new
phrase requires reopening the flow. This is an app defect exposed by the harness.

Source renders the editor only while listening, text or message is truthy;
`onChangeText` clears the message and preview, so an empty value hides it.
The abort capture was renamed `coach-review-voice-cleared-editor-de0711b0`;
it is **not** a successful 26-second preview. The later fresh-editor preview is
named `coach-review-voice-valid-typed-preview-de0711b0`. A bounded explicit
editor-open-state fix has passed independent source review and the scoped native
retest below. No actual set was saved
by the failed correction attempt.

## Correction-editor fix retest

Same emulator/OS, source `057d593609956001e4582565c25699caae796979`, APK SHA256
`1efa226b78f55d8c6e3ffa74935d07f02a4756fa3f55531c9f79d4452dfca183`.
Full verify passes1,200 tests/144 suites, Doctor21/21 and both exports; standalone
native build/install succeeds. The editor now has explicit open-state identity,
and synchronous current-text validation prevents stale same-event Review.

Resume the same existing workout > optional voice entry > Speak > manual editor.
Type26 seconds, focus the correction field and select-all/delete. **Observed:**
the empty editor stays focused and Review is disabled. Retype
`26 seconds, RPE seven` > Review: duration26/rpe7 appears. Background the app and
foreground MainActivity: the unconfirmed editor/preview and Apply are cleared.
No Apply or Complete was tapped in this retest. See [empty editor](qa/2026-10-14-coach-review/coach-review-voice-empty-editor-fixed-057d5936.png),
[retyped preview](qa/2026-10-14-coach-review/coach-review-voice-retyped-fixed-057d5936.png)
and [background reset](qa/2026-10-14-coach-review/coach-review-voice-background-cleared-057d5936.png).
The external receiver export preserves all payloads and actual records; only
existing draft/load-map autosave timestamps refresh. See [comparison](qa/2026-10-14-coach-review/coach-review-voice-editor-retest-comparison-057d5936.json)
and the earlier deliberate [draft-apply comparison](qa/2026-10-14-coach-review/coach-review-voice-apply-comparison-de0711b0.json).

The first retest route after font reset did not reach Resume. Fresh observations
showed an old receiver, no app PID, then a successful cold MainActivity start and
stable Home. The subsequent complete editor retest exited0. An empty filtered
error log does not establish the cause or rule out a crash. One export helper
also stopped after receiver selection on an empty dump; later fresh receiver
inspection verified its1,082-record file and current export timestamp. These
interruptions remain separate from the observed editor passes. #364 stays open
pending broader acceptance, including physical recognizer and current iOS.

## Remaining work and evidence

### Correction field presentation regression and source correction

On the same Pixel 7 / Android 16 API36 emulator, source
`3de5542595e737ab3ed48806958eff28869d896d`, APK SHA256
`eebbbf65506c0b507601bb0185d97a1906fb96cc421841cfb9cfea98826db5d1`,
the new label, guidance and bordered multiline field expose a native regression.
Resume the existing workout > optional voice > Speak (offline model unavailable)

> type26 seconds > focus/select-all/delete. Expected: the empty focused field is
> visible above the IME. Actual: bounds169,1556–913,1766 are below keyboard top1517.
> The editor remains mounted and Review disabled, but cannot be seen.
> See [hidden field failure](qa/2026-10-14-coach-review/coach-review-voice-empty-editor-hidden-3de55425.png).
> The following coordinate-based replacement failed exact readback with a missing
> leading character; the selected coordinates were covered by the IME. Its cause
> is not proven as an app text-entry defect. The failed helper is not a pass.
> Background/foreground clears the unconfirmed editor; external JSON preserves
> all actual/draft payloads, with only autosave timestamps changed. See
> [comparison](qa/2026-10-14-coach-review/coach-review-voice-hidden-comparison-3de55425.json).
> No Apply or Complete was used.

Source `ae3efb5a3542e585cee459640831e22d786060f5` adds focused-field native
measurement, bounded Android keyboard scroll space and guarded reattachment
after an immediate retry refusal or completed capture. Stale capture/opening,
owner context, background and dismissal cannot publish or register the field.
Independent source review passes102 focused tests. Full verify passes1,218
tests/144 suites, Doctor21/21 and both exports. Native build/install succeeds,
APK SHA256`c928662fde864afcd799617b7d85328aa27de8a357b0e44901abcc18546c6ebf`.
Native visibility results are recorded separately below; these source/build
checks do not prove the keyboard fix.

On this exact binary, the complete normal and200% helper sequences exit0.
Delete all text: the native field stays focused, Review is disabled and its
whole border is above the observed IME. Normal bounds169,1307–913,1517;
large-text empty bounds169,1141–913,1351, expanding to1421 when populated.
Retype `26 seconds, RPE seven` with exact readback, retry Speak through the
missing-model fallback, and retype/review: duration26/rpe7 appears. Background
and foreground: no unconfirmed editor or Apply remains. No Apply or Complete
was tapped. Screenshots were visually inspected:
[normal empty](qa/2026-10-14-coach-review/coach-review-voice-empty-font1.0-ae3efb5a.png),
[normal typed](qa/2026-10-14-coach-review/coach-review-voice-retyped-font1.0-ae3efb5a.png),
[large empty](qa/2026-10-14-coach-review/coach-review-voice-empty-font2.0-ae3efb5a.png)
and [large retry](qa/2026-10-14-coach-review/coach-review-voice-retry-font2.0-ae3efb5a.png).
Normal uses paced characters; large text uses four chunks with exact readback
after each. These are operator/harness observations, not participant acceptance.

Two prior large-text attempts remain interrupted: the optional entry button was
below the fold, then an immediate cold-start UI dump was empty. Fresh stable Home
and scrolling to the actual control preceded the successful complete sequence.
Font-transition dumps are also retained. No interruption is relabeled as a pass.

A separate normal attempt presses Speak while the field is focused. The helper's
expectation that native focus stays true fails: the actual refusal leaves an
enabled, mounted, empty field with the IME dismissed and focus false. The
[fresh screenshot](qa/2026-10-14-coach-review/coach-review-voice-retained-focus-interrupted-ae3efb5a.png)
shows the entire field, disabled Review and missing-model guidance. This does not
reproduce hidden focused input. Native listening disables editing temporarily;
the rare immediate-settlement path that retains focus is covered by source tests
and remains unobserved natively. The failed assertion is retained, not converted
to a retained-focus pass. The completed normal/large sequences above explicitly
refocus after retry.

The final external receiver received and opened schema17 JSON at
11:30:17.041Z: **36 arrays / 1,082 records**, all actual and draft payloads
unchanged against the3de failure export. Only existing draft/load-map autosave
timestamps refresh. See [comparison](qa/2026-10-14-coach-review/coach-review-voice-keyboard-comparison-ae3efb5a.json)
and [external receiver](qa/2026-10-14-coach-review/coach-review-voice-keyboard-export-ae3efb5a-fresh-receiver.png).
The initial share helper stopped on an empty dump after selecting the receiver;
fresh receiver UI plus its newly timestamped file verified the export separately.
Font is restored to1.0. #364 remains open for successful recognizer, current iOS,
physical-device and broader acceptance checks. No score increase is claimed.

The first styling candidate03ec4a76 failed full verification in three workout
unit cases. Fresh fixture graphs and effect-owned focus disposal corrected test
cross-contamination;40edbf9f and3de55425 then passed1,202/144. This harness history
is retained alongside the separate native visibility defect.

Current fixture is QA Cycle B active with its existing unfinished session and
reviewed draft; the earlier private cycle is paused. Restoring the original active
cycle requires two additional explicit lifecycle events and will not restore the
old record count. Preserve exported synthetic backups; do not rewrite receipts.

Physical S25 Ultra, installed offline recognizer/model, actual speech, microphone
denial, current iOS, accessibility and participant comprehension remain unverified.
The combined source3f1752ed has the keyboard native retest and unchanged external
record comparison in doc50. Voice-specific retest is bound to057d5936 above.
Gemini remains separate disabled preparation. The
public content gate remains empty pending qualified human review. Source tests
and typed previews do not establish full AI coaching or store readiness.

Raw evidence, helper scripts, exports and source/build receipts are packaged in
[the hashed manifest](qa/2026-10-14-coach-review/manifest.json).
Each observation is bound to its stated binary. No issue
closure, merge, store submission or score increase is claimed.
