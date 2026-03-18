# CLAUDE.md — Shift6

## What This Is
A Capacitor (React + Vite) bodyweight fitness app. 6-week progressive program with 9 exercises. Live at getshift6.com and in app stores.

## Stack
- React + Vite (frontend)
- Capacitor 8 (iOS + Android wrapper)
- PWA enabled
- Bundle ID: `com.shift6.app`

## Live URLs
- Web: https://getshift6.com (Coolify, uuid: toc8kck8g08k8g0co0gg8ggs)
- Mobile app: same codebase via Capacitor

## Key Files
- `src/context/` — CombinedProvider, WorkoutStateContext, SettingsStateContext, ThemeContext, UIStateContext
- `store-assets/` — App store listing, screenshots, feature graphic, privacy policy
- `android/shift6-release.keystore` — release signing key
- `BUILD_SUBMISSION_GUIDE.md` — store submission guide (in store-assets/)

## Build
```bash
npm run build        # Build web
npx cap sync android # Sync to Android
npx cap open android # Open Android Studio → Generate Signed Bundle
```

## DO NOT
- Keystore password: [REDACTED] — never commit this to git
- Do not change the build pack in Coolify (currently nixpacks)

## App Store Assets
Already prepared in `store-assets/`:
- APP_STORE_LISTING.md — full description, keywords
- PRIVACY_POLICY.md
- google-play-listing.md
- screenshots/ folder
