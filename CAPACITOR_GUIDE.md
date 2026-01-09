# Shift6 - Capacitor App Store Deployment Guide

Capacitor has been successfully installed! Your PWA is now wrapped and ready to be built as native iOS and Android apps.

## 🎉 What's Been Set Up

- ✅ Capacitor Core installed
- ✅ iOS platform added (Xcode project in `/ios`)
- ✅ Android platform added (Android Studio project in `/android`)
- ✅ Build scripts added to `package.json`
- ✅ Basic splash screen configuration
- ✅ Git ignore rules for native builds

## 📱 Development Workflow

### Quick Commands

```bash
# Build web app and sync to native platforms
npm run cap:sync

# Open in Xcode (macOS only)
npm run cap:ios

# Open in Android Studio
npm run cap:android

# Build and open iOS
npm run cap:build:ios

# Build and open Android
npm run cap:build:android
```

### Manual Workflow

1. **Make changes to your React code**
2. **Build the web app**: `npm run build`
3. **Sync to native**: `npx cap sync`
4. **Open native IDE**: `npx cap open ios` or `npx cap open android`
5. **Build and run** in the native IDE

## 🍎 iOS App Store Deployment

### Prerequisites

- **macOS required** (cannot build iOS on Windows/Linux)
- **Xcode** installed (free from Mac App Store)
- **Apple Developer Account** ($99/year)
- **Physical iOS device** for testing (optional but recommended)

### Steps

1. **Open Xcode Project**
   ```bash
   npm run cap:ios
   ```

2. **Configure App Identity**
   - In Xcode, select the project root in the navigator
   - Update **Bundle Identifier**: `com.shift6.app` (or your preferred ID)
   - Select your **Team** (Apple Developer account)
   - Set **Version** and **Build Number**

