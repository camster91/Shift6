# Continue native QA on your PC

Historical handoff: the setup problems and test counts below describe the original
candidate. For current priorities and the reconciled issue backlog, use
[doc 43](43_SHIPPING_GOAL_AND_TODO.md). Dated native evidence is in docs 36,
39, 40, 41 and [42](42_GUARDED_LOCAL_WORKFLOWS_QA.md); each report identifies
its own source and binary. Latest handover/backup/large-text observations and exact local launch commands are in [doc 47](47_ATOMIC_HANDOVER_QA.md). Earlier failures are not assumed to remain present.

Handoff: 13 October 2026. The app is mobile-only and guest-only; no backend is
required. Merging the implementation does not certify a store release or a
100/100 human usability score.

## Start on Windows (PowerShell)

Install Git, Node.js 22, Temurin JDK 21 and Android Studio with its Android SDK.
Enable virtualization and configure a hardware-accelerated Android emulator,
or connect an Android phone with USB debugging enabled. Configure JAVA_HOME
and Android SDK tooling using the Android Studio setup instructions.

For a new checkout:

```powershell
git clone https://github.com/camster91/Shift6.git
cd Shift6
git switch main
npm ci
Copy-Item .env.example .env
npm run android
```

For an existing checkout, preserve local changes before switching to main,
then run `git pull --ff-only` and `npm ci`. Only create `.env` if it does not
already exist. Keep `EXPO_PUBLIC_RELEASE_MODE=guest-only` and the API URL empty.

`npm run android` builds and starts the native development app. Use `npm start`
for subsequent Metro sessions. Expo Go cannot validate the native health
integrations. Run `npm run verify` to repeat the source checks locally.

Windows cannot run Xcode or the iOS Simulator. Use a Mac for `npm run ios`, or
configure a signed EAS build for a physical iPhone. The existing unsigned iOS
artifact is for a Mac simulator, not an installable iPhone build.

## Existing build and QA evidence

- Source quality at 379ebedd passed CI, including 502 tests in 84 suites.
- [Native build 38323698031](https://github.com/camster91/Shift6/actions/runs/38323698031)
  compiled both platforms from app source matching this handoff. Its
  `android-test-release` artifact is a standalone test APK; it is not store signed.
- iPhone simulator automation observed setup completion and recovery of setup
  choices after force-close. Earlier failures included automation issues; they
  must not be treated as app failures without reproduction.
- [Runtime QA 38331464552](https://github.com/camster91/Shift6/actions/runs/38331464552)
  preserved screenshots and UI trees in `ios-guest-runtime-qa`. Its journey did
  not finish. A subsequent targeted run
  [38333567903](https://github.com/camster91/Shift6/actions/runs/38333567903)
  was still pending at handoff; inspect its actual conclusion and results.json.
- Local Android software emulation was blocked by repeated System UI hangs.
  Those captures provide no accepted Android visual QA evidence.

## Reproduce and fix first

1. Saving a private draft displays “queued for sync” despite guest-only storage.
   Correct the copy to explain local persistence without promising cloud backup.
2. Setup step 4 requires the training-time choice below the initial viewport.
   After selecting days and duration, disabled Continue does not explain the
   remaining choice. Make required choices and the missing-field hint clear.
3. Public plans remain gated by the empty approval manifest. Test the beginner
   journey through building a private plan; do not bypass qualified content review.
4. Complete private workout creation, custom movement, cycle start, personal
   goal creation, baseline, correction and target-revision checks. The earlier
   harness had input-focus problems; verify the workout was actually added.
5. Verify saved sets and an unsaved field survive force-close, partial-workout
   completion works, and an exported JSON file can be received and read.
6. Check goal metric labels under Imperial preferences: load/distance choices
   currently use canonical kg/meters. Record whether that is clear to users.

Use synthetic records. Record the commit, device/OS, steps, expected and actual
results, and screenshots for each finding. Continue with the weighted human-use
tasks in [doc 34](34_HUMAN_USE_ACCEPTANCE.md).

Physical-device VoiceOver/TalkBack, large text, permissions, reminders, health
integration, offline recovery, deletion, performance and human usability remain
release checks. Apple/Google signing, store declarations and public content
approval remain open. No final whole-app score was established in this session.
