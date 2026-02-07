# CLAUDE.md - Shift6 Project Guide

## Project Overview

Shift6 is a Progressive Web App (PWA) for a 6-week bodyweight and gym fitness progression system. It supports two training modes: **Home** (bodyweight) and **Gym** (weighted exercises). Users master exercises through structured, science-based programming with automatic difficulty scaling based on performance.

**Version:** 2.1.0

**Core Bodyweight Exercises (Home Mode):**
| Exercise | Color | Unit | Final Goal |
|----------|-------|------|------------|
| Push-Ups | Blue | reps | 100 |
| Squats | Orange | reps | 200 |
| Pull-Ups | Yellow | reps | 50 |
| Dips | Pink | reps | 50 |
| V-Ups | Emerald | reps | 100 |
| Single Leg Glute Bridge | Cyan | reps/leg | 50 |
| Plank | Teal | seconds | 180 |
| Lunges | Purple | reps/leg | 50 |
| Supermans | Indigo | reps | 100 |

**Key Features:**
- Dual training modes: Home (bodyweight) and Gym (weighted)
- Sprint-based progression with adaptive difficulty scaling
- 6-week goal system with pace tracking and completion predictions
- Configurable rest timer (Auto/adaptive, 30s-120s) with enhanced rest screen
- 30+ achievement badges, streaks, and personal records with confetti celebrations
- Progress charts via Recharts (weekly volume, trends)
- Calendar view for workout history
- Exercise library with category/difficulty/equipment filters
- Custom program builder and program switching
- Warm-up routines with dynamic stretches
- Body metrics tracking (weight, measurements)
- Workout notes and CSV export
- Dark/light theme toggle
- Onboarding flow for new users
- Accessibility settings panel
- 100% offline functionality (local-first, privacy-first)
- PWA + Capacitor for iOS/Android deployment
- Native app experience with haptics and audio cues (with mute toggle)

## Tech Stack

- **Frontend:** React 18.2 + Vite 5.0
- **Styling:** TailwindCSS 3.4 + tailwindcss-animate + custom glassmorphism
- **Charts:** Recharts 3.7
- **Icons:** Lucide React 0.300
- **State:** React Hooks + localStorage (props drilling from App.jsx, no Redux/Context)
- **Mobile:** Capacitor 8.0 (iOS/Android) with Haptics, SplashScreen, StatusBar, App plugins
- **PWA:** vite-plugin-pwa 0.17 (autoUpdate, Workbox with CacheFirst for fonts)
- **Testing:** Vitest 4.0 + @testing-library/react 16.3 + jsdom 27
- **Linting:** ESLint 8.57 with React/Hooks/Refresh plugins (max-warnings 0)
- **Build:** PostCSS + Autoprefixer
- **Deployment:** Vercel (vercel.json configured)

## Quick Commands

```bash
# Development
npm run dev          # Start dev server (localhost:5173)

# Build
npm run build        # Production build -> /dist
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint (strict: max-warnings 0)
npm test             # Vitest watch mode
npm run test:run     # Single test run (CI)

# Mobile (Capacitor)
npm run cap:sync     # Build + sync to native projects
npm run cap:ios      # Build + open Xcode
npm run cap:android  # Build + open Android Studio
npm run cap:build:ios     # Build iOS in one command
npm run cap:build:android # Build Android in one command
```

## Directory Structure

