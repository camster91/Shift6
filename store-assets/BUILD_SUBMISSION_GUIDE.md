# Shift6 - Build & App Store Submission Guide

## Prerequisites

### Required Tools
- **macOS** (for iOS builds)
- **Xcode 15+** (for iOS)
- **Android Studio** (for Android)
- **Node.js 18+**
- **npm**

### Required Accounts
- **Apple Developer Program** ($99/year) - https://developer.apple.com
- **Google Play Developer** ($25 one-time) - https://play.google.com/console

---

## Part 1: Building the App

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build Web Assets
```bash
npm run build
```

### Step 3: Sync with Native Projects
```bash
npx cap sync
```

---

## Part 2: iOS App Store Submission

### Step 1: Open in Xcode
```bash
npm run cap:ios
# Or manually: npx cap open ios
```

### Step 2: Configure Signing
1. Open `ios/App/App.xcodeproj` in Xcode
2. Select the "App" target
3. Go to "Signing & Capabilities" tab
4. Select your **Team** from the dropdown
5. Xcode will automatically manage signing

### Step 3: Set Bundle Identifier
1. In Xcode, select the "App" target
2. Change Bundle Identifier to: `com.shift6.app` (or your own)
3. Ensure it matches your App Store Connect app

### Step 4: Add App Icon
1. In Xcode, go to `App > Assets.xcassets > AppIcon`
2. Drag a **1024x1024 PNG** icon to the slot
3. Xcode will generate all required sizes

### Step 5: Create Archive
1. Select "Any iOS Device" as build target (not a simulator)
2. Menu: **Product > Archive**
3. Wait for build to complete

### Step 6: Upload to App Store Connect
1. In Xcode Organizer (Window > Organizer)
2. Select your archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Select "Upload"
6. Follow the prompts

### Step 7: Complete App Store Connect Listing
1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Fill in:
   - **App Information**: Name, subtitle, categories
   - **Pricing**: Free
   - **Privacy Policy URL**: Your hosted privacy policy
   - **App Review Information**: Notes for reviewers
   - **Version Information**: What's new, description, keywords
   - **Screenshots**: Required sizes below

### iOS Screenshot Requirements
| Device | Size |
|--------|------|
| iPhone 6.9" (15 Pro Max) | 1320 x 2868 |
| iPhone 6.5" (14 Plus) | 1284 x 2778 |
| iPhone 5.5" (8 Plus) | 1242 x 2208 |
| iPad Pro 12.9" | 2048 x 2732 |

### Step 8: Submit for Review
1. Add screenshots for all required devices
2. Complete all metadata fields
3. Click "Submit for Review"
4. Review typically takes 24-48 hours

---

## Part 3: Google Play Store Submission

### Step 1: Open in Android Studio
```bash
npm run cap:android
# Or manually: npx cap open android
```

### Step 2: Create Signing Key
```bash
# Generate a keystore (keep this safe!)
keytool -genkey -v -keystore shift6-release.keystore -alias shift6 -keyalg RSA -keysize 2048 -validity 10000
```

### Step 3: Configure Release Signing
Edit `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('path/to/shift6-release.keystore')
            storePassword 'your-store-password'
            keyAlias 'shift6'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 4: Build Release Bundle
In Android Studio:
1. Menu: **Build > Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Choose your keystore
4. Select **release** build variant
5. Click **Create**

The AAB will be at: `android/app/release/app-release.aab`

### Step 5: Create Google Play Console Listing
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: Shift6 - Bodyweight Fitness
   - Default language: English
   - App or game: App
   - Free or paid: Free

### Step 6: Complete Store Listing
1. **Main store listing**:
   - Short description (80 chars)
   - Full description (4000 chars)
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots

2. **Content rating**: Complete questionnaire
3. **Target audience**: 13+ (fitness app)
4. **News apps**: No
5. **COVID-19 apps**: No

### Android Screenshot Requirements
| Type | Size |
|------|------|
| Phone | 1080 x 1920 minimum |
| 7" Tablet | 1200 x 1920 minimum |
| 10" Tablet | 1600 x 2560 minimum |

### Step 7: Data Safety Declaration
In Play Console, complete the Data Safety form:
- **Data collection**: No (we don't collect any data)
- **Data sharing**: No
- **Data handling**: All data stored locally
- **Security practices**: Data encrypted in transit (N/A - no transmission)

### Step 8: Upload AAB and Submit
1. Go to **Release > Production**
2. Click "Create new release"
3. Upload your `.aab` file
4. Add release notes
5. Click "Review release"
6. Click "Start rollout to Production"

---

## Part 4: App Icon Requirements

### iOS
- **1024x1024 PNG** (no transparency, no alpha channel)
- Square corners (iOS rounds them automatically)

### Android
- **512x512 PNG** (for Play Store listing)
- **Adaptive icon** (foreground + background layers)
- Files in `android/app/src/main/res/mipmap-*` folders

### Icon Design Guidelines
- Use the cyan (#06b6d4) as the primary brand color
- Keep the design simple and recognizable at small sizes
- Consider using the "S6" or dumbbell motif

---

## Part 5: Testing Before Submission

### iOS TestFlight
1. Upload build to App Store Connect
2. Go to TestFlight tab
3. Add internal testers
4. Test on real devices

### Android Internal Testing
1. In Play Console, go to Release > Testing > Internal testing
2. Create a release with your AAB
3. Add tester email addresses
4. Test on real devices

---

## Troubleshooting

### iOS Build Errors
- **Signing issues**: Ensure your Apple Developer account is properly configured
- **Asset errors**: Make sure all icon sizes are provided
- **Archive fails**: Try Product > Clean Build Folder first

### Android Build Errors
- **Gradle sync fails**: Check `variables.gradle` versions
- **Signing errors**: Verify keystore path and passwords
- **ProGuard issues**: Check `proguard-rules.pro`

### Common Issues
- **Rejection: Missing privacy policy** - Ensure URL is accessible
- **Rejection: Incomplete metadata** - Fill all required fields
- **Rejection: Crashes** - Test thoroughly before submission

---

## Version Management

When releasing updates:

1. Update version in `package.json`
2. Update `CFBundleShortVersionString` in `ios/App/App/Info.plist`
3. Increment `CFBundleVersion` for each build
4. Update `versionName` in `android/app/build.gradle`
5. Increment `versionCode` for each build

---

## Quick Commands Reference

```bash
# Development
npm run dev

# Build for production
npm run build

# Sync Capacitor
npx cap sync

# Open iOS project
npm run cap:ios

# Open Android project
npm run cap:android

# Run tests
npm run test:run

# Lint code
npm run lint
```

---

## Support

- GitHub Issues: https://github.com/camster91/Shift6/issues
- Capacitor Docs: https://capacitorjs.com/docs
- Apple Developer: https://developer.apple.com/documentation
- Android Developer: https://developer.android.com/docs
