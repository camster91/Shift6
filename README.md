# Shift6

**A bodyweight fitness Progressive Web App delivering 6-week progressive training programs.**

Shift6 offers structured 6-week progressive training programs with Home and Gym modes, 9 core exercises with sprint-based progression, and built-in gamification. Available as a web app and native iOS/Android applications via Capacitor.

Live at [getshift6.com](https://getshift6.com).

## Features

### Training Programs
- **6-Week Progressive Programs:** Structured training blocks that scale difficulty over time
- **Home + Gym Modes:** Train anywhere with equipment-adaptive routines
- **9 Core Exercises:** Curated bodyweight movements covering push, pull, squat, hinge, and core
- **Sprint-Based Progression:** Short focused cycles that keep you advancing

### Tracking & Gamification
- **Workout Logging:** Track sets, reps, and weights for each exercise
- **Progress Charts:** Visualize your strength gains over time
- **Streak Tracking:** Maintain workout consistency with streaks
- **Achievement System:** Unlock achievements for milestones

### Platform
- **Offline-Ready PWA:** Install on any device, works without internet
- **Native Mobile Apps:** iOS and Android builds via Capacitor
- **Cross-Device Sync:** Sync progress across all your devices
- **Dark/Light Theme:** Choose your preferred appearance

### Payments
- **Stripe Integration:** Secure subscription payments
- **Pro Tier:** Premium workout plans and advanced analytics
- **Team Plans:** Group subscriptions for fitness teams

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| State | React Context + Custom Hooks |
| Charts | Recharts |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | Service Worker, Installable |
| Server | Express.js (Stripe payments) |
| Payments | Stripe Checkout + Customer Portal |

## Prerequisites

- Node.js 18+
- npm 9+
- For native builds: Android Studio and/or Xcode
- Stripe account for payments

## Installation

```bash
# Clone the repository
git clone https://github.com/camster91/Shift6.git
cd Shift6

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage

### Development

```bash
# Start Vite dev server
npm run dev

# Start backend server (for payments)
npm run server
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Native Mobile

```bash
# Build web assets
npm run build

# Sync to native projects
npx cap sync

# Open in Android Studio
npm run cap:android

# Open in Xcode
npm run cap:ios
```

## Environment Variables

Create a `.env` file:

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
APP_URL=https://getshift6.com
PORT=3000
```

## Project Structure

```
src/
├── context/              # React contexts
│   ├── CombinedProvider.tsx
│   ├── WorkoutState.tsx
│   ├── Settings.tsx
│   ├── Theme.tsx
│   └── UIState.tsx
├── components/           # React components
├── pages/               # Route pages
├── hooks/               # Custom hooks
├── utils/               # Utility functions
├── data/                # Exercise and workout data
└── App.tsx              # Root component

server/
└── index.js             # Express server for Stripe

android/                  # Capacitor Android project
ios/                     # Capacitor iOS project
store-assets/            # App store assets

public/
└── sw.js                # Service worker
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run server` | Start backend server only |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest |
| `npm run cap:sync` | Sync to Capacitor |
| `npm run cap:ios` | Build and open iOS |
| `npm run cap:android` | Build and open Android |

## Deployment

### Docker

```bash
# Build image
docker build -t shift6 .

# Run container
docker run -p 3000:3000 shift6
```

### Docker Compose

```bash
docker-compose up -d
```

### Coolify

See `COOLIFY_DEPLOY.md` and `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## Testing

```bash
# Run tests
npm run test

# Run tests once
npm run test:run
```

## Store Assets

- App icons and splash screens in `store-assets/`
- Privacy policy at `PRIVACY_POLICY.md`
- Screenshots for app stores in `screenshots-qa/`

## License

Private - All rights reserved.

---
Developed by Cameron Ashley.
