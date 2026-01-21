# CLAUDE.md - Shift6 Project Guide

## Project Overview

Shift6 is a Progressive Web App (PWA) for a 6-week bodyweight fitness progression system. Users master 9 foundational exercises through structured, science-based programming with automatic difficulty scaling based on performance.

**Exercises:**
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
- Dynamic rep progression with automatic scaling
- 100% offline functionality (local-first data storage)
- Native app experience with haptics and audio cues
- Gamification via badges and streaks
- PWA + Capacitor for iOS/Android deployment

## Tech Stack

- **Frontend:** React 18.2 + Vite 5.0
- **Styling:** TailwindCSS 3.4 + tailwindcss-animate + custom glassmorphism
- **Icons:** Lucide React 0.300
- **State:** React Hooks + localStorage (no Redux/Context)
- **Mobile:** Capacitor 8.0 (iOS/Android bridge)
- **PWA:** vite-plugin-pwa 0.17
- **Testing:** Vitest 4.0 + @testing-library/react 16.3 + jsdom 27
- **Linting:** ESLint 8.57 with React/Hooks/Refresh plugins
- **Build:** PostCSS + Autoprefixer

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
│   ├── Layout/
│   │   ├── Header.jsx    # App header with settings
│   │   └── BottomNav.jsx # Bottom navigation tabs
│   ├── Views/
│   │   ├── Dashboard.jsx     # Home view with progress
│   │   ├── Plan.jsx          # Exercise selection
│   │   ├── WorkoutSession.jsx # Active workout UI
│   │   └── Guide.jsx         # Exercise instructions
│   ├── Visuals/
│   │   ├── NeonBadge.jsx     # Badge display component
│   │   ├── NeoIcon.jsx       # Custom icon renderer
│   │   └── DataBackground.jsx # Visual effects
│   └── ErrorBoundary.jsx # Class-based error boundary
├── utils/
│   ├── constants.js         # App-wide constants (localStorage keys, limits)
│   ├── constants.test.js    # Constants validation tests
│   ├── gamification.js      # Badge logic & stats (with JSDoc)
│   ├── gamification.test.js # Badge and stats tests
│   ├── schedule.js          # Workout scheduling logic
│   ├── schedule.test.js     # Schedule and daily stack tests
│   ├── audio.js             # Web Audio API synth
│   ├── audio.test.js        # Audio function tests
│   ├── device.js            # Wake Lock, Vibration APIs
│   └── device.test.js       # Device API tests
├── data/
│   └── exercises.jsx     # 9 exercise plans with 6-week progressions
└── test/
    └── setup.js          # Vitest + jsdom setup
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

- **Exercise Plans:** Hardcoded in `/data/exercises.jsx` (9 exercises, 18 days each)
- **Exercise Keys:** `pushups`, `squats`, `pullups`, `dips`, `vups`, `glutebridge`, `plank`, `lunges`, `supermans`
- **Progress:** `shift6_progress` → `{ [exerciseKey]: [dayId, ...] }`
- **History:** `shift6_history` → Array of `{ exerciseKey, dayId, date, volume, unit }` (max 50 items)
- **Current Session:** `shift6_current_session` → Active workout state
- **No external APIs** - 100% client-side, privacy-first

## Testing

- **Framework:** Vitest with jsdom environment
- **Pattern:** Unit tests co-located with utilities (`utils/*.test.js`)
- **Current Coverage (69 tests):**
  - `gamification.test.js` - Badge logic, stats calculation, unlock conditions (9 tests)
  - `schedule.test.js` - Workout scheduling, daily stack, schedule focus (17 tests)
  - `constants.test.js` - App constants validation (18 tests)
  - `audio.test.js` - Web Audio API functions (8 tests)
  - `device.test.js` - Wake lock, vibration, clipboard (17 tests)
- **Commands:**
  - `npm test` - Watch mode for development
  - `npm run test:run` - Single run for CI

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

### Exercise Level System (Per-Exercise Progression)

Each exercise has its own level with achievements unlocked at milestones:

