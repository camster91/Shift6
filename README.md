# Shift6

**Shift6** is a bodyweight fitness PWA that delivers 6-week progressive training programs. Choose between Home and Gym modes, work through 9 core exercises with sprint-based progression, and track your gains with built-in gamification.

Live at [getshift6.com](https://getshift6.com) and available on iOS and Android via Capacitor.

## Features

- **6-Week Progressive Programs**: Structured training blocks that scale difficulty over time
- **9 Exercises**: Curated bodyweight movements covering push, pull, squat, hinge, and core
- **Home + Gym Modes**: Train anywhere with equipment-adaptive routines
- **Sprint-Based Progression**: Short focused cycles that keep you advancing
- **Gamification**: Streaks, achievements, and progress tracking to keep you consistent
- **Offline-Ready PWA**: Install on any device, works without internet
- **Native Mobile Apps**: iOS and Android builds via Capacitor

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | Service worker, installable |
| Server | Express.js (Stripe payments only) |
| Payments | Stripe Checkout + Customer Portal |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run dev
```

### Build

```bash
npm run build          # Build web
npx cap sync android   # Sync to Android
npx cap open android   # Open in Android Studio
```

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=https://getshift6.com
PORT=3000
```

## Project Structure

```
src/
  context/         # CombinedProvider, WorkoutState, Settings, Theme, UIState
  ...              # React components and pages
server/
  index.js         # Express server for Stripe payments
store-assets/      # App store listings, screenshots, privacy policy
android/           # Capacitor Android project
ios/               # Capacitor iOS project
```

## License

Private - All rights reserved.
