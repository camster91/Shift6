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

## Roadmap

### Planned Features

- **Progress Graphs**: Visual charts showing volume and strength gains over time
- **Rest Timer**: Configurable rest periods between sets with audio alerts
- **Workout Reminders**: Push notifications for scheduled workout days
- **Dark/Light Themes**: User-selectable color themes beyond the current neon aesthetic
- **Exercise Variations**: Alternative movements for each exercise (e.g., knee push-ups, assisted pull-ups)
- **Custom Programs**: User-defined exercise combinations and progression schemes

### Future Improvements

- **Cloud Sync** (Optional): Sync progress across devices while maintaining privacy-first defaults
- **Apple Watch / WearOS**: Companion app for wrist-based workout tracking
- **Social Sharing**: Share achievements and milestones (opt-in)
- **Form Videos**: Embedded exercise demonstration clips
- **Multi-language Support**: i18n for global accessibility
- **Accessibility**: Screen reader support and high-contrast mode

### Technical Debt

- [ ] Migrate state management to React Context or Zustand
- [ ] Add E2E tests with Playwright
- [ ] Improve test coverage for components
- [ ] Add TypeScript for type safety

## Contributing

Found a bug or have a feature idea? Open an issue on [GitHub](https://github.com/camster91/Shift6/issues).

## License

This project is personal software. Feel free to fork and modify.
