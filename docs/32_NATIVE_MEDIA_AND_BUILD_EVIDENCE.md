# Native media and build evidence

## Implemented media

Custom images and motion were generated through Higgsfield, using the existing
charcoal, lavender, mint and blue design tokens. Job IDs, prompts and processing
notes are recorded in `assets/higgsfield/provenance.json`. Original downloads are
in `assets/higgsfield/source`; mobile exports are in `assets/higgsfield/runtime`.

- Journey artwork appears in setup review and Home.
- Return artwork accompanies the existing seven-day return cue.
- Session-saved artwork appears on non-skipped workout summaries.
- Two four-second, silent, local H.264 animations are available on explicit tap.
- The launcher has an opaque 1024px PNG. Android has transparent adaptive and
  matching monochrome exports. The splash uses the same six-module mark.

Runtime stills use 960px JPEG exports for native Image compatibility on both
platforms; videos use 960px H.264 baseline/yuv420p with fast-start metadata.
The five decorative runtime files total approximately 187KB.
The images are abstract decoration, not exercise technique demonstrations or
claims about training outcomes. Generated assets remain subject to human brand,
licensing, device crop and store review.

## Playback and accessibility

Still images render first. The player is mounted only after the user requests
motion while the screen is focused, the app is active and reduced motion is off.
Motion stops on completion, screen exit, backgrounding, a reduced-motion change,
or a decoder failure. Foregrounding never resumes it automatically. There is no
looping, audio, background playback, picture-in-picture or full-screen playback.
Training facts and primary actions remain outside the art. Home places its
Start/Resume action before decoration. The Play/Stop button is accessible;
decorative media is hidden from assistive technology.

Tests cover explicit playback, reduced motion, background/foreground behavior,
a live accessibility preference racing the initial read, and media failure.
Root navigation also follows the reduced-motion preference. These tests do not
replace VoiceOver/TalkBack and hardware decoder testing.

## Native configuration

`app.json` configures both application identifiers, version counters, launcher,
splash, Android API 36 and silent media plugin capabilities. Android overlay, microphone
and broad media/storage permissions are blocked. The unused Face ID purpose
string is disabled. Optional health integrations
retain their existing read permissions and consent flow. `eas.json` configures
an internal preview APK and a production Android app bundle, with staging and production
environments. The preview profile uses the supported `staging` runtime value.
Production profiles increment native build numbers.

The manual `.github/workflows/native-validation.yml` generates managed native
projects and compiles an Android release-mode test APK and an unsigned iOS
Release simulator app on macOS. It uploads test artifacts, without submitting
to stores. This workflow has been added locally; it has not run on GitHub.

## Local evidence, 2026-10-11

- 79 Jest suites / 473 tests pass.
- Formatting, lint, TypeScript, generic asset checks, native PNG asset checks,
  release configuration and tracked-secret checks pass.
- Expo Doctor now passes 21/21 checks when Node uses the workspace proxy and
  system CA bundle. This resolves the two previously unverified network checks;
  no TLS verification was disabled.
- iOS, Android and web JavaScript exports pass.
- Expo prebuild generates both native projects in an isolated candidate at
  `/workspace/shift6-native-candidate`, leaving the managed repository intact.
- Native Android compilation passes with a complete JDK 21, Android SDK/API 36
  and NDK 27.1.12297006. Final incremental release-mode builds pass for x86_64
  (55s) and arm64-v8a (1m 2s), each with 670 Gradle tasks. Java uses the
  workspace proxy and system certificate store; TLS verification stays enabled.
  APK inspection confirms `com.shift6.app`, version `0.1.0`/1, minimum API 26,
  target API 36, and no overlay, microphone or broad media/storage permissions.
  `apksigner verify` passes. The certificate is the generated Android Debug test
  certificate, not a production signing identity.
  Phone test artifact: `/workspace/shift6-artifacts/Shift6-android-preview-final-arm64.apk`.
  SHA-256: `2f81bdb37f7dcf752683ee2e121cbb0cfe6b53d60bb297618b3c153a2f000a65`.
  All five runtime JPEG/MP4 files inside this APK match their source exports by
  SHA-256, recorded in `bundled-media-verification.json` beside the artifact.
  The x86_64 emulator APK is separate from the phone download.
- iOS cannot be compiled on this Linux workspace; Xcode/macOS validation is
  outstanding. No signed iOS app or production-signed Android binary exists.
- Android 16 software-emulator attempts using Google APIs and Google ATD booted
  but suffered system-server/watchdog restarts before installation. This workspace
  has no `/dev/kvm`; those attempts provide no app runtime evidence.
- Android 11 AOSP ATD booted and installed the x86_64 APK. Its first launch
  exposed a configuration error introduced in this change: runtime environment
  `preview` was unsupported. EAS preview and native CI now use `staging`;
  production explicitly uses `production`. The release-config check validates
  profile and CLI environment names, and regression tests run EAS values through
  the actual parser. The invalid builds were removed and both architectures
  rebuilt with staging. Compilation alone did not catch this startup error.
- The Android 11 test image disables drawing by default. Enabling its
  `debug.hwui.drawing_enabled` property restored real screenshots. The test
  image's watchdog is extended to 300,000ms for software emulation. Performance
  timings on this environment are not representative of physical devices.
  The Pixel 5 emulation overlay was disabled for the final generic small-phone
  fixture; its fixed 136px cutout was oversized at the reduced resolution.
