# Shift6

**Shift6** is a Progressive Web App (PWA) for bodyweight and gym fitness training with structured 6-week progression systems. Master foundational exercises through science-based programming with automatic difficulty scaling.

Built with **React 18**, **Vite 5**, **TailwindCSS**, and **Capacitor** for native mobile deployment.

## Training Modes

### Home Mode (Bodyweight)
- 9+ foundational calisthenics exercises with 18-day progression plans
- 6-week goal system with per-exercise targets and weekly milestones
- Sprint-based progression with automatic difficulty scaling
- Exercise variations (6 difficulty levels per exercise)
- Smart daily workout scheduling based on training preferences

### Gym Mode (Weight Training)
- Pre-built programs (Push/Pull/Legs, Upper/Lower, Full Body, Bro Split)
- 6-week goal system with weight/rep progression and deload weeks
- Exercise assessment flow to calibrate starting weights
- Custom program builder
- Weight unit toggle (kg/lbs)

## Features

- **Dual Training Modes**: Switch between home bodyweight and gym weight training
- **6-Week Goal System**: Set and track per-exercise goals with weekly targets (both modes)
- **Dynamic Progression**: Automatically adjusts difficulty based on performance
- **Offline Ready (PWA)**: Installable on iOS/Android, works 100% offline
- **Exercise Library**: Browse and add exercises by category, difficulty, and equipment
- **Custom Programs**: Build your own programs or choose from starter templates
- **Warm-up Routines**: Guided warm-up sequences before workouts
- **Express Mode**: Quick workouts for time-constrained sessions
- **Configurable Rest Timer**: Auto, 30s-120s with adaptive rest suggestions
- **Calendar View**: Monthly grid showing workout history with exercise colors
- **Progress Tracking**: Charts, pace analysis, completion estimates, and personal records
- **Dark/Light Themes**: Full theme toggle across all views
- **Workout Notes**: Add notes to any workout session
- **Data Export**: JSON backup/restore and CSV export for spreadsheets
- **Achievement System**: 30+ badges for streaks, milestones, and challenges
- **Notifications**: Workout reminders, streak alerts, and badge celebrations
- **Body Metrics**: Optional weight and measurement tracking
- **Accessibility**: ARIA labels on interactive elements, progress indicators, and modals
- **Onboarding**: Guided setup for both home and gym modes
- **Native Feel**:
  - Haptics: Tactile feedback on interactions
  - Wake Lock: Screen stays on during workouts
  - Audio Cues: Beeps and fanfares using Web Audio API
