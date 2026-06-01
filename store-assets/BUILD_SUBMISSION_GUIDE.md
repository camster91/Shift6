# Armor — Build & App Store Submission Guide

**App name:** Armor (formerly Shift6)
**Bundle ID:** `com.shift6.app` (preserved for store listing continuity)
**Version:** 3.0.0 (versionCode 3)

## Prerequisites

### Required Tools
- **macOS** (for iOS builds)
- **Xcode 15+** (for iOS)
- **Android Studio** (for Android) — OR command-line tools (this machine has `android-commandlinetools` via Homebrew)
- **Node.js 22+**
- **JDK 21** (`brew install openjdk@21`)

### Required Accounts
- **Apple Developer Program** ($99/year) — https://developer.apple.com
- **Google Play Developer** ($25 one-time) — https://play.google.com/console

---

## Part 1: Build Web Assets

```bash
cd ~/Shift6
npm install
npm run build
npx cap sync
```

---

## Part 2: Android Build & Submission

### Option A: Command Line (no Android Studio)

**Environment setup** (one-time):
```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$PATH
```

**Build debug APK** (for sideloading/testing):
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

**Build debug AAB** (Play Store internal testing):
```bash
./gradlew bundleDebug
# Output: android/app/build/outputs/bundle/debug/app-debug.aab
```

**Build release AAB** (Play Store production — requires keystore):
```bash
export RELEASE_STORE_PASSWORD='<from 1Password>'
export RELEASE_KEY_ALIAS='<from 1Password>'
export RELEASE_KEY_PASSWORD='<from 1Password>'
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Install on device for testing:**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Option B: Android Studio
```bash
npm run cap:android  # Opens Android Studio
# Then: Build > Generate Signed Bundle / APK
```

### Google Play Submission Steps
1. Log in to https://play.google.com/console
2. Select **Shift6** (or create new app named **Armor**)
3. Release > Production > Create new release
4. Upload `app-release.aab`
5. Fill out:
   - **Short description:** "Metabolic armor, maximum VO2 max, and 5 longevity pillars for busy professionals."
   - **Full description:** see `google-play-listing.md`
   - **Graphics:** upload `feature-graphic.png` and screenshots
6. Content rating: IARC questionnaire
7. Privacy policy: upload `PRIVACY_POLICY.md`
8. Submit for review (1-3 days typical)

---

## Part 3: iOS App Store Submission

### Build via Xcode
```bash
npm run cap:ios
# Or manually: npx cap open ios
```

In Xcode:
1. Select "App" target
2. Signing & Capabilities: select your Team
3. Product > Archive
4. Distribute App > App Store Connect > Upload
5. Wait for App Store Connect processing (~5-15 min)

### App Store Connect Steps
1. https://appstoreconnect.apple.com
2. My Apps > **Shift6** > + Version
3. Fill in version 3.0.0 metadata
4. Upload screenshots (6.5" and 5.5" required, iPad optional)
5. Submit for review

---

## Part 4: iOS App Store Submission

### What's pre-configured
- [x] `CFBundleDisplayName: Armor` in Info.plist
- [x] `UIUserInterfaceStyle: Dark` (forces dark mode on launch)
- [x] `UIStatusBarStyle: LightContent` (white status bar on dark)
- [x] Portrait-only orientation (workout apps are portrait)
- [x] `LaunchScreen.storyboard` rebuilt with crossed-swords + ARMOR wordmark
- [x] `AppDelegate.swift` sets light status bar on launch
- [x] `MARKETING_VERSION 3.0.0`, `CURRENT_PROJECT_VERSION 3`
- [x] Web assets synced via `npx cap sync ios`

### Build via Xcode (Mac required)
```bash
npm run cap:ios
# Or manually: npx cap open ios
```

In Xcode:
1. Select "App" target
2. Signing & Capabilities: select your Apple Developer Team
3. Project > Bundle Identifier: `com.shift6.app` (preserve for listing continuity)
4. Product > Archive
5. Distribute App > App Store Connect > Upload
6. Wait for App Store Connect processing (~5-15 min)

### App Store Connect Steps
1. https://appstoreconnect.apple.com
2. My Apps > **Shift6** (existing app — bundle ID preserved) > + Version 3.0.0
3. Update version metadata:
   - **What's New in This Version:** "Complete Armor redesign — Apple HIG design system, 6-week periodization, VO2 Max intervals, plate math, and 5 contingency protocols."
   - Screenshots: 6.5" (iPhone 11 Pro Max) and 5.5" (iPhone 8 Plus) required
4. Submit for review (24-48 hours typical)

### Known iOS Build Issue (on this machine)
Only Xcode CommandLineTools installed (`/Library/Developer/CommandLineTools`). Full Xcode required for `xcodebuild` archive. Storyboard XML validated with `xml.etree.ElementTree`. Info.plist validated with `plistlib`. Both parse correctly.

---

## Part 5: Updating the App Later

```bash
# 1. Make code changes in src/
# 2. Bump version in android/app/build.gradle
# 3. Rebuild
npm run build
npx cap sync
cd android && ./gradlew assembleDebug  # for testing
./gradlew bundleRelease                  # for store upload
```

---

## File Locations
- **APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **AAB:** `android/app/build/outputs/bundle/{debug,release}/app-*.aab`
- **Web build:** `dist/`
- **Capacitor config:** `capacitor.config.json`
- **iOS native:** `ios/`
- **Android native:** `android/`
- **Store assets:** `store-assets/`
- **Keystore (release):** `android/shift6-release.keystore` (NOT in repo — store password in 1Password)
