# CLAUDE.md - Shift6 Project Guide

## Project Overview

Shift6 is a Progressive Web App (PWA) for a 6-week bodyweight fitness progression system. Users master 6 foundational exercises (Push-ups, Squats, Pull-ups, Dips, V-Ups, Glute Bridges) through structured, science-based programming with automatic difficulty scaling based on performance.

**Key Features:**
- Dynamic rep progression with automatic scaling
- 100% offline functionality (local-first data storage)
- Native app experience with haptics and audio cues
- Gamification via badges and streaks
- PWA + Capacitor for iOS/Android deployment

## Tech Stack

- **Frontend:** React 18 + Vite 5
- **Styling:** TailwindCSS 3.4 + custom glassmorphism effects
- **Icons:** Lucide React
- **State:** React Hooks + localStorage (no Redux/Context)
- **Mobile:** Capacitor 8 (iOS/Android bridge)
- **Testing:** Vitest + @testing-library/react
- **Linting:** ESLint with React plugins

## Quick Commands

```bash
# Development
npm run dev          # Start dev server (localhost:5173)

# Build
npm run build        # Production build → /dist
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint (strict: max-warnings 0)
npm test             # Vitest watch mode
npm run test:run     # Single test run (CI)

# Mobile (Capacitor)
npm run cap:ios      # Build + open Xcode
npm run cap:android  # Build + open Android Studio
```

## Directory Structure

```
src/
├── main.jsx              # Entry point with ErrorBoundary
├── App.jsx               # Main component (all state management)
├── index.css             # Global styles + Tailwind
├── components/
│   ├── Layout/           # Header.jsx, BottomNav.jsx
│   ├── Views/            # Dashboard, Plan, WorkoutSession, Guide
│   ├── Visuals/          # NeonBadge, NeoIcon, DataBackground
│   └── ErrorBoundary.jsx # Class-based error boundary
├── utils/
│   ├── constants.js      # App-wide constants
│   ├── gamification.js   # Badge logic & stats (with JSDoc)
│   ├── schedule.js       # Workout scheduling
│   ├── audio.js          # Web Audio API synth
│   └── device.js         # Wake Lock, Vibration APIs
├── data/
│   └── exercises.jsx     # Exercise plans data structure
└── test/
    └── setup.js          # Vitest setup
```

## Coding Conventions

### Style
- No semicolons (implicit in ES modules)
- camelCase for functions/variables, PascalCase for components
- JSDoc comments for utility functions (`@param`, `@returns`)
- TailwindCSS utility classes for styling

### React Patterns
- Functional components with hooks (except ErrorBoundary)
- Props drilling from App.jsx (no Context API)
- localStorage-backed state with lazy initialization:

```javascript
const [state, setState] = useState(() => {
    const saved = localStorage.getItem('shift6_key');
    return saved ? JSON.parse(saved) : defaultValue;
});
```

### Component Structure
```javascript
const Component = ({ props, getThemeClass }) => {
    // 1. State
    // 2. Effects
    // 3. Handlers
    // 4. Render
};
```

### Styling
- TailwindCSS utility-first approach
- Custom CSS for glassmorphism (`.glass-card`, `.neon-glow`)
- Dynamic classes via `getThemeClass()` helper for exercise colors
- Primary color: `#06b6d4` (cyan)

## Data Flow

- **Exercise Plans:** Hardcoded in `/data/exercises.jsx`
- **Progress:** `{ [exerciseKey]: [dayId, ...] }` in localStorage
- **History:** Array of session objects with timestamp, exercise, volume
- **No external APIs** - 100% client-side

## Testing

- Unit tests co-located with utilities (`*.test.js`)
- Uses jsdom environment
- Run `npm test` for watch mode, `npm run test:run` for CI

## Important Notes

- All data stays in browser localStorage (privacy-first)
- Audio uses Web Audio API (no external assets)
- Device APIs (vibration, wake lock) have graceful fallbacks
- ESLint enforces 0 warnings - fix all issues before committing

