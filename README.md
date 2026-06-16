# Armor

**A 6-week periodized fitness PWA for professionals whose schedule doesn't respect their workout.**

Armor is the rebrand of the former "Shift6" app. It is a local-first Capacitor (React + Vite) PWA that delivers a 5-day split (Heavy Squats / VO2 Max / Heavy Bench / VO2 Max / Heavy Deads) on a 6-week periodization, plus an optional cloud sync for multi-device use.

Live at [getshift6.com](https://getshift6.com).

## Why Armor

Built for the user who:
- Has 20 minutes between meetings, a brutal weekend behind them, or a hotel gym in a city they can't pronounce.
- Wants a coach, not a content library.
- Tracks 1RMs and wants the math to be correct, every time.
- Doesn't want to sign in to log a set.

## Features

### Training
- **5-day split, 6-week periodization** — Base / Volume / Transition / Heavy / Peak / Deload.
- **Two equipment tracks** — Full Gym (barbell) and Home Gym (dumbbell / kettlebell). Both 1RMs are tracked independently so you can switch mid-week.
- **Norwegian 4x4 VO2 Max** — Embedded as Day 2 and Day 4. 4-minute work, 3-minute rest, 4 rounds. The single best predictor of all-cause mortality, lowest time cost.
- **Plate math** — Per-track rounding, kg/lbs switchable, PlateVisualizer for the bar setup.
- **Contingency modifiers** — MVD (Minimum Viable Day), CNS fatigue, heavy meal, travel mode, time crunch. The app reshapes the workout to the day.

### Tracking
- **Estimated 1RMs** — per exercise, per track. Auto-progresses +5 lbs upper / +10 lbs lower on cycle rollover.
- **Daily habits** — Single-leg stands, lunch walk, post-dinner walk, evening floor work. Pillar-aligned reminders.
- **Streaks with freezes** — One streak-freeze per cycle, for the week the user got sick.
- **Personal records** — Detected automatically on the final set of the primary lift.

### Platform
- **Local-first by default** — All workout data lives in your device's localStorage. No account required. No data leaves the device.
- **Opt-in cloud sync** — Sign in from the Account tab to back up your data and access it from multiple devices. See `Privacy Policy` for details.
- **Offline PWA** — Install on iOS, Android, or any modern browser. The service worker caches every asset and the PWA functions without internet.
- **Native builds** — Capacitor 8 wraps the PWA for App Store and Google Play submission. No native code.

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| State | React Context (`ArmorDataContext`) + localStorage |
| Charts | (planned) Recharts |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | vite-plugin-pwa, Workbox |
| Tests | Vitest + jsdom |
| Lint | ESLint 9 (flat config) |

There is **no backend in this repository.** The optional cloud sync is a sibling repo (`armor-sync-api`, not yet public) that this client expects at `https://sync.getshift6.com`. When that backend is not deployed, the Account tab is hidden — the app is fully functional without it.

## Quick start

```bash
git clone https://github.com/camster91/Shift6.git
cd Shift6
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run test     # vitest watch
npm run lint     # eslint (no warnings allowed)
```

## Native mobile

```bash
npm run cap:android   # build + open Android Studio
npm run cap:ios       # build + open Xcode
```

Build artifacts (AAB, IPA) live in `store-assets/`. The release signing key is `android/shift6-release.keystore`; the keystore password is read from `RELEASE_STORE_PASSWORD` at build time (see `android/app/build.gradle`).

## Environment variables

| Var | Used for |
|-----|----------|
| `VITE_SYNC_ENABLED` | Set to `1` to show the Account (cloud sync) tab. Default: hidden. |
| `VITE_GA_MEASUREMENT_ID` | GA4 ID for analytics. Default: empty (analytics off). |

Build-time env vars for the Android release key:

```
RELEASE_STORE_FILE=shift6-release.keystore
RELEASE_STORE_PASSWORD=...
RELEASE_KEY_ALIAS=...
RELEASE_KEY_PASSWORD=...
```

## Project structure

```
src/
├── ArmorApp.jsx                 # App shell, tab nav, migration
├── main.jsx                     # React root, ArmorDataProvider + ErrorBoundary
├── context/
│   └── ArmorDataContext.jsx     # Single provider: workout, prefs, modifiers, habits, sync
├── pages/                       # Today / Workout / Progress / Account / Settings / Onboarding
├── components/                  # PlateVisualizer, FirstRunTour, ErrorBoundary, UI library
├── data/
│   ├── armorEngine.js           # Pure functions: periodization, plate math, modifiers
│   └── armorEngine.test.js      # 47-test coverage of the math
├── lib/
│   └── syncClient.js            # Optional cloud sync (Fastify/Postgres)
├── landing/                     # Marketing site (separate Vite build)
├── utils/                       # analytics, date, notifications
└── test/setup.js                # vitest jsdom setup
```

## Permissions (mobile)

- **Vibration / Haptics** — Optional. Used for set-complete confirmation.
- **Notifications** — Optional. User-initiated habit reminders.
- **Status Bar / Splash Screen** — Cosmetic. Dark theme.

## Privacy

See [`store-assets/PRIVACY_POLICY.md`](./store-assets/PRIVACY_POLICY.md) or the live `/legal/` page. Short version: local-first by default, opt-in cloud sync, no third-party tracking, no ads, no selling of data.

## License

Private repo. Not for redistribution.

## Migration from Shift6 (v1 → v3)

The app detects old `shift6_*` localStorage keys on first launch and migrates them to `armor_*`. The migration is idempotent and sets a marker key (`armor_migrated_from_shift6`) so it runs only once. No data is sent off-device during migration.