3. **Add App Icons**
   - Need multiple sizes: 1024x1024 (App Store), 180x180, 120x120, etc.
   - Place in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Or use a tool like [AppIcon.co](https://appicon.co/)

4. **Configure Launch Screen**
   - Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`
   - Or create custom splash screen images

5. **Build for Testing**
   - Select a device or simulator
   - Click **Run** (▶️) in Xcode
   - Test all functionality

6. **Archive for App Store**
   - In Xcode: **Product → Archive**
   - Once archived, click **Distribute App**
   - Select **App Store Connect**
   - Follow the upload wizard

7. **App Store Connect**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create a new app listing
   - Upload screenshots (required sizes: 6.7", 6.5", 5.5")
   - Add description, keywords, privacy policy URL
   - Submit for review

**Estimated time:** 2-4 hours first time, then 30-60 min per update

## 🤖 Google Play Store Deployment

### Prerequisites

- **Android Studio** installed (Windows, macOS, or Linux)
- **Google Play Developer Account** ($25 one-time)
- **Android device** for testing (optional)

### Steps

1. **Open Android Studio Project**
   ```bash
   npm run cap:android
   ```

2. **Configure App Identity**
   - Open `android/app/build.gradle`
   - Update:
     - `applicationId "com.shift6.app"`
     - `versionCode 1` (increment for each release)
     - `versionName "1.0.0"`

3. **Add App Icons**
   - Need multiple densities: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
   - Place in `android/app/src/main/res/mipmap-*` folders
   - Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

4. **Generate Signing Key**
   ```bash
   keytool -genkey -v -keystore shift6-release-key.keystore -alias shift6 -keyalg RSA -keysize 2048 -validity 10000
   ```
   **IMPORTANT:** Keep this file and password safe!

5. **Configure Signing**
   - Create `android/keystore.properties`:
     ```properties
     storeFile=/path/to/shift6-release-key.keystore
     storePassword=YOUR_PASSWORD
     keyAlias=shift6
     keyPassword=YOUR_PASSWORD
     ```
   - Update `android/app/build.gradle` to use the keystore

6. **Build Release APK/AAB**
   - In Android Studio: **Build → Generate Signed Bundle / APK**
   - Select **Android App Bundle (AAB)** (recommended)
   - Choose your keystore and enter passwords
   - Select **release** build variant
   - Build will be in `android/app/release/`

7. **Google Play Console**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create a new app
   - Upload your AAB file
   - Add screenshots (phone, tablet, maybe 7" & 10")
   - Add description, category, content rating
   - Set up pricing and distribution
   - Submit for review

**Estimated time:** 2-3 hours first time, then 30-45 min per update

## 📋 Required App Store Assets

### Both Stores Need:

1. **App Icon** (1024x1024 PNG, no transparency, no rounded corners)
2. **App Description** (short & long)
3. **Screenshots** (various sizes for different devices)
4. **Privacy Policy URL** (required!)
5. **Keywords/Categories**
6. **Age rating**
7. **Contact information**

### Create Before Submitting:

- **Privacy Policy** (can use a generator)
- **Terms of Service** (optional but recommended)
- **Support website** or email
- **Marketing graphics** (feature graphic for Play Store)

## 🔌 Adding Native Features

### Common Capacitor Plugins

```bash
# Splash Screen (already configured)
npm install @capacitor/splash-screen

# Push Notifications
npm install @capacitor/push-notifications

# Camera
npm install @capacitor/camera

# App (for app info, URLs, etc.)
npm install @capacitor/app

# Status Bar (customize status bar)
npm install @capacitor/status-bar

# Haptics (already using vibrate)
npm install @capacitor/haptics

# Share (share workouts)
npm install @capacitor/share
```

After installing plugins, run:
```bash
npm run cap:sync
```

## 🐛 Common Issues & Solutions

### iOS Build Fails

**Issue:** "Signing requires a development team"
**Solution:** Select your Apple Developer Team in Xcode project settings

**Issue:** "Module not found"
**Solution:** Run `npx cap sync ios` and clean build folder in Xcode

### Android Build Fails

**Issue:** "SDK location not found"
**Solution:** Create `android/local.properties`:
```properties
sdk.dir=/Users/YOUR_USER/Library/Android/sdk
```

**Issue:** "Duplicate class found"
**Solution:** Clean build: `cd android && ./gradlew clean`

### App Crashes on Launch

**Issue:** White screen or immediate crash
**Solution:**
1. Check browser console in debug mode
2. Ensure `npm run build` completed successfully
3. Run `npx cap sync` after build changes
4. Check `capacitor.config.json` webDir is correct

## 📱 Testing on Real Devices

### iOS (macOS only)

1. Connect iPhone via USB
2. Trust computer on device
3. In Xcode, select your device from the device menu
4. Click **Run** (▶️)
5. On device: **Settings → General → Device Management** → Trust developer

### Android

1. Enable **Developer Options** on device:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect device via USB
4. In Android Studio, select your device
5. Click **Run** (▶️)

## 🚀 Next Steps

1. **Test the app**:
   ```bash
   npm run cap:ios    # or cap:android
   ```

2. **Add required icons and splash screens**
   - iOS: 1024x1024, 180x180, 120x120, etc.
   - Android: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi

3. **Create Privacy Policy**
   - Required by both app stores
   - Can use online generators

4. **Take Screenshots**
   - iOS: 6.7", 5.5" devices
   - Android: Phone and tablet

5. **Sign up for developer accounts**
   - Apple: https://developer.apple.com ($99/year)
   - Google: https://play.google.com/console ($25 one-time)

6. **Consider adding**:
   - Push notifications for workout reminders
   - Share functionality
   - Health Kit / Google Fit integration
   - Social features

## 📚 Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
- [App Icon Generator](https://appicon.co/)
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

## 💡 Tips

- **Version your builds**: Update version numbers for each release
- **Test thoroughly**: Both device and simulator/emulator
- **Start with TestFlight/Internal Testing**: Don't go straight to production
- **Read rejection reasons carefully**: App stores will tell you what's wrong
- **Keep backups of signing keys**: Losing them means starting over

---

Need help? Check the Capacitor documentation or create an issue on GitHub!