```
src/
├── main.jsx                    # Entry point with ErrorBoundary
├── App.jsx                     # Main component (~2500 lines, all state management)
├── index.css                   # Global styles + Tailwind + glassmorphism + themes
├── components/
│   ├── ErrorBoundary.jsx       # Class-based error boundary
│   ├── Layout/
│   │   ├── Header.jsx          # App header with theme/audio toggles, mode switcher
│   │   ├── BottomNav.jsx       # Bottom navigation (Home, Workout, Progress, Menu)
│   │   └── SideDrawer.jsx      # Slide-out side menu
│   ├── Views/
│   │   ├── Dashboard.jsx           # Home view with next workouts & daily progress
│   │   ├── WorkoutSession.jsx      # Active workout UI with sets/reps tracking
│   │   ├── EnhancedRestScreen.jsx  # Rest timer with progress ring & adaptive suggestions
│   │   ├── CalendarView.jsx        # Monthly calendar with workout history
│   │   ├── Progress.jsx            # Stats & progress tracking (memoized)
│   │   ├── Guide.jsx               # Exercise instructions
│   │   ├── Plan.jsx                # Exercise selection
│   │   ├── Onboarding.jsx          # Initial setup flow
│   │   ├── ModeSelector.jsx        # Home vs Gym mode picker
│   │   ├── ExerciseLibrary.jsx     # Browse & add exercises (filtered)
│   │   ├── ProgramManager.jsx      # Manage active program
│   │   ├── ProgramSwitcher.jsx     # Switch between programs
│   │   ├── CustomProgramBuilder.jsx # Build custom programs
│   │   ├── AddExercise.jsx         # Add custom exercises modal
│   │   ├── WarmupRoutine.jsx       # Pre-workout dynamic stretches
│   │   ├── WorkoutQuickStart.jsx   # Express mode entry
│   │   ├── TrainingSettings.jsx    # Preferences (rep scheme, progression rate)
│   │   ├── BodyMetrics.jsx         # Weight & measurement tracking
│   │   ├── AccessibilitySettings.jsx # A11y options
│   │   ├── HomeGoalSetter.jsx      # Set per-exercise 6-week goals
│   │   ├── ExerciseReplacementModal.jsx # Swap exercises
│   │   ├── GymOnboarding.jsx       # Gym mode setup
│   │   ├── GymDashboard.jsx        # Gym home view
│   │   ├── GymWorkoutSession.jsx   # Gym workout UI
│   │   ├── GymProgramManager.jsx   # Manage gym programs
│   │   ├── GymProgramBuilder.jsx   # Build gym programs
│   │   ├── GymAssessment.jsx       # Gym 1RM assessment
│   │   └── GymGoalSetter.jsx       # Gym 6-week goals
│   ├── Visuals/
│   │   ├── NeonBadge.jsx           # Badge display component
│   │   ├── AchievementModal.jsx    # Achievement celebration modal
│   │   ├── AchievementToast.jsx    # Achievement toast notification
│   │   ├── Confetti.jsx            # Confetti animation
│   │   ├── ProgressChart.jsx       # Recharts visualizations (line, area, bar)
│   │   ├── NeoIcon.jsx             # Custom exercise icon renderer
│   │   ├── DataBackground.jsx      # Visual background effects
│   │   ├── TemplateCard.jsx        # Program template card
│   │   ├── NotificationSettings.jsx # Notification preferences
│   │   ├── UpdateNotification.jsx  # PWA update prompt
│   │   ├── InstallPrompt.jsx       # PWA "Add to Home Screen" banner
│   │   ├── StorageWarning.jsx      # Storage quota warning banner
│   │   └── ShareButton.jsx         # Reusable share/copy button
│   └── UI/
│       └── LocationSelector.jsx    # Home/Gym filter
├── utils/
│   ├── constants.js              # App-wide constants (localStorage keys, limits, equipment)
│   ├── schedule.js               # Workout scheduling logic & daily stack
│   ├── gamification.js           # Badge logic, stats, achievements (with JSDoc)
│   ├── audio.js                  # Web Audio API synth (beeps, fanfares)
│   ├── device.js                 # Wake Lock, Vibration, Clipboard APIs
│   ├── progression.js            # Sprint-based progression system (core algorithm)
│   ├── progressionAlgorithms.js  # Adaptive difficulty algorithms
│   ├── progressionCoach.js       # Smart training suggestions (rule-based)
│   ├── preferences.js            # User training preferences & migration
│   ├── homeGoals.js              # 6-week goal tracking & weekly targets
│   ├── homeProgression.js        # Home mode progression logic
│   ├── gymProgression.js         # Gym mode progression logic
│   ├── notifications.js          # Push notifications & reminders
│   ├── personas.js               # User persona system
│   ├── programGenerator.js       # Generate custom programs
│   ├── smartProgramGenerator.js  # AI-like program generation
│   ├── volumeTracking.js         # Track workout volume & analytics
│   ├── goalPrediction.js         # Estimate workout completion dates & pace
│   ├── exerciseSubstitution.js   # Equipment-based exercise substitutions
│   ├── adaptiveRest.js           # Intelligent rest period calculations
│   ├── colors.js                 # Color utility functions
│   ├── accessibility.js          # Accessibility utilities
│   ├── sharing.js                # Web Share API & clipboard sharing
│   ├── useKeyboardShortcuts.js   # Keyboard shortcuts hook
│   └── pwa.js                    # PWA utilities
├── data/
│   ├── exercises.jsx             # 9 core exercises with progressions, variations, rep schemes
│   ├── exerciseLibrary.js        # Exercise library & 20+ program templates
│   ├── exerciseDatabase.js       # Gym exercises database
│   ├── gymExercises.js           # Gym-specific exercise data
│   └── warmupRoutines.js         # Dynamic warm-up exercises organized by body part
└── test/
    └── setup.js                  # Vitest + jsdom setup
```