**Level Structure (18 levels per exercise = 6 weeks x 3 days)**
| Level | Name | Unlocks At | Reward |
|-------|------|------------|--------|
| 1 | Beginner | Complete assessment | Exercise unlocked |
| 2 | Getting Started | Day 2 complete | Encouragement message |
| 3 | Building Momentum | Day 3 complete | First week badge |
| 4-6 | Week 2 | Days 4-6 | "Committed" badge at level 6 |
| 7-9 | Week 3 | Days 7-9 | "Halfway Hero" badge at level 9 |
| 10-12 | Week 4 | Days 10-12 | "Dedicated" badge at level 12 |
| 13-15 | Week 5 | Days 13-15 | "Almost There" badge at level 15 |
| 16-17 | Week 6 | Days 16-17 | "Final Push" message |
| 18 | Master | Day 18 complete | "MASTERY" badge + celebration |

**Exercise-Specific Achievements**
| Achievement | Criteria | Badge Style |
|-------------|----------|-------------|
| Push-up Pro | Master push-ups | Gold with push-up icon |
| Squat Champion | Master squats | Gold with squat icon |
| Pull-up King/Queen | Master pull-ups | Gold with pull-up icon |
| Dip Master | Master dips | Gold with dip icon |
| Core Crusher | Master V-ups | Gold with V-up icon |
| Glute God/Goddess | Master glute bridges | Gold with bridge icon |
| Complete Athlete | Master all 6 exercises | Platinum animated badge |

**Bonus Achievements**
| Achievement | Criteria | Fun Factor |
|-------------|----------|------------|
| First Steps | Complete first ever workout | Welcome celebration |
| Double Trouble | Do 2 exercises in one day | Encourages variety |
| Triple Threat | Do 3 exercises in one day | Extra dedication |
| Six Pack | Do all 6 exercises in one day | Ultimate challenge |
| Streak Starter | 3-day streak | Flame icon appears |
| Week Warrior | 7-day streak | Flame intensifies |
| Month Monster | 30-day streak | Legendary flame |
| Century Club | 100 total workouts | Confetti explosion |
| Rep Machine | 1,000 total reps | Counter celebration |
| Ten Thousand | 10,000 total reps | Epic achievement |
| Early Bird | Workout before 7am | Sunrise badge |
| Night Owl | Workout after 9pm | Moon badge |
| Weekend Warrior | Workout on Sat & Sun | Weekend badge |
| Comeback Kid | Return after 7+ days | Phoenix badge |
| Overachiever | Exceed target reps 5x | Star badge |
| Consistency King | Same time 5 days in a row | Clock badge |

**Implementation Notes**
- Store level per exercise: `{ pushups: 5, squats: 3, ... }` in localStorage
- Achievements stored as: `{ earned: ['first_steps', 'streak_3'], dates: {...} }`
- Show level progress bar on each exercise card
- Celebrate level-ups with confetti + haptic + sound
- Files: gamification.js, new AchievementModal.jsx, exercises.jsx

---

## UX Redesign Plans

### Home Page Redesign

**Current Problem**: Too cluttered, achievements take focus away from workouts

**New Layout (Top to Bottom)**:
```
┌─────────────────────────────────┐
│  Today's Summary (if worked out)│
│  "You did Push-ups & Squats!"   │
│  [Want to do more?] button      │
├─────────────────────────────────┤
│  Next Recommended Workouts      │
│  ┌─────────┐ ┌─────────┐       │
│  │ Squats  │ │ Pull-ups│  ...  │
│  │ Day 4/18│ │ Day 2/18│       │
│  │ [Start] │ │ [Start] │       │
│  └─────────┘ └─────────┘       │
├─────────────────────────────────┤
│  Daily Goal Progress            │
│  ████████░░ 2/3 workouts today  │
├─────────────────────────────────┤
│  Current Streak: 🔥 5 days      │
└─────────────────────────────────┘
```

**Smart Home Page Awareness**
- After workout: Show "Great job!" summary at top
- Suggest complementary exercises: "You did upper body, try legs?"
- Show which exercises are due vs. optional extras
- Daily goal: Baseline of X workouts/day (user configurable, default 1-3)

### Navigation Redesign

**Bottom Nav (4 items max)**
```
┌────────┬────────┬────────┬────────┐
│  Home  │Workout │Progress│  Menu  │
│   🏠   │   💪   │   📊   │   ☰    │
└────────┴────────┴────────┴────────┘
```

