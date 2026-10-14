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
