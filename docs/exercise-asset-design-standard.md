# Shift6 Exercise Asset Design Standard

## Overview
Replace all emoji icons and placeholder graphics with a unified set of 
AI-generated exercise illustrations that feel premium, consistent, and 
visually branded. This is critical for App Store / Play Store appeal and 
user trust.

---

## Current State
- **91 exercises** across 9 body-part categories
- **Existing assets**: 5 generated exercise icons (pushups, squats, lunges, v-ups, glute bridge) – ~400–500KB PNGs each, inconsistent style
- **Current UI**: Uses emoji (💪, 🦵, 🔥, 🎯, etc.) for exercise cards, lists, and filters
- **Goal**: Every exercise gets a branded thumbnail; body-part filters get branded icons

---

## Design Standard

### 1. Visual Style
| Property | Specification |
|----------|---------------|
| **Style** | Minimalist flat-vector 3D (isometric or slightly angled top-down) |
| **Color treatment** | Duotone — base illustration in slate-800 (#1e293b), accented with the exercise's assigned body-part color (cyan, blue, emerald, etc.) |
| **Background** | Transparent PNG or subtle gradient circle behind subject |
| **Figures** | Stylized gender-neutral silhouettes (no faces, no identifying features) |
| **Equipment** | Simplified geometric shapes, never photorealistic |
| **Shadow** | Soft diffuse shadow beneath the figure (y: 4px, blur: 12px, opacity: 15%) |
| **Dimensions** | **1024×1024** source (square), used at 128×128, 64×64, 48×48 in UI |
| **Format** | PNG with transparency (fallback to WebP when Capacitor supports it) |

### 2. Color Map by Body Part
Each body part has a primary accent color used in every illustration for exercises in that category.

| Body Part | Accent Color | Hex | Tailwind |
|-----------|--------------|-----|----------|
| Chest | Cyan | #06b6d4 | `cyan-500` |
| Back | Blue | #3b82f6 | `blue-500` |
| Shoulders | Indigo | #6366f1 | `indigo-500` |
| Legs | Emerald | #10b981 | `emerald-500` |
| Arms | Orange | #f97316 | `orange-500` |
| Core | Yellow | #eab308 | `yellow-500` |
| Glutes | Pink | #ec4899 | `pink-500` |

### 3. Composition Rules
- **Centered subject**: Exercise action fills 70–80% of frame
- **Clean silhouette**: Figure against transparent background with subtle ground plane
- **Action clarity**: Must be instantly recognizable at 64×64 pixels
- **No text**: Never embed exercise names in the image
- **Safe zone**: Keep subject within central 80% of square to avoid clipping

### 4. Prompt Engineering Template
```
Minimalist flat-vector 3D fitness illustration, gender-neutral stylized 
athlete performing [EXERCISE NAME] in [START/END/MID] position, 
duotone slate-dark (#1e293b) and [ACCENT COLOR NAME] (#HEX), 
transparent background, clean geometric shapes, soft diffuse shadow, 
isometric angle, sports-app icon style, 1024x1024, no text, no faces
```

---

## Production Plan

### Phase 1: Establish Base + Body-Part Filters (Day 1)
Generate **7 body-part category icons** (128×128, used in filter tabs, onboarding, exercise list headers).
- These are NOT exercise poses — they are **symbolic icons** representing the muscle group
- Style: Same duotone flat-vector, more abstract/iconic than exercise poses

1. Chest – stylized pectoral / push-up shape
2. Back – lat spread / pull silhouette
3. Shoulders – deltoid / press silhouette
4. Legs – quads / squat silhouette
5. Arms – bicep curl silhouette
6. Core – plank / crunch silhouette
7. Glutes – hip thrust / bridge silhouette

**Estimated cost**: 7 images × ~30s generation = ~3.5 min compute

### Phase 2: Core 20 Exercises (Days 1–2)
These are the exercises shown in onboarding and appear most frequently in beginner home routines. They must be perfect.

| # | Exercise | Body Part | Priority |
|---|----------|-----------|----------|
| 1 | Push-Ups | Chest | P0 |
| 2 | Bodyweight Squats | Legs | P0 |
| 3 | Pull-Ups | Back | P0 |
| 4 | Plank | Core | P0 |
| 5 | Lunges | Legs | P0 |
| 6 | Burpees | Core | P0 |
| 7 | Bicep Curls | Arms | P1 |
| 8 | Tricep Dips | Arms | P1 |
| 9 | Shoulder Press | Shoulders | P1 |
| 10 | Crunches | Core | P1 |
| 11 | Glute Bridges | Glutes | P1 |
| 12 | Dumbbell Row | Back | P1 |
| 13 | Leg Raises | Core | P1 |
| 14 | Calf Raises | Legs | P1 |
| 15 | Wall Sits | Legs | P1 |
| 16 | Mountain Climbers | Core | P1 |
| 17 | Russian Twists | Core | P1 |
| 18 | V-Ups | Core | P1 |
| 19 | Side Plank | Core | P1 |
| 20 | Bicycle Crunches | Core | P1 |

**Estimated cost**: 20 images × ~30s = ~10 min

### Phase 3: Complete Library (Days 2–3)
Remaining 71 exercises, batched by body part for color consistency.

| Body Part | Count | Batch |
|-----------|-------|-------|
| Chest | 9 | Batch 1 |
| Back | 9 | Batch 2 |
| Shoulders | 9 | Batch 3 |
| Legs | 16 | Batch 4 |
| Arms | 8 | Batch 5 |
| Core | 12 | Batch 6 |
| Glutes | 3 | Batch 7 |

**Total**: 71 images × ~30s = ~35 min

### Phase 4: Integration & Fallbacks (Day 3)
1. Add `image` field to every exercise in `exercises.js`
2. Update UI components to use images instead of emoji
3. Build graceful fallback: if image fails to load, show emoji + body-part color circle
4. Optimize all images with `sharp` CLI or `squoosh` for WebP variants

---

## File Organization
```
/public/assets/exercises/
  ├── body-parts/
  │   ├── chest.png        (512×512 symbolic)
  │   ├── back.png
  │   ├── shoulders.png
  │   ├── legs.png
  │   ├── arms.png
  │   ├── core.png
  │   └── glutes.png
  ├── exercises/
  │   ├── pushups.png
  │   ├── squats.png
  │   ├── pullups.png
  │   └── ... (91 total)
  └── webp/               (future optimization)
      ├── pushups.webp
      └── ...
```

## Code Changes Required

### `src/data/exercises.js`
Add `image` field to each exercise:
```js
{ id: 'pushups', name: 'Push-Ups', bodyPart: 'Chest', image: '/assets/exercises/pushups.png', ... }
```

### `src/components/ExerciseCard.jsx` (if exists) or inline lists
Replace emoji spans with `<img>`:
```jsx
<img 
  src={ex.image} 
  alt="" 
  className="w-12 h-12 object-contain" 
  onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML = BODY_PART_ICONS[ex.bodyPart]; }}
/>
```

### `src/pages/Onboarding.jsx`
Replace equipment/level icons in cards. Replace body-part emoji in step 4.

### `src/pages/Dashboard.jsx`
Replace today's workout exercise icons.

### `src/pages/ExerciseLibrary.jsx`
Replace all list item icons.

---

## Quality Gates
- [ ] All 7 body-part icons share identical lighting, angle, and stroke weight
- [ ] All 91 exercise illustrations use consistent figure proportions
- [ ] Every image loads in <100ms on 3G (target: <50KB after WebP)
- [ ] Images work at 48×48 (list), 64×64 (cards), 128×128 (hero/detail)
- [ ] Onboarding with no images looks intentional, not broken (color + emoji fallback)

---

## Cost Estimate (Gemini Imagen)
Assuming ~30s per image generation at current free tier / rate limits:
- Phase 1: 7 images
- Phase 2: 20 images
- Phase 3: 71 images (can be spread over time)
- **Total: 98 images**

If rate-limited to ~15/day, full library takes ~7 days. Prioritize P0/P1 for launch.

## Risks
1. **Inconsistent style across batches** — Mitigation: Save the first successful prompt as a template; vary only the exercise name and position keywords.
2. **Rate limits / API errors** — Mitigation: Build emoji fallback first so UI is never broken.
3. **Large file sizes** — Mitigation: Generate at 512×512 (not 1024) and compress aggressively. The UI only needs 128×128 display.
4. **Copyright / trademark** — Mitigation: Prompts avoid branded equipment (no "Nike", no "Rogue"). Use generic shapes.