## Feature Ideas

### High Priority
| Feature | Implementation Notes | Files to Modify |
|---------|---------------------|-----------------|
| Progress Graphs | Add Recharts (lightweight). Create `ProgressChart.jsx` in Visuals/ | Dashboard.jsx, new ProgressChart.jsx |
| Rest Timer | Configurable 30-180s countdown with audio beeps | WorkoutSession.jsx, audio.js, constants.js |
| Workout Reminders | Push API + service worker. Store schedule in localStorage | New utils/notifications.js, vite.config.js |
| Personal Records | Track max reps per exercise, celebrate new PRs with confetti | gamification.js, Dashboard.jsx |
| Workout Notes | Text input after session completion, store in history | WorkoutSession.jsx, App.jsx |
| Calendar View | Monthly grid showing workout days with exercise colors | New CalendarView.jsx in Views/ |

### Medium Priority
| Feature | Implementation Notes | Files to Modify |
|---------|---------------------|-----------------|
| Dark/Light Themes | CSS variables + Tailwind dark mode, toggle in Header | index.css, tailwind.config.js, Header.jsx |
| Exercise Variations | Add `variations[]` to exercise data with difficulty levels | exercises.jsx, Plan.jsx, WorkoutSession.jsx |
| Custom Programs | New view for building programs, save to localStorage | New ProgramBuilder.jsx, App.jsx |
| Form Videos | Lazy-loaded video embeds or GIFs in Guide | Guide.jsx, new assets in public/ |
| Warm-up Routines | Pre-workout flow with dynamic stretches | New Warmup.jsx, exercises.jsx |
| Body Metrics | Optional weight/measurements with trend line | New Metrics.jsx, App.jsx |

### Lower Priority
| Feature | Implementation Notes | Files to Modify |
|---------|---------------------|-----------------|
| Apple Watch / WearOS | Capacitor Watch plugin or separate native app | New capacitor plugin config |
| Social Sharing | Web Share API for badges, generate shareable images | gamification.js, NeonBadge.jsx |
| Multi-language | react-intl or i18next, extract all strings | New locales/, all components |
| Accessibility | ARIA labels, focus trapping, reduced motion | All components, index.css |
| Voice Commands | Web Speech API for hands-free control | New utils/voice.js, WorkoutSession.jsx |
| Heart Rate Integration | Web Bluetooth API for HR monitors | New utils/bluetooth.js |

### Gamification Expansion Ideas
- **Milestone Badges**: 100 workouts, 1000 total reps, 30-day streak
- **Exercise Mastery**: Complete all 18 days of a single exercise
- **Perfectionist**: Hit target reps on every set for a week
- **Early Bird / Night Owl**: Time-based workout badges
- **Comeback Kid**: Return after 7+ day break
- **Iron Will**: Complete workout despite "too hard" rating
- **Variety Pack**: Do all 6 exercises in one week
- **Leaderboards**: Optional anonymous global/friends rankings

## Technical Improvements

### Architecture

**State Management Migration**
```
Current: App.jsx → props → all components (prop drilling)
Target:  Zustand store with slices for exercises, history, settings
```
- Create `store/` directory with `useExerciseStore.js`, `useHistoryStore.js`, `useSettingsStore.js`
- Migrate one slice at a time, starting with settings (lowest risk)
- Keep localStorage sync via Zustand `persist` middleware

**TypeScript Migration Path**
1. Add `tsconfig.json` with strict mode
2. Rename `utils/*.js` → `utils/*.ts` (start here - most isolated)
3. Add types for exercise data structures in `types/exercise.ts`
4. Convert components incrementally: Visuals → Layout → Views
5. Update vite.config.js for TypeScript support

