# CLAUDE.md — Armor (formerly Shift6)

## What this is

A Capacitor (React + Vite) fitness PWA. 6-week periodization with two equipment tracks (full gym / home gym), 5-day split, Norwegian 4x4 VO2 max protocol, plate math, and contingency modifiers. Live at getshift6.com, also distributed as a native iOS/Android app via Capacitor.

## Stack

- React 18 + Vite 5 (frontend)
- Tailwind CSS 3 (styling)
- Capacitor 8 (iOS + Android wrapper)
- PWA via vite-plugin-pwa
- vitest + jsdom (testing, 70 tests in src/data/)
- ESLint 9 flat config
- Bundle ID: `com.shift6.app`

## Live URLs

- Web: https://getshift6.com (apex)
- Web: https://www.getshift6.com (www)
- Cloud sync (planned): https://sync.getshift6.com — **not deployed yet**, the Account tab is hidden by default

## Key files

- `src/ArmorApp.jsx` — App shell, tab nav, Shift6→Armor migration
- `src/context/ArmorDataContext.jsx` — Single provider: workout, preferences, modifiers, habits, streak
- `src/data/armorEngine.js` — **Pure functions** for periodization, plate math, modifiers. This is the math the user trusts — treat regressions as blocking.
- `src/data/armorEngine.test.js` — 47 tests covering the math
- `src/data/armorEngine.context.test.js` — 13 tests for the context helpers (`computeStreak`, `rollover1RMs`)
- `src/data/armorEngine.unit.test.js` — 10 tests for the lb/kg display conversion
- `src/lib/syncClient.js` — Optional cloud sync client (Fastify + Postgres backend, not deployed)
- `src/pages/ArmorWorkoutSession.jsx` — Strength / VO2 / MVD / rest timer / plate visualizer
- `src/pages/ArmorDashboard.jsx` — Today's workout, WeekStrip, modifiers, daily habits
- `src/components/ExerciseIllustration.jsx` — Lazy-loaded WebP illustration for an exercise; falls back cleanly when no asset exists
- `src/data/exerciseImages.js` — Maps exerciseId → `/exercises/<id>.webp` path. Edit this when adding/removing illustrations
- `public/exercises/*.webp` — Generated exercise illustrations (4 currently: barbell_squat, bench_press, deadlift, goblet_squat). Generated via MiniMax image-01 + Imagen 4 T2I (no reference images — all output owned under vendor commercial-use terms)
- `ops/exerciseIllustrationPrompts.js` — Source prompts for the 4 illustrations. Edit prompts here, then `node ops/generateExerciseIllustrations.js --only <exercise>` to regenerate
- `ops/generateExerciseIllustrations.js` — Run the 6 prompts through MiniMax image-01; saves to ops/exercise-candidates/<exercise>/. Convert to WebP via `cwebp -q 80` before committing
- `src/pages/ArmorSettings.jsx` — 1RM editor, theme, unit, modifiers
- `ops/traefik-guard.sh` — cron guard for the getshift6.com Traefik route
- `ops/caddy-removal-guard.sh` — fleet-wide Traefik health + caddy-decommissioned assertions
- `ops/armor-serve.cjs` — custom Node static server (used because serve@14 --single masks the privacy page)
- `store-assets/` — App Store listing, screenshots, feature graphic, privacy policy
- `android/shift6-release.keystore` — release signing key (NEVER commit a password)

## Build

```bash
npm install
npm run build        # Build web → dist/
npm run test         # vitest watch
npm run lint         # eslint (0 errors, ≤5 warnings)
npm run cap:android  # build + open Android Studio
npm run cap:ios      # build + open Xcode
```

## Deploy

VPS: 187.77.26.99 (coolify). Architecture as of 2026-06-17:

```
internet → Traefik (:80/:443) → armor-web (node:20-alpine, port 127.0.0.1:3003)
                                 Traefik also handles HSTS, CSP, and the other
                                 16 fleet sites (simaqadeer, lull, splashtown,
                                 jwhabits, markup, hub, animals, photogen,
                                 contractions, arcan-painting, lull-relay,
                                 ai-billing-audit, artisan, relay, status).
```

**Caddy is decommissioned.** It was the original edge proxy but the fleet migrated to Traefik in June 2026. The `caddy.service` systemd unit is masked. The Caddy binary at `/usr/local/bin/caddy` is kept only so legacy deploy scripts that call `caddy validate` get a real "not configured" error instead of `command not found`. Do not add new Caddyfile routes — add a Traefik entry in `/opt/traefik/dynamic/routers.yml` instead.

### To deploy a new build

```bash
ops/deploy.sh
```

The script builds, tars, pushes to VPS, extracts into `/opt/armor-live/dist/`
(the runtime container serves this path — do not extract at the top level or
you'll get a mix of old and new files), restarts the `armor-web` container,
and verifies the new asset hash is being served at https://getshift6.com/.

Manual fallback (only if the script is broken):
```bash
npm run build
tar -czf /tmp/armor-dist.tar.gz -C dist .
cat /tmp/armor-dist.tar.gz | ssh root@187.77.26.99 'cat > /tmp/armor-dist.tar.gz'
ssh root@187.77.26.99 "
  rm -rf /opt/armor-live/dist
  mkdir -p /opt/armor-live/dist
  tar -xzf /tmp/armor-dist.tar.gz -C /opt/armor-live/dist
  docker restart armor-web
"
```

### To add a new Traefik route (manual or scripted)

See `ops/traefik-guard.sh` for an example. Routes go in `/opt/traefik/dynamic/routers.yml`. Traefik watches the file and reloads on change — no restart needed.

## DO NOT

- Do NOT commit a real keystore password. Use `RELEASE_STORE_PASSWORD` env var.
- Do NOT log workout data to the console in production. The ErrorBoundary logs are debug only.
- Do NOT add new Caddyfile routes. Use Traefik.
- Do NOT add a server/ directory back. The cloud sync is a sibling repo.
- Do NOT call `VITE_SYNC_ENABLED` from anywhere but the App shell. The flag gates the Account tab; the sync code itself runs whether the flag is on or off (no-op when not logged in).
- Do NOT use the placeholder `G-MEASUREMENT_ID` analytics ID. The init function rejects it; use `VITE_GA_MEASUREMENT_ID` at build time.
- Do NOT bundle any "free" exercise dataset in the app. The hasaneyldrm/exercises-dataset and similar re-hosts of ExerciseDB v1 by AscendAPI forbid commercial use. To add an illustration, T2I-generate with text-only prompts (MiniMax image-01 or Imagen 4) — never use a reference image and never rehost the dataset. See `third-party-content-owner-tos-compliance` skill, "Class 5" section.
- Do NOT expect text-to-image to nail every exercise pose on the first prompt. The MiniMax image-01 model has stable priors toward barbell-on-shoulders-in-front (front squat pattern) and arms-extended (top-of-bench-press pattern). If a prompt keeps yielding wrong positions, switch models: Imagen 4 nails the goblet squat and Romanian deadlift where MiniMax/Hailuo and Gemini NB1 fail; Imagen 4 ULTRA nails the bench-press-bottom position where the cheaper Imagen 4 also defaults to top. As a rule: MiniMax for barbell movements, Imagen 4 for chest-held dumbbells / hip hinges, Imagen 4 Ultra for the bench-press bottom. Re-attempts after 3 don't help; priors don't budge. If no model works (currently: n/a), ship text-only fallback for that exercise.

## App Store assets

Already prepared in `store-assets/`:
- `APP_STORE_LISTING.md` — full description, keywords
- `PRIVACY_POLICY.md` — Armor (not Shift6) wording; cloud sync is opt-in
- `GOOGLE_PLAY_LISTING.md`
- `screenshots/` folder
- `BUILD_SUBMISSION_GUIDE.md`
