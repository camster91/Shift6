# Armor — Google Play Store Listing Copy

**App name:** Armor (50 chars max — fits)
**Short description:** 80 chars max
**Full description:** 4000 chars max
**Category:** Health & Fitness (primary), Lifestyle (secondary)
**Content rating:** Everyone (PEGI 3 / ESRB E)
**Target audience:** Adults 18+

---

## Short Description (80 chars max)

> Train through the chaos. 6-week periodization + 5 contingency protocols.

(73 chars)

---

## Full Description (4000 chars max)

```
Armor is the fitness app for professionals whose schedule doesn't respect their workout.

Whether you've got 20 minutes between meetings, a brutal weekend behind you, or a hotel gym in a city you can't pronounce — Armor has a protocol for that.

🏋️ 2 PILLARS OF LONGEVITY

• VO₂ Max — Norwegian 4×4 intervals
• Strength — Periodized 6-week cycles

➕ 4 DAILY LONGEVITY HABITS

• Post-meal walks — Two 10-minute walks blunt glucose spikes
• Single-leg balance — 2-3 min per leg, eyes closed
• Evening floor work — 5-min mobility (hips, hamstrings, thoracic spine)
• Third daily walk — tracked as part of your habit stack

🛡️ 5 CONTINGENCY PROTOCOLS (the part that makes Armor different)

• Minimum Viable Day — No gym? No problem. Streak protected.
• 20-Minute Window — In a meeting crunch. Workout stripped to essentials.
• High CNS Fatigue — Auto-downgrades to 60% 1RM. Protects central nervous system.
• Heavy Meal — Extends post-dinner walk to 20 min. Blunts glucose spike.
• Travel Mode — Progression frozen. Bodyweight substitutions activate.

📊 FEATURES

• 5-rep max test to discover your baseline — no dangerous max testing
• Plate math per session (per-side breakdown, color-coded)
• 6-week auto-rolling cycles: +5 lbs upper body, +10 lbs lower body
• PR detection with confetti + streak bonus
• Apple Watch support
• Optional cloud sync (end-to-end yours, local-first by default)
• Works offline
• Apple-caliber design — Apple HIG, zero clutter, no upsells

🆓 FREE FOREVER

No subscription. No data harvesting. Your training data lives on your phone.

🔐 PRIVACY

Armor is local-first. Nothing leaves your device until you opt into cloud sync. We do not sell your data. We do not show you ads. The optional cloud sync is end-to-end yours — your password is hashed with bcrypt, your data lives in Postgres, and you can wipe your cloud account at any time.

♿ ACCESSIBILITY

Designed for everyone. WCAG 2.1 AA. Honors prefers-reduced-motion and prefers-contrast. All touch targets ≥ 44dp. TalkBack compatible.

Built by people who know the meeting runs long.
```

---

## Tags (50 chars max each, comma-separated)

```
workout, fitness, vo2, strength, periodization, longevity, gym, plate math
```

(67 chars total — fits)

---

## Screenshots (Android)

**Required:** Min 2, max 8 phone screenshots. JPEG or 24-bit PNG, no alpha.

**Recommended dimensions:** 1080 × 1920 px (or higher maintaining ratio)

**Suggested order:**
1. Dashboard with today's workout
2. Workout session with plate math
3. Contingency protocols
4. PR celebration
5. Progress with 6-week cycle
6. Account / cloud sync

---

## Feature Graphic (REQUIRED)

**Dimensions:** 1024 × 500 px, PNG or JPEG, ≤ 1 MB

**Content:**
- ⚔️ icon (large, cyan)
- "Armor" wordmark
- Tagline: "Train Through Chaos"
- "2 Pillars · 4 Habits · 5 Contingency Protocols · Free Forever"
- Background: #020617 with subtle cyan glow

See `feature-graphic.svg` in `store-assets/` for the vector source.

---

## App Icon (REQUIRED)

**Dimensions:** 512 × 512 px PNG (for Play Store), 192 × 192 px adaptive icon

**Content:** ⚔️ icon on `#020617` background, vector for sharpness

---

## Promotional Graphics

| Asset | Dimensions | Required |
|-------|-----------|----------|
| Feature graphic | 1024 × 500 | Yes |
| Promo graphic (small) | 180 × 120 | Optional |
| Promo graphic (large) | 1024 × 768 | Optional |
| TV banner | 1280 × 720 | Optional (if Android TV) |

---

## Pricing & Distribution

- **Pricing:** Free
- **In-app purchases:** None
- **Subscriptions:** None
- **Countries:** All available
- **Content guidelines compliance:** Yes
- **Data safety form:** Required — see below

---

## Data Safety Form (REQUIRED)

**Data collection:**
- Email (optional, only if user signs in for cloud sync)
- Password (bcrypt-hashed, never plaintext)
- Workout logs (1RM, sets, reps, weight, dates) — stored on device by default
- Habit tracking (yes/no states) — stored on device by default
- Streak data (dates, count) — stored on device by default

**Data sharing:** None. We do not share with third parties.

**Data encryption in transit:** Yes (TLS 1.3) for optional cloud sync
**Data encryption at rest:** Yes (device-level encryption, plus bcrypt for password)

**User controls:**
- Delete account: Yes (settings → reset)
- Delete cloud data: Yes (sign in, then reset)
- Local data stays after account deletion: Yes (we don't touch it)

**Compliance:**
- GDPR compatible (right to erasure, data portability via local export)
- CCPA compatible (no sale of personal information)
- COPPA: not directed at children under 13
