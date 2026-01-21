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
- **Progress Graphs**: Add Chart.js or Recharts to visualize volume/strength trends in Dashboard.jsx
- **Rest Timer**: Configurable countdown between sets in WorkoutSession.jsx with audio cues
- **Workout Reminders**: Implement Push API + service worker notifications in utils/notifications.js
- **Exercise Variations**: Extend exercises.jsx data structure to include easier/harder progressions

### Medium Priority
- **Dark/Light Themes**: Add theme toggle in Header.jsx, store preference in localStorage, update Tailwind config
- **Custom Programs**: Allow users to create custom exercise combinations in a new ProgramBuilder.jsx view
- **Cloud Sync**: Optional Firebase/Supabase integration with encryption for cross-device sync
- **Form Videos**: Embed short demonstration clips in Guide.jsx (consider lazy loading)

### Nice to Have
- **Apple Watch / WearOS**: Capacitor plugin or native companion app
- **Social Sharing**: Share badges/achievements via Web Share API
- **Multi-language**: Add i18n with react-intl or similar
- **Accessibility**: ARIA labels, focus management, high-contrast mode

## Technical Improvements

### Architecture
- **State Management**: Consider migrating from prop drilling to React Context or Zustand for cleaner data flow
- **TypeScript**: Add type safety to catch bugs early (start with utils/, then components/)
- **Code Splitting**: Lazy load views with React.lazy() to improve initial load time

### Testing
- **E2E Tests**: Add Playwright for critical user flows (start workout, complete session, earn badge)
- **Component Tests**: Increase coverage for Views/ and Layout/ components
- **Visual Regression**: Consider Chromatic or Percy for UI consistency

### Performance
- **Bundle Analysis**: Run `npx vite-bundle-visualizer` to identify optimization opportunities
- **Image Optimization**: If adding form videos/images, use modern formats (WebP, AVIF)
- **Service Worker**: Enhance caching strategy for faster repeat visits

### DevEx
- **Husky + lint-staged**: Pre-commit hooks for consistent code quality
- **GitHub Actions**: CI pipeline for automated testing on PRs
- **Storybook**: Component documentation and visual testing