**Code Splitting Strategy**
```javascript
// Lazy load views
const Dashboard = lazy(() => import('./components/Views/Dashboard'))
const WorkoutSession = lazy(() => import('./components/Views/WorkoutSession'))
const Plan = lazy(() => import('./components/Views/Plan'))
const Guide = lazy(() => import('./components/Views/Guide'))
```

### Data Layer

**IndexedDB Migration**
- Replace localStorage with IndexedDB via `idb` library
- Benefits: Larger storage (50MB+), better performance, structured queries
- Schema: `workouts`, `exercises`, `settings`, `badges` object stores
- Keep localStorage as fallback for older browsers

**Data Export Formats**
- Current: JSON backup
- Add: CSV export for spreadsheet analysis
- Add: PDF summary report generation
- Add: iCal export for workout schedule

### Testing Strategy

**Unit Tests** (Current: utils only)
- Add tests for all utility functions
- Mock localStorage and device APIs
- Target: 80% coverage for utils/

**Component Tests** (To add)
```bash
# Priority order
1. WorkoutSession.jsx - most complex logic
2. Dashboard.jsx - data display
3. Plan.jsx - navigation
4. Header.jsx - settings interactions
```

**E2E Tests** (To add with Playwright)
```javascript
// Critical flows to test
test('complete full workout session')
test('earn badge after milestone')
test('export and import data')
test('PWA install flow')
test('offline functionality')
```

**Visual Regression**
- Chromatic or Percy for catching unintended UI changes
- Snapshot key views in light/dark themes
- Test across viewport sizes (mobile, tablet, desktop)

### Performance Optimization

**Bundle Analysis**
```bash
npx vite-bundle-visualizer
```
- Current estimated bundle: ~150KB gzipped
- Targets:
  - Main bundle < 100KB
  - Lazy chunks < 30KB each
  - First contentful paint < 1.5s

**Critical Rendering Path**
- Inline critical CSS for above-fold content
- Preload key fonts (Outfit)
- Defer non-critical JavaScript

**Service Worker Enhancements**
- Implement stale-while-revalidate for assets
- Background sync for future cloud features
- Periodic sync for reminder notifications

### DevEx Improvements

**Git Hooks (Husky + lint-staged)**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{js,jsx}": ["eslint --fix", "prettier --write"]
  }
}
```

**GitHub Actions CI Pipeline**
```yaml
# .github/workflows/ci.yml
- Lint check
- Type check (when TypeScript added)
- Unit tests
- Build verification
- Lighthouse CI score check
- Deploy preview to Vercel
```

**Storybook Setup**
- Document all components in isolation
- Visual testing with Chromatic
- Accessibility testing with a11y addon
- Interactive props playground

### Security Considerations

- **Content Security Policy**: Add strict CSP headers
- **Subresource Integrity**: Hash external scripts/styles
- **Data Encryption**: Encrypt localStorage data at rest (optional feature)
- **Input Sanitization**: Sanitize workout notes before storage
- **Rate Limiting**: If adding cloud sync, implement proper rate limits

### Monitoring & Analytics

**Error Tracking (Sentry)**
- Capture JavaScript errors
- Track failed API calls (future cloud sync)
- Monitor performance metrics

**Privacy-Respecting Analytics**
- Self-hosted Plausible or Umami
- Track: page views, feature usage, workout completions
- No personal data, no cookies
- Full GDPR compliance

### Mobile-Specific Improvements

**Capacitor Plugins to Add**
- `@capacitor/local-notifications` - workout reminders
- `@capacitor/share` - social sharing
- `@capacitor/haptics` - enhanced haptic patterns
- `@capacitor/screen-orientation` - lock during workout
- `@capacitor/app` - handle app lifecycle events
- `@capacitor/keyboard` - better input handling

**iOS-Specific**
- Add proper App Store screenshots
- Implement Sign in with Apple (if adding accounts)
- Support Dynamic Island for active workouts

**Android-Specific**
- Material You theming support
- Wear OS companion app
- Android Auto integration (audio cues only)