- **Privacy First**: All data stored locally on device with crash-safe storage

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18.2, Vite 5.0 |
| Styling | TailwindCSS 3.4, Lucide Icons |
| Mobile | Capacitor 8 (iOS/Android) |
| Testing | Vitest 4.0, @testing-library/react |
| Linting | ESLint 8.57 with React plugins |
| PWA | vite-plugin-pwa 0.17 |

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
| `npm run lint` | Run ESLint (strict: max-warnings 0) |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run cap:ios` | Build and open in Xcode |
| `npm run cap:android` | Build and open in Android Studio |

## Project Structure

```
src/
├── main.jsx              # Entry point with ErrorBoundary
├── App.jsx               # Main component & all state management
├── components/
│   ├── Layout/           # Header, BottomNav, SideDrawer
│   ├── Views/
│   │   ├── Dashboard.jsx         # Home mode main view
│   │   ├── GymDashboard.jsx      # Gym mode main view
│   │   ├── WorkoutSession.jsx    # Home workout UI
│   │   ├── GymWorkoutSession.jsx # Gym workout UI
│   │   ├── HomeGoalSetter.jsx    # Home 6-week goal modal
│   │   ├── GymGoalSetter.jsx     # Gym 6-week goal modal
│   │   ├── GymAssessment.jsx     # Gym exercise assessment
│   │   ├── WorkoutQuickStart.jsx # Quick start / express mode
│   │   ├── Progress.jsx          # Progress & analytics view
│   │   ├── CalendarView.jsx      # Monthly calendar
│   │   ├── ExerciseLibrary.jsx   # Browse exercise library
│   │   ├── ProgramManager.jsx    # Program management
│   │   ├── WarmupRoutine.jsx     # Pre-workout warm-ups
│   │   ├── BodyMetrics.jsx       # Weight/measurement tracking
│   │   ├── Guide.jsx             # Exercise instructions
│   │   ├── Onboarding.jsx        # Home mode onboarding
│   │   ├── GymOnboarding.jsx     # Gym mode onboarding
│   │   └── ...                   # More views
│   └── Visuals/          # NeonBadge, NeoIcon, Confetti, Charts
├── utils/
│   ├── homeGoals.js      # Home mode 6-week goal progression
│   ├── gymProgression.js # Gym mode 6-week goal progression
│   ├── progression.js    # Sprint-based progression engine
│   ├── progressionCoach.js # Weight suggestions, PR detection, rep targets
│   ├── progressionAlgorithms.js # Adaptive difficulty algorithms
│   ├── adaptiveRest.js   # Smart rest timer calculations
│   ├── gamification.js   # Badges, stats, achievements
│   ├── schedule.js       # Daily workout scheduling
│   ├── goalPrediction.js # Pace analysis & completion estimates
│   ├── volumeTracking.js # Volume tracking and deload detection
│   ├── notifications.js  # Reminders & streak notifications
│   ├── audio.js          # Web Audio API synth
│   ├── device.js         # Wake Lock, Vibration, Clipboard
│   └── ...               # More utilities
├── data/
│   ├── exercises.jsx     # Calisthenics exercise plans
│   ├── gymExercises.js   # Gym exercise definitions & programs
│   ├── exerciseLibrary.js # Extended exercise library
│   ├── exerciseDatabase.js # Full exercise database
│   └── warmupRoutines.js # Warm-up routine data
└── test/
    └── setup.js          # Vitest + jsdom setup
```

## Data Safety

All user data is stored in browser localStorage with built-in resilience:

- **Crash-safe reads**: All `JSON.parse` calls are wrapped in try-catch with fallback defaults. Corrupted storage data won't crash the app.
- **Quota-safe writes**: All `localStorage.setItem` calls use a safe wrapper that silently handles `QuotaExceededError` and other write failures.
- **No external APIs**: 100% client-side, privacy-first. Data never leaves the device.

## Testing

**480 tests** across 17 test files covering all utility modules:

```bash
npm run test:run    # Single run
npm test            # Watch mode
```

Test coverage includes:
- Gamification logic, badge unlocking, personal records
- Sprint-based progression, adaptive difficulty
- Workout scheduling, daily stack management
- Goal prediction, pace analysis
- Adaptive rest timer calculations
- Volume tracking, deload detection
- Exercise substitution logic
- Smart program generation
- Audio, device APIs, constants validation

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

## Roadmap

### Planned

- **Exercise Images**: Custom illustrations or photos for each movement
- **YouTube Form Videos**: Embedded tutorials in the Guide section
- **Cloud Sync** (Optional): Cross-device sync while maintaining privacy-first defaults
- **Apple Health / Google Fit**: Integration with native health platforms
- **Social Sharing**: Share achievements and milestones (opt-in)
- **Multi-language Support**: i18n for global accessibility

### Technical Improvements

- [ ] Migrate state management to Zustand
- [ ] Add E2E tests with Playwright
- [ ] Add TypeScript for type safety
- [ ] Implement code splitting for lazy-loaded views
- [ ] Migrate localStorage to IndexedDB for larger storage
- [ ] Replace `window.confirm()` with custom modal dialogs

## Contributing

Found a bug or have a feature idea? Open an issue on [GitHub](https://github.com/camster91/Shift6/issues).

## License

This project is personal software. Feel free to fork and modify.