**Other Notable Files:**
```
.github/workflows/ci.yml         # GitHub Actions CI (lint, test, build)
docs/
├── USER_PERSONAS.md              # User persona descriptions
└── IMPLEMENTATION_PLAN.md        # Feature implementation roadmap
store-assets/                     # App store submission assets & guides
public/assets/images/             # Badge, icon, and background PNGs
android/                          # Capacitor Android project
ios/                              # Capacitor iOS project
```

## Coding Conventions

### Style
- No semicolons (implicit ASI in ES modules)
- camelCase for functions/variables, PascalCase for components
- JSDoc comments for utility functions (`@param`, `@returns`)
- TailwindCSS utility classes for styling
- 4-space indentation

### React Patterns
- Functional components with hooks (except ErrorBoundary which is class-based)
- Props drilling from App.jsx (no Context API or state library)
- localStorage-backed state with lazy initialization:

```javascript
const [state, setState] = useState(() => {
    const saved = localStorage.getItem('shift6_key')
    return saved ? JSON.parse(saved) : defaultValue
})
```

### Component Structure
```javascript
const Component = ({ props, getThemeClass }) => {
    // 1. State
    // 2. Effects
    // 3. Handlers
    // 4. Render
}
```

### Styling
- TailwindCSS utility-first approach
- Custom CSS for glassmorphism (`.glass-card`, `.neon-glow`)
- Dynamic classes via `getThemeClass()` helper for exercise colors
- Primary color: `#06b6d4` (cyan)
- Dark/light theme via CSS variables and Tailwind dark mode

### Error Handling
- Crash-safe JSON parsing with try/catch around localStorage reads
- Null guards on state objects
- Division-by-zero protection in calculations
- Custom modals instead of `window.confirm` for better UX

## Data Flow

### State Management
App.jsx manages ~40 state variables organized into:
- **Home mode:** completedDays, sessionHistory, homeGoals, sprints
- **Gym mode:** gymProgram, gymWeights, gymReps, gymHistory, gymGoals
- **UI state:** activeTab, showDrawer, showGuide, modal states
- **Settings:** theme, audioEnabled, warmupEnabled, trainingPreferences
- **Custom content:** customExercises, customPrograms, customGymPrograms

### localStorage Keys
- **Exercise Plans:** Hardcoded in `/data/exercises.jsx` (9 exercises, 18 days each)
- **Exercise Keys:** `pushups`, `squats`, `pullups`, `dips`, `vups`, `glutebridge`, `plank`, `lunges`, `supermans`
- **Progress:** `shift6_progress` -> `{ [exerciseKey]: [dayId, ...] }`
- **History:** `shift6_history` -> Array of `{ exerciseKey, dayId, date, volume, unit }` (max 50 items)
- **Current Session:** `shift6_current_session` -> Active workout state
- **Goals:** `shift6_home_goals` -> Per-exercise 6-week goal targets
- **Preferences:** `shift6_training_preferences` -> Rep scheme, progression rate settings
- **No external APIs** - 100% client-side, privacy-first

## Testing

