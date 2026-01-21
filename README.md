# Shift6

**Shift6** is a Progressive Web App (PWA) designed to help you master 6 foundational bodyweight exercises over a 6-week progression system.

Built with **React**, **Vite**, **TailwindCSS**, and **Capacitor** for native mobile deployment.

## Features

- **Dynamic Progression**: Automatically adjusts difficulty based on your "Max Effort" set
- **Offline Ready (PWA)**: Installable on iOS/Android, works 100% offline
- **Deep Analytics**:
  - Activity Streaks: Track your consistency
  - Badges: Unlock achievements like "Early Bird" and "Week Warrior"
- **Native Feel**:
  - Haptics: Tactile feedback on interactions
  - Wake Lock: Keeps your screen awake during workouts
  - Audio Cues: Beeps and fanfares using Web Audio API
- **Privacy First**:
  - Local Storage: Data lives on your device by default
  - Backup/Restore: Export your progress to JSON

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, Vite 5 |
| Styling | TailwindCSS 3.4, Lucide Icons |
| Mobile | Capacitor 8 (iOS/Android) |
| Testing | Vitest, @testing-library/react |
| Linting | ESLint with React plugins |
| PWA | vite-plugin-pwa |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens development server at `http://localhost:5173`

### Build

```bash
npm run build
npm run preview  # Preview production build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build to `/dist` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint (strict mode) |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run cap:ios` | Build and open in Xcode |
| `npm run cap:android` | Build and open in Android Studio |

## Project Structure

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Main component & state
├── components/
│   ├── Layout/           # Header, BottomNav
│   ├── Views/            # Dashboard, Plan, WorkoutSession, Guide
│   └── Visuals/          # NeonBadge, NeoIcon, DataBackground
├── utils/                # Audio, device, gamification, schedule
└── data/                 # Exercise plans
```

## Deployment

### Static Hosting (Vercel, Netlify, Hostinger)

This project builds to a static SPA. Deploy the `dist/` folder.

**Build Settings:**
- Build Command: `npm run build`
- Publish Directory: `dist`

### Mobile (Capacitor)

```bash
# iOS
npm run cap:ios

# Android
npm run cap:android
```

## License

This project is personal software. Feel free to fork and modify.
