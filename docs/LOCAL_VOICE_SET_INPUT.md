# Local voice set entry: implementation and acceptance contract

Issue #336 is partially implemented: a native dependency, local-only adapter,
strict typed parser, and review component are integrated as an optional panel
below the current workout set's actual fields. Choose **Use optional voice set
entry**, then **Speak a set entry**. No voice callback saves an actual set or
changes training progression. Applying reviewed values fills the existing local
draft; the normal **Complete** or **Save correction** control remains required.

The initial grammar is English (en-US), bounded to 500 characters. It recognizes
explicit reps, load with kg/lb, duration with seconds/minutes, distance with
meters/km/miles, and optional RPE/RIR (including “two reps left”). Number words
are supported. Unknown prose, duplicate fields, missing actual required values,
invalid numbers, and values incompatible with the current set stay unresolved.
Load converts into the current input's declared kg/lb unit, with that unit shown
in review. Unknown legacy input requires explicit spoken kg/lb and retains the
spoken measurement and its declared unit. No profile/target unit is guessed for
legacy results. Seconds and meters are canonical.
Planned targets are never assumed to be observed results. Users can correct the
transcript and refresh the preview, or continue with manual entry.

Integration must bind owner, session, version, workout exercise, exercise/variant,
set number, actual load unit, required fields and allowed fields. OnApply must
recheck this complete binding against current refs and merge only reviewed values
into the current unsaved draft, preserving unrelated user input. Its boolean result
states whether that draft update was accepted. This does not claim an actual set
save; the usual recoverable draft may checkpoint the reviewed numeric input.
The binding also includes cycle/week/workout, the raw current input, target and
original saved set snapshot, and permanent focus/input generation. A synchronous
input nonce rejects stale apply callbacks even before React renders typed edits.
The immediate set-write mutex blocks voice application before state updates.
The panel is available only for the current unsaved set or explicit correction,
and is disabled during set/feedback/readiness/revision/finish writes. It preserves
unrelated fields, has a strict numeric-field allowlist and consumes previews once.
Dismiss, unmount, binding change, app background, failure or a 20-second timeout
ends capture. A stale callback cannot apply to another owner or set; repeated
confirmation callbacks consume the same preview only once.

Audio recording persistence is disabled. No audio files or unconfirmed transcript
are deliberately saved or logged by the adapter. Confirmed numeric fields use the
existing local draft/set lifecycle. No cloud speech fallback or provider API key
is required or configured. Permission prompts occur only on explicit voice intent:
microphone on both platforms and speech authorization on iOS. Declining access,
missing recognition services/models, or unavailable local locale leaves manual entry.
No automatic language-model download, paid service or device setting change occurs.

Android requires API33 or higher and an installed on-device English recognizer.
The library's API31/32 offline preference path is refused because it does not provide
the same guarantee as createOnDeviceSpeechRecognizer. iOS uses the requested locale
probe and native fail-closed guard; minimum dependency deployment target is iOS16.4.
A Samsung S25 Ultra model name does not establish recognizer/model availability.
This feature has no Gemini Nano dependency.

Source regression checks cover explicit units, missing/ambiguous/incompatible input,
permission cancellation, background/timeout, stale results and inert review.
Native audio acceptance is pending: Android native compile and installed permission
UI; real S25 Ultra with language installed and network unavailable; unsupported
locale and denial/revocation; interruption/background; actual confirmed saved records;
TalkBack, keyboard and large text. Windows cannot validate iOS speech: a Mac build
and signed physical iPhone are still required. Inspect release logs/network behavior
before asserting that no platform recognizer traffic occurs. Expo Go does not include
this custom native dependency.

Primary sources checked 2026-10-13:

- [Android SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer): on-device recognizer, availability and permissions.
- [Android RecognizerIntent](https://developer.android.com/reference/android/speech/RecognizerIntent): EXTRA_PREFER_OFFLINE is a preference that implementations may ignore.
- [Apple supportsOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition) and [requiresOnDeviceRecognition](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition): per-recognizer local capability and required processing.
- [Apple speech permission](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition): explicit speech authorization and usage description.
- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/): native dependencies need rebuilt development/release binaries.
- [Pinned maintainer changelog](https://github.com/jamsch/expo-speech-recognition/blob/8b31e399b1bbc7b89cd82acdad595a14dc57daff/CHANGELOG.md): SDK57/RN0.86 compatibility; native compilation remains a separate check.

Provenance and private native changes are recorded in
`vendor/expo-speech-recognition/SHIFT6_PROVENANCE.md`.
