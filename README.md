# SHIFT6

A local-first mobile fitness app for iOS and Android that organizes training into focused six-week cycles: pick one measurable goal, record a baseline, train, and review real change after six weeks.

> Status: in active rebuild. The repository was reset in September 2026 and `main` now holds a new React Native / Expo foundation. It is not released on the App Store or Google Play yet, and no program content has passed human review for public release. The earlier Vite/Capacitor web version is preserved on the `archive/pre-shift6-rebuild-2026-09-13` branch.

## Why

Progress is easier to see and sustain when training is organized into short, focused blocks. SHIFT6 keeps core training free, works offline, and separates measured progress from simple adherence, so users can tell whether a block actually moved them toward their goal.

## What is built today

- Guest onboarding with six essential setup steps and optional profile details, with an equipment manager that feeds program recommendations and substitutions
- Versioned six-week programs: 20 historical candidate definitions for development. The focused public release manifest has no approved enabled Shifts; candidate content requires human review.
- Active workout logging with per-set entry, session notes, exercise reordering, added sets, equipment substitution, and explicit partial or skipped sessions with a reason
- Deterministic next-session targets from completed set history, with unit-aware load increments (for example 5 lb or 2.5 kg); AI never sets targets
- Cycle calendar with rescheduling, week transitions, and an end-of-cycle review and reflection
- Progress views: training volume by exercise, movement pattern and muscle, plus a cycle-level cardio summary
- Searchable exercise library with filters (equipment, difficulty, stance, focus) and a custom exercise builder
- Coach surface with a deterministic safety classifier and proposal validator; provider-backed AI is opt-in and off by default, and can never change a plan on its own
- Apple Health and Health Connect adapters with explicit disconnect and data-removal controls
- Local-first SQLite storage with versioned migrations and an idempotent sync outbox that surfaces conflicts for review instead of overwriting data
- Privacy controls: local export and delete, guest-to-account data adoption, privacy-safe analytics and error reporting that are no-ops by default
- Plate calculator, body metrics, notifications and component accessibility tests; native assistive-technology review remains pending
- Custom Higgsfield artwork, launcher/splash exports and optional silent animations with reduced-motion and backgrounding support

Goal measurement semantics and the persistence schema are implemented; the production
goal writer and matching server acceptance remain pending. Current native build and
media evidence is recorded in [docs/32_NATIVE_MEDIA_AND_BUILD_EVIDENCE.md](docs/32_NATIVE_MEDIA_AND_BUILD_EVIDENCE.md).

## Tech stack

- Expo SDK 57, React Native 0.86, React 19, TypeScript
- Expo Router (tab navigation), React Native Reanimated, Gesture Handler
- expo-sqlite for on-device storage, expo-secure-store, expo-notifications
- HealthKit (`@kingstinct/react-native-healthkit`) and Android Health Connect (`react-native-health-connect`)
- Jest (`jest-expo`) and React Native Testing Library, ESLint, Prettier
- EAS build configuration (`eas.json`), GitHub Actions CI

## Getting started

Requires Node 22.

```bash
npm ci
cp .env.example .env
npm start          # Expo dev server
npm run ios        # or: npm run android / npm run web
```

The web target is a UI preview only: it has no persistence because the SQLite web worker is not available there. iOS and Android use the real SQLite provider. Health integrations require a native build with their modules; Expo Go cannot verify them.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run verify     # full CI gate: format, lint, typecheck, expo-doctor, asset and secret checks, audit, tests, export
```

CI runs the same steps on every push and pull request, ending with an iOS, Android and web export smoke test.

The manual **Native validation** workflow also compiles an Android release-mode test
APK and an unsigned iOS Release simulator app on macOS. Store signing and physical
device QA are separate release requirements. Unresolved dependency audit and
content/release gates currently prevent a full release-ready pass.

## Project structure

```
app/                 Expo Router screens (tabs: home, programs, coach, progress, profile)
src/components/ui/   token-driven UI primitives
src/domain/          progression, cycles, calendar, programs, exercise catalogue (pure logic + tests)
src/db/              SQLite migrations and repositories
src/services/        sync, health, coach, notifications, analytics, auth boundaries
content/             release manifest
assets/              brand marks and asset manifest
docs/                product, design, architecture and release planning
scripts/             asset, secret and release-config validators
```

## Docs

- [docs/00_MASTER_PRODUCT_PLAN.md](docs/00_MASTER_PRODUCT_PLAN.md): vision and principles
- [docs/03_SHIFT6_PROGRESSION_ENGINE.md](docs/03_SHIFT6_PROGRESSION_ENGINE.md): six-week progression model
- [docs/04_AI_PT_COACH.md](docs/04_AI_PT_COACH.md): coach guardrails
- [docs/06_TECHNICAL_ARCHITECTURE.md](docs/06_TECHNICAL_ARCHITECTURE.md): architecture
- [docs/08_PRIVACY_ACCESSIBILITY_SAFETY.md](docs/08_PRIVACY_ACCESSIBILITY_SAFETY.md): privacy, accessibility and safety
- [docs/12_RELEASE_READINESS.md](docs/12_RELEASE_READINESS.md): current implementation state
- [docs/25_GOAL_FIRST_RELEASE_CONTRACT.md](docs/25_GOAL_FIRST_RELEASE_CONTRACT.md): scope of the first focused release