**Side Drawer Menu (☰ opens)**
```
┌─────────────────────┐
│  👤 Profile         │
│  🏆 Achievements    │  ← Moved from home
│  📅 Calendar        │
│  📖 Exercise Guide  │
│  ⚙️ Settings        │
│  💾 Backup/Restore  │
│  ❓ Help            │
└─────────────────────┘
```

**Implementation**
- New SideDrawer.jsx component with slide animation
- Update BottomNav.jsx to 4 items
- Move achievements to dedicated Achievements.jsx view
- Files: BottomNav.jsx, new SideDrawer.jsx, new Achievements.jsx, Dashboard.jsx

### Daily Goal System

**Concept**: Users choose any exercises but have a daily target

**Settings**
- Daily workout goal: 1-6 (default: 1)
- Rest days: Select days of week (default: none required)
- Goal resets at midnight local time

**Home Page Integration**
- Show progress ring: "2 of 3 workouts today"
- After hitting goal: "Goal complete! Do more?"
- Color coding: Red (0), Yellow (partial), Green (complete)

---

## Critical UX Fixes

### Assessment Flow Fix

**Current Bug**: After initial max effort assessment, user is sent directly to full workout

**Correct Flow**:
```
1. User selects exercise for first time
2. Show "Let's find your starting point" intro
3. Do MAX EFFORT set (one set only)
4. Show results: "Great! You did X reps"
5. Calculate starting difficulty
6. Show "Your program is ready!"
7. Return to HOME (not workout!)
8. Next time they tap exercise → Day 1 workout
```

**Implementation**
- Add `assessmentComplete` flag per exercise in progress state
- WorkoutSession.jsx: Check if assessment mode
- After assessment: Update state, navigate to Dashboard
- Files: WorkoutSession.jsx, App.jsx, exercises.jsx

---

## Media & Content Plan

### Picture Replacement Strategy

**Current State**: Placeholder or missing exercise images

**Plan**:
1. **Option A: Custom Illustrations** (Preferred)
   - Commission simple line art illustrations
   - Consistent style across all exercises
   - SVG format for small file size
   - Store in `/public/assets/exercises/`

2. **Option B: Stock Photos**
   - Use royalty-free fitness photos
   - Consistent lighting/style
   - Optimize with WebP format
   - Lazy load with blur placeholder

3. **Option C: AI-Generated**
   - Generate consistent style illustrations
   - Review for accuracy
   - Touch up as needed

**File Structure**
```
public/
└── assets/
    └── exercises/
        ├── pushups/
        │   ├── thumbnail.webp
        │   ├── start-position.webp
        │   └── end-position.webp
        ├── squats/
        │   └── ...
        └── ...
```

### YouTube Video Integration

**For Each Exercise**:
| Exercise | Video Content | Duration |
|----------|---------------|----------|
| Push-ups | Proper form, common mistakes, variations | 2-3 min |
| Squats | Depth, knee tracking, progressions | 2-3 min |
| Pull-ups | Grip, full range, assisted options | 2-3 min |
| Dips | Elbow position, depth, chair dips | 2-3 min |
| V-Ups | Core engagement, modifications | 2-3 min |
| Glute Bridges | Hip drive, single leg progression | 2-3 min |

**Implementation Options**:

1. **Embed YouTube** (Easiest)
   ```jsx
   // In Guide.jsx
   <iframe
     src="https://youtube.com/embed/VIDEO_ID"
     loading="lazy"
     allow="accelerometer; autoplay; encrypted-media"
   />
   ```
   - Pros: Free hosting, no bandwidth cost
   - Cons: Requires internet, YouTube branding

2. **Self-Hosted Video** (Better UX)
   - Host on CDN (Cloudflare R2, Bunny CDN)
   - Use HLS for adaptive streaming
   - Pros: Offline capable, no ads
   - Cons: Hosting cost, more setup

3. **Hybrid Approach** (Recommended)
   - YouTube embeds in Guide for detailed tutorials
   - Short GIFs/WebM for quick form checks in workout
   - Cache thumbnails locally for offline

**Guide.jsx Updates**
```jsx
const exerciseVideos = {
  pushups: {
    youtube: 'https://youtube.com/embed/abc123',
    thumbnail: '/assets/exercises/pushups/thumbnail.webp',
    duration: '2:45'
  },
  // ...
}
```

**Files to Modify**: Guide.jsx, exercises.jsx, new VideoPlayer.jsx component

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