- Native small-screen testing (320 × 640dp, offline) found that setup questions
  retained the previous question's scroll offset. The setup screen now remounts
  on step changes; question headings use `h1` and Back has a 48dp minimum target.
  Retesting confirmed that advancing after scrolling opens the next question at
  its header, with the previous goal choice retained. Screenshot and accessibility
  hierarchy evidence is saved under `/workspace/shift6-artifacts`.
  Continue/Save setup now sits outside the scrolling choices in a safe-area
  footer, removing the need to traverse every equipment choice after selecting
  one. Equipment uses checkbox semantics; recovery headings are announced.

## Recovery and native fixes

Native captures exposed an image-layout bug: the bundled poster kept its intrinsic
size and showed a blank corner inside the smaller frame. Images and the video
view now receive explicit 100% frame dimensions. This was found by inspecting
native screenshots, not by export or asset validation.

Changing Android system font size recreated the activity and discarded unfinished
setup. Migration 22 adds an owner-scoped, local-only `onboarding_drafts` table.
Choices save after user input; Continue checkpoints the next step before advancing.
Restart restores the flow, choices and movement/accessibility preferences. Opening
setup alone creates no phantom guest data. A successful explicit Save setup clears
the draft after profile and preference persistence. Drafts participate in account
adoption, local export (schema 11), and owner-scoped deletion. SQLite integration
and screen tests cover recovery, corrupt data, owner isolation, repeated adoption,
occupied-owner rejection, failed checkpoints and successful save cleanup.

## Final Android runtime observations

The x86_64 APK completed all six setup steps offline on the Android 11
AOSP ATD fixture. Native retests confirmed:

- Continue remains reachable after equipment selection without traversing the
  full list. Setup step changes return to their heading.
- Changing system font scale to 1.5× and then forcing an app restart retains the
  review step and choices, with an enabled Save setup action.
- The whole JPEG poster renders. A captured H.264 movie frame differs from the
  still, shows the full composition, and returns to Play after completion.
- Reduced motion removes the playback control; restoring the preference leaves
  the movie stopped.
- Malformed UTF-8 links open Link unavailable on warm and cold launch.
- Save setup opens the native program library. A copy of the test fixture’s
  SQLite database confirms migration 22, the selected goal/equipment/rhythm/units,
  health off, and zero remaining setup drafts after saving.
- Home movie playback stops on background and remains stopped after foregrounding.
  Completed setup survives another cold launch without returning to setup.
- The crash buffer is empty after these checks.

Evidence: `/workspace/shift6-artifacts/native-final-check.log`,
`android-journey-still-final.png`, `android-journey-motion-frame-1.png`,
`android-review-large-text-final.png`, `android-video-runtime-final.txt`, `native-background-check.log`, and the
warm/cold recovery screenshots, plus `native-profile-persistence.json`. Only the
journey movie was exercised natively;
the session-saved movie has shared-player tests and binary/codec validation.

ATD has fake system UI and software graphics. Its accessibility hierarchy clips
some bottom control bounds against its reserved navigation area even when the
screen capture shows the full control. These results do not certify navigation
bar insets, minimum accessible target bounds, TalkBack, VoiceOver or performance
on physical devices. The device matrix below remains required. Runtime observations were collected
before the final library-copy correction (removing “You’s goals”); the corrected
source subsequently compiled for both architectures.

## Required device evidence

On small and large iPhones, an iPad, a small Android phone and a large-font Android
device, check:

1. Cold launch, adaptive circular/squircle/themed launcher crops and splash.
2. Setup review, Home, return and summary layout at default and largest text.
3. VoiceOver/TalkBack order, reachable primary action and Play/Stop announcement.
4. Reduced motion before launch and toggled during playback; no automatic restart.
5. Offline cold launch, movie playback, decoder failure and background/foreground.
6. Keyboard visibility while logging, draft restoration after process termination,
   completed/partial/skipped summaries, and repeated sync/account adoption.
7. Optional health permission grant/deny/revoke, notifications and deep links.

Store signing, device accessibility/usability, reviewed public fitness content,
backend protocol integration and unresolved dependency audit findings remain
release gates. Custom visuals and successful exports do not establish 100/100
human usability or store readiness.

The strict release check currently requires an explicitly selected guest-only or
connected release mode. The independent content check also fails because there
are no approved enabled Shift IDs. Neither gate was bypassed. The remaining URL
decoder advisory has a published 0.5.0 release, but that release switches to ESM;
Expo Router 57's query-string 7.1.3 calls the existing CommonJS decoder directly.
An unconditional override would change that module contract. A compatible Router
update or a separately reviewed remediation is required. Braces, node-forge and
sprintf-js still report their current latest releases as affected. See doc 31
for the dependency graph and prior compatible fixes.

External native links now pass an 8,192-character bound and UTF-8 encoding check
through Expo Router's `+native-intent` hook on cold and warm launch. Valid input
is preserved without rewriting delimiters, plus signs or nested URLs. Invalid
input opens a recovery screen with a Home action. Tests cover normal IDs, Unicode,
auth-style query parameters, literal encoded percent signs, malformed UTF-8 and
oversized input. The active Router path uses built-in URL parsing; the affected
legacy decoder's exploitability in this app has not been established. This input
guard is a native robustness improvement, not closure of the dependency advisory
or protection for the web preview's inputs.
