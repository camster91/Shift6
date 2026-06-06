# Armor v3.0.0 — Changelog

All changes since the audit on 2026-06-06.

## Features added

### Workout core
- **Last-time reference in workout session** (`ArmorWorkoutSession.jsx`) — shows "Last: 215 lbs × 8" when previous history exists for the current exercise
- **0-lbs nudge** (`ArmorWorkoutSession.jsx`) — when a primary lift has no 1RM, shows a tappable "Set your 1RM in Settings →" link instead of "0 lbs"
- **Save feedback animation** (`ArmorWorkoutSession.jsx`) — Complete Set button pulses 600ms on save

### Progress + retention
- **Streak counter** (`ArmorProgress.jsx`) — large card with 🔥 + current streak + longest streak
- **Session count** (`ArmorProgress.jsx`) — "X workouts completed" chip
- **Empty state with preview** (`ArmorProgress.jsx`) — 3 faded placeholder cards showing what the user will unlock
- **PR timeline chart** (`ArmorProgress.jsx`) — pure SVG line chart, heaviest set per session, last 6 weeks
- **Volume-per-week bar chart** (`ArmorProgress.jsx`) — pure SVG bars, 6 weeks of weekly volume
- **30d / All time toggle** (`ArmorProgress.jsx`) — filters charts by time range

### Onboarding
- **Selected state on track cards** (`ArmorOnboarding.jsx`) — cyan ring + checkmark when tapped
- **"Recommended for new users" badge** (`ArmorOnboarding.jsx`) — above the Use both button
- **Helper text** (`ArmorOnboarding.jsx`) — "Don't worry — you can change this anytime from Settings."

### Account
- **Profile section** (`ArmorAccount.jsx`) — avatar with initials, display name, "Not signed in" / email
- **Sync status card** (`ArmorAccount.jsx`) — StatusDot + last sync time, only when signed in
- **Data export** (`ArmorAccount.jsx`) — full context as JSON download (armor-data-YYYY-MM-DD.json)

### Settings
- **1RM save feedback** (`ArmorSettings.jsx`) — green flash + checkmark for 1.2s on save
- **Larger tap target on value button** (`ArmorSettings.jsx`) — was text, now wrapped in pill
- **Weight unit toggle (kg/lbs)** (`ArmorSettings.jsx`) — segmented control between Theme and Current Cycle; display-only conversion (stores lbs internally)

### Dashboard
- **Travel chip fix** (`ArmorDashboard.jsx`) — short labels ("MVD", "Travel") + 12px right-edge fade gradient; old labels were truncating at 390px

## Design system

### New primitives (`src/components/ui/`)
- **Card** — surface container with `padded` and `interactive` modes, forwardRef
- **Button** — 5 variants (primary, secondary, ghost, danger, success) × 3 sizes (sm, md, lg), forwardRef, icon support
- **StatTile** — metric box with accent color, accepts instantiated icon as ReactNode
- **EmptyState** — centered icon/title/description + optional CTA
- **PageHeader** — large title + count chip + description + right-aligned actions
- **SectionHeader** — icon + uppercase label + count badge + action
- **index.js** — barrel export

### Page refactors (used the new primitives)
- **ArmorDashboard.jsx** — 5 changes: Card wrappers, SectionHeader, StatTile, removed QuickStat
- **ArmorWorkoutSession.jsx** — 6 changes: Card, Button (primary/secondary/ghost), rest screen buttons
- **ArmorOnboarding.jsx** — 3 changes: PageHeader, Card interactive, Button primary
- **ArmorProgress.jsx** — 4 changes: PageHeader, Card, EmptyState, opacity-50 placeholders
- **ArmorAccount.jsx** — 5 changes: PageHeader, Card wrappers, Button primary/ghost
- **ArmorSettings.jsx** — 6 changes: PageHeader, SectionHeader, Card, Button (5 variants)

## Tooling

### Gauntlet script (`scripts/gauntlet.sh`)
12 checks, runs in ~10s, exits 0 on all-pass:
1. `npm run build`
2. tsc --noEmit (skipped — no tsconfig)
3. Orphan component scan (find-based, zsh-safe)
4. `npx cap sync android`
5. `npm run lint`
6. Lighthouse mobile (skipped — needs LH_CHROME_PATH)
7. Live site HTTP 200 + brand string + bundle hash check
8. Click-through audit (delegated to auditor skill)
9. Visual regression (delegated to subagent)
10. Service worker registered
11. Mobile viewport matrix (delegated to subagent)
12. A11y / screen reader (delegated to subagent)

Current state: **7 PASS, 0 FAIL, 5 skipped (manual).**

## Docs

- `docs/VISUAL_UX_AUDIT_2026-06-06.md` — original audit + revised after live verification
- `docs/TESTER_TEAM_PLAN.md` — 8 personas × 3 rounds, ready to dispatch
- `docs/tester-scripts/` — 24 self-contained persona test scripts + INDEX.md
- `docs/CHANGELOG.md` — this file