- **Framework:** Vitest with jsdom environment
- **Pattern:** Unit tests co-located with utilities (`utils/*.test.js`)
- **Test Config:** `vite.config.js` (globals: true, environment: jsdom, setupFiles: `./src/test/setup.js`)
- **Total: 516 tests across 19 test files (all passing)**

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `progression.test.js` | 63 | Sprint system, difficulty scaling, plateau detection |
| `homeGoals.test.js` | 37 | 6-week goals, weekly targets |
| `gamification.test.js` | 38 | Badge unlocking, stats, achievements, personal records |
| `progressionCoach.test.js` | 34 | Training suggestions |
| `progressionAlgorithms.test.js` | 31 | Adaptive difficulty algorithms |
| `programGenerator.test.js` | 31 | Custom program generation |
| `personas.test.js` | 31 | User persona system |
| `smartProgramGenerator.test.js` | 30 | AI-like program generation |
| `preferences.test.js` | 30 | User settings, migration |
| `exerciseSubstitution.test.js` | 29 | Equipment-based alternatives |
| `adaptiveRest.test.js` | 27 | Intelligent rest timing |
| `volumeTracking.test.js` | 24 | Volume analytics |
| `goalPrediction.test.js` | 22 | Completion estimates, pace tracking |
| `constants.test.js` | 18 | App constants, localStorage keys, limits |
| `schedule.test.js` | 17 | Daily stack, scheduling logic |
| `device.test.js` | 17 | Haptics, wake lock, clipboard |
| `sharing.test.js` | 16 | Web Share API, clipboard fallback, share text builders |
| `useKeyboardShortcuts.test.js` | 13 | Keyboard shortcuts, input guard, modifier keys |
| `audio.test.js` | 8 | Web Audio API synth |

**Commands:**
- `npm test` - Watch mode for development
- `npm run test:run` - Single run for CI

## Important Notes

- All data stays in browser localStorage (privacy-first, no external APIs)
- Audio uses Web Audio API (no external audio assets)
- Device APIs (vibration, wake lock) have graceful fallbacks
- ESLint enforces 0 warnings - fix all issues before committing
- App.jsx is the central hub (~2500 lines) - all state lives here and is drilled via props
- The Recharts dependency is used for progress visualization (ProgressChart.jsx)
- PWA service worker uses autoUpdate with Workbox caching strategies
- Vite dev server proxies `/api` and `/auth` to `localhost:3000` (for future backend)

## Feature Status

### Implemented
- Progress graphs (Recharts)
- Configurable rest timer with adaptive suggestions
- Workout reminders (notifications.js)
- Personal records tracking
- Workout notes
- Calendar view
- Dark/light themes
- Exercise variations (6 difficulty levels per exercise)
- Custom programs (builder + switcher)
- Exercise library with filters
- Warm-up routines
- Body metrics tracking
- 30+ achievement badges with celebrations
- CSV export
- PWA with offline caching
- Accessibility settings
- Haptics integration
- Audio cues (Web Audio API synth)
- Dual training modes (Home + Gym)
- 6-week goal system with predictions
- Sprint-based progression algorithms
- Onboarding flow
- Side drawer navigation
- Smart program generation
- Exercise substitution by equipment
- Adaptive rest periods
- User persona system
- Volume tracking & analytics
- Social sharing (Web Share API with clipboard fallback)
- PWA install prompt (custom "Add to Home Screen" banner)
- Keyboard shortcuts (1/2/3 for tabs, m for menu, t for theme, ? for help)
- Skip-to-main-content link (accessibility)
- Storage quota warning (alerts at 80% usage)
- CI pipeline (GitHub Actions: lint, test, build)

### Not Yet Implemented
| Feature | Notes |
|---------|-------|
| Form Videos / YouTube Embeds | No video content in Guide.jsx |
| Apple Watch / WearOS | No wearable app |
| Multi-language (i18n) | All strings hardcoded in English |
| Voice Commands | No Web Speech API |
| Heart Rate Integration | No Web Bluetooth API |
| TypeScript | Pure JavaScript codebase |
| State Management Library | Still props drilling (Zustand migration planned) |
| Component Tests | Only utility tests exist |
| E2E Tests | No Playwright/Cypress |
