# Coolify Deployment Guide - Shift6

## Prerequisites
- Coolify server access
- GitHub repository connected to Coolify

## Deployment Steps

### 1. Create New Resource in Coolify
1. Go to your Coolify dashboard
2. Click "New Resource"
3. Select "Docker Compose"
4. Choose your Shift6 repository
5. Select branch: `main`

### 2. Configuration
- **Name**: shift6
- **Domain**: Your domain (e.g., shift6.yourdomain.com)
- **Port**: 3000 (or let Coolify auto-detect)

### 3. Environment Variables
No special environment variables required. The app runs as a static SPA.

### 4. Deploy
Click "Deploy" and Coolify will:
1. Clone the repository
2. Build the Docker image
3. Start the nginx container
4. Serve the static files

### 5. Verify Deployment
- Visit your domain
- Check that the app loads
- Test navigation between pages
- Verify PWA manifest loads

## Mobile App Store Submission

### Android (Google Play Store)
1. Open Android Studio:
   ```bash
   npm run cap:android
   ```

2. Build signed APK/App Bundle:
   - Build → Generate Signed Bundle/APK
   - Select "Android App Bundle"
   - Use existing keystore: `android/shift6-release.keystore`

3. Upload to Play Store Console

### iOS (App Store)
1. Open Xcode:
   ```bash
   npm run cap:ios
   ```

2. Update signing:
   - Select your Apple Developer team
   - Update bundle identifier if needed

3. Archive and upload:
   - Product → Archive
   - Distribute App → App Store Connect

## Version History
- v2.1.0 (Build 211) - Bug fixes for achievements and gym session
