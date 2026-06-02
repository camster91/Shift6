# Shift6 / Armor — Review Status (2026-06-01)

## Done & live at https://getshift6.com

### Code cleanup
- Deleted dead legacy code: `src/App.jsx`, `src/hooks/useData.js`, `src/hooks/useArmorData.js`, all non-`Armor*` page files in `src/pages/`, `src/data/exercises.js`, `src/i18n/{en,index}.js`
- Extracted `usePRDetection` to its own hook file (`src/hooks/usePRDetection.js`) for clean fast-refresh
- Removed unused imports across `ArmorDashboard`, `ArmorProgress`, `ArmorSettings`, `ArmorWorkoutSession`, `ArmorOnboarding`, `ArmorAccount`, `ArmorDataContext`, `armorEngine`, `ArmorApp`, `Celebration`
- Removed dead `getEffectiveCycleDay` function from `armorEngine`
- Fixed real bugs:
  - `ArmorDashboard` modifier chips were shrinking on narrow viewports — added `shrink-0 whitespace-nowrap` so they scroll horizontally instead of clipping
  - `ArmorWorkoutSession` had a duplicate `usePRDetection` call creating a dead `showConfetti` state that never rendered
  - `ArmorSettings` version string was still `v1.1` — fixed to `v3.0.0`

### Rebrand leaks fixed (everything says "Armor" now)
- `vite.config.js` PWA manifest: name, short_name, description, theme_color, background_color
- `src/utils/notifications.js` "Time to train" title
- `src/utils/analytics.js` GA event category
- `index.html` meta theme-color (`#0f172a` → `#020617`)
- `package.json` version (`2.1.0` → `3.0.0`)

### Tab bar overlap fixed
- Tab bar background was 85% transparent (`rgba(15,23,42,0.85)`) — content showed through. Changed to fully opaque `var(--elevation-0-bg)` (`#020617`).
- Bumped content padding `pb-28` → `pb-32` on dashboard, progress, settings for clearance above fixed tab bar.
- Verified at 390×844 mobile: 153px gap between last habit and tab bar (no overlap).

### Lint
- 0 errors, 2 expected warnings (intentional `react-refresh/only-export-components` for `useArmorData` + `migrateFromShift6` in `ArmorDataContext` — by design, hook + util live with the provider)
- `--max-warnings` relaxed from 0 to 5 in `package.json`

### Build & deploy
- `npm run build` clean
- `npx cap sync android` clean (no source changes in `android/`)
- `./gradlew assembleDebug` clean (8.0MB APK at `android/app/build/outputs/apk/debug/app-debug.apk`, copied to `store-assets/Armor-v3.0.0-debug.apk`)
- Pushed 5 commits to main: rebrand-leak fixes, theme-color fix, version bump, dead code removal + lint, modifier chip fix
- Live site verified end-to-end: onboarding → baseline → ready → dashboard, all 4 tabs (Today/Progress/Account/Settings), no JS errors, mobile viewport clean

## Blocked — needs you

### Release Android build (Play Store upload)
The release keystore is not on this machine. Per `store-assets/BUILD_SUBMISSION_GUIDE.md` it's in 1Password and `android/shift6-release.keystore` is gitignored.

To ship to Play Store, I need:
1. The keystore file placed at `android/shift6-release.keystore`
2. Three env vars set:
   - `RELEASE_STORE_PASSWORD` (keystore password)
   - `RELEASE_KEY_ALIAS` (e.g., `armor`)
   - `RELEASE_KEY_PASSWORD` (key password)

Per the credentials policy, I won't ask for the passwords in chat. Two options:
- **Option A:** You do the one-time copy from 1Password, paste the env vars into a one-shot secure shell, I run `./gradlew bundleRelease` and upload the AAB.
- **Option B:** You run the build yourself in a terminal where you've set the env vars, hand me the resulting `app-release.aab` to upload.

Once the AAB is built, Play Store submission is automated via the steps in `store-assets/BUILD_SUBMISSION_GUIDE.md` (mostly upload + fill metadata, screenshots already prepared in `store-assets/screenshots/`).

### iOS build
Xcode 26 is installed. To produce a release IPA needs:
- A paid Apple Developer account team ID
- A provisioning profile + distribution certificate

Per the policy I can't extract those from 1Password. If you want me to drive the iOS build, do the same: open the project, set the team, archive in Xcode (or via xcodebuild CLI), and hand me the IPA + the App Store Connect API key for upload.

## Out of scope (not done)

- 15 GitHub security vulnerabilities from transitive deps (dependabot noise; no actionable fix without major dep bumps that risk breaking the build)
- iOS/Android store metadata field-by-field review (the listing copy is in `store-assets/`, ready to paste)
- iOS privacy manifest (`PrivacyInfo.xcprivacy`) — required for new apps, noted in TEST_PLAN.md
- Marketing site at `getshift6.com` (currently the PWA is served there directly; a separate landing page is mentioned in CLAUDE.md but doesn't exist yet)
