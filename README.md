# Shift6

**Shift6** is a Progressive Web App (PWA) designed to help you master 9 foundational bodyweight exercises over a 6-week progression system.

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

## Roadmap

### Immediate Priorities

**UX Improvements**
- **Redesigned Home Page**: Focus on next workouts and daily progress, not achievements
- **Smart Workout Awareness**: Shows what you did today and suggests more if you want
- **Daily Goal System**: Flexible daily targets (do any exercises, hit your goal)
- **Streamlined Navigation**: Bottom nav (Home, Workout, Progress, Menu) + side drawer for extras
- **Assessment Flow Fix**: Initial max effort test returns to home, not full workout

**Achievement System Overhaul**
- **18 Levels Per Exercise**: Progress from Beginner to Master over 6 weeks
- **Exercise Mastery Badges**: Unique badge for completing each exercise program
- **30+ Bonus Achievements**: Streaks, milestones, time-based, and fun challenges
- **Achievements in Menu**: Moved out of home page into dedicated section

**Content & Media**
- **Exercise Images**: Custom illustrations or optimized photos for each movement
- **YouTube Form Videos**: Embedded tutorials in the Guide section
- **Quick Form GIFs**: Short animations during workouts for reference

### Phase 1: Core Enhancements

- **Progress Graphs**: Visual charts showing volume and strength gains over time
- **Rest Timer**: Configurable rest periods between sets with audio alerts
- **Workout Reminders**: Push notifications for scheduled workout days
- **Personal Records**: Track and celebrate all-time bests for each exercise
- **Workout Notes**: Add notes/journal entries to workout sessions
- **Calendar View**: Visual monthly calendar showing workout history

### Phase 2: Customization & Content

- **Dark/Light Themes**: User-selectable color themes beyond the current neon aesthetic
- **Exercise Variations**: Alternative movements for each exercise (e.g., knee push-ups, assisted pull-ups)
- **Custom Programs**: User-defined exercise combinations and progression schemes
- **Warm-up Routines**: Guided warm-up sequences before workouts
- **Cool-down Stretches**: Post-workout stretching recommendations

### Phase 3: Advanced Features

- **Cloud Sync** (Optional): Sync progress across devices while maintaining privacy-first defaults
- **Apple Health / Google Fit**: Integration with native health platforms
- **Apple Watch / WearOS**: Companion app for wrist-based workout tracking
- **Social Sharing**: Share achievements and milestones (opt-in)
- **Workout Challenges**: Time-limited community challenges
- **Body Metrics**: Optional weight/measurements tracking

### Phase 4: Platform Expansion

- **Multi-language Support**: i18n for global accessibility
- **Accessibility**: Screen reader support, high-contrast mode, reduced motion
- **Home Screen Widgets**: Quick stats on iOS/Android home screens
- **Siri / Google Assistant**: Voice shortcuts for starting workouts
- **Offline Backup**: Export to device storage (not just JSON download)
- **QR Code Sync**: Quick data transfer between devices

### Achievement Ideas

| Achievement | How to Earn |
|-------------|-------------|
| First Steps | Complete your first workout |
| Push-up Pro | Master all 18 days of push-ups |
| Complete Athlete | Master all 9 exercises |
| Double Trouble | Do 2 exercises in one day |
| Nine Lives | Do all 9 exercises in one day |
| Week Warrior | 7-day streak |
| Month Monster | 30-day streak |
| Century Club | 100 total workouts |
| Rep Machine | 1,000 total reps |
| Early Bird | Workout before 7am |
| Night Owl | Workout after 9pm |
| Comeback Kid | Return after 7+ day break |

### Feature Ideas Backlog

| Feature | Description | Complexity |
|---------|-------------|------------|
| Interval Training | HIIT mode with work/rest cycles | Medium |
| Voice Commands | Hands-free workout control | High |
| Weekly Reports | Email/notification summaries | Medium |
| Exercise Swaps | Substitute exercises mid-program | Low |
| Superset Mode | Pair exercises with minimal rest | Medium |
| Deload Weeks | Automatic recovery week scheduling | Low |
| Plateau Detection | Alert when progress stalls | Medium |
| Heart Rate Zones | Integration with HR monitors | High |
| Nutrition Tips | Basic nutrition guidance per goal | Low |

### Technical Debt

- [ ] Migrate state management to React Context or Zustand
- [ ] Add E2E tests with Playwright
- [ ] Improve test coverage for components
- [ ] Add TypeScript for type safety
- [ ] Migrate localStorage to IndexedDB for larger storage
- [ ] Add error tracking (Sentry)
- [ ] Implement proper PWA update flow
- [ ] Add privacy-respecting analytics

## Contributing

Found a bug or have a feature idea? Open an issue on [GitHub](https://github.com/camster91/Shift6/issues).

## License

This project is personal software. Feel free to fork and modify.
