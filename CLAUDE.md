# CLAUDE.md — Armor (formerly Shift6)

## What this is

A Capacitor (React + Vite) fitness PWA. 6-week periodization with two equipment tracks (full gym / home gym), 5-day split, Norwegian 4x4 VO2 max protocol, plate math, and contingency modifiers. Live at getshift6.com, also distributed as a native iOS/Android app via Capacitor.

## Stack

- React 18 + Vite 5 (frontend)
- Tailwind CSS 3 (styling)
- Capacitor 8 (iOS + Android wrapper)
- PWA via vite-plugin-pwa
- vitest + jsdom (testing, 60 tests in src/data/)
- ESLint 9 flat config
- Bundle ID: `com.shift6.app`

## Live URLs

- Web: https://getshift6.com
- Marketing site: https://getshift6.com/ (same origin, separate src/landing/ build)
- Cloud sync (planned): https://sync.getshift6.com — **not deployed yet**, the Account tab is hidden by default

## Key files

- `src/ArmorApp.jsx` — App shell, tab nav, Shift6→Armor migration
- `src/context/ArmorDataContext.jsx` — Single provider: workout, preferences, modifiers, habits, streak
- `src/data/armorEngine.js` — **Pure functions** for periodization, plate math, modifiers. This is the math the user trusts — treat regressions as blocking.
- `src/data/armorEngine.test.js` — 47 tests covering the math
- `src/data/armorEngine.context.test.js` — 13 tests for the context helpers (`computeStreak`, `rollover1RMs`)
- `src/lib/syncClient.js` — Optional cloud sync client (Fastify + Postgres backend, not deployed)
- `src/pages/ArmorWorkoutSession.jsx` — Strength / VO2 / MVD / rest timer / plate visualizer
- `src/pages/ArmorSettings.jsx` — 1RM editor, theme, unit, modifiers
- `store-assets/` — App Store listing, screenshots, feature graphic, privacy policy
- `android/shift6-release.keystore` — release signing key (NEVER commit a password)

## Build

```bash
npm install
npm run build        # Build web → dist/
npm run test         # vitest watch
npm run lint         # eslint (0 errors, ≤5 warnings)
npm run cap:android  # build + open Android Studio
npm run cap:ios      # build + open Xcode
```

## DO NOT

- Do NOT commit a real keystore password. Use `RELEASE_STORE_PASSWORD` env var.
- Do NOT log workout data to the console in production. The ErrorBoundary logs are debug only.
- Do NOT change the build pack in Coolify (currently nixpacks).
- Do NOT add a server/ directory back. The cloud sync is a sibling repo.
- Do NOT call `VITE_SYNC_ENABLED` from anywhere but the App shell. The flag gates the Account tab; the sync code itself runs whether the flag is on or off (no-op when not logged in).
- Do NOT use the placeholder `G-MEASUREMENT_ID` analytics ID. The init function rejects it; use `VITE_GA_MEASUREMENT_ID` at build time.

## Deploy

VPS: 187.77.26.99 (coolify). Live container: `armor-web` on `127.0.0.1:3003` (node:20-alpine + serve@14). Caddy site block in `/opt/caddy/Caddyfile` covers `getshift6.com` and `www.getshift6.com`. Restart Caddy with `systemctl restart caddy` (admin API is off, so reload silently fails — but systemd restart works).

## App Store assets

Already prepared in `store-assets/`:
- `APP_STORE_LISTING.md` — full description, keywords
- `PRIVACY_POLICY.md` — Armor (not Shift6) wording; cloud sync is opt-in
- `GOOGLE_PLAY_LISTING.md`
- `screenshots/` folder
- `BUILD_SUBMISSION_GUIDE.md`
