# SHIFT6 visual world and versioned production prompts

Canonical visual issue [#319](https://github.com/camster91/Shift6/issues/319); product [#304](https://github.com/camster91/Shift6/issues/304). This is planning, not approved art. No production images or videos are generated in #305. Keep the current SVG explorations labelled exploratory until Figma and native review.

## Master Visual DNA — v1 draft

> Create an original, calm premium SHIFT6 visual for a six-week, one-goal training app. Use sculptural tactile geometry, editorial composition and generous negative space. Core tokens: soft lavender, powder blue, cool mint, warm cream, off-white and deep charcoal. Keep material response, camera height/angle, focal feel, light direction, soft contact shadows and object scale consistent across the collection. Preserve clear small-screen silhouettes. Make it feel custom and art-directed. Keep final UI text out of generated imagery and compose it precisely in Figma.

Negative constraints: generic fitness stock photography as primary identity, neon/cyber gym, flames, lightning bolts, skulls, trophies, coins, confetti, macho bodybuilding, generic SaaS illustration, random 3D styles, third-party marks, fabricated physical results, shame or punishment imagery. Define camera, lens, light, materials, surface, background, crop/safe areas, colour mapping and small-size detail in a versioned Visual DNA board before approving any prompt.

## Six-part signature

Explore six sculptural segments, linked modules, a six-step arc, path or shifting blocks. Select one proprietary family distinguishable from Apple Activity Rings and other recognisable progress systems. Test at 24–48 px, as a still and in motion. Define Week 1–6, active, paused, resumed, reviewed, target reached, progress made, maintain and next Shift without equating week completion to measured performance. Each state needs a label outside art and a reduced-motion still.

## Production families and variants

| Family | Briefs | Required variants |
| --- | --- | --- |
| Shift hero objects | Rep pilot, timed pilot, Barbell/strength pilot; future push-up, pull-up, core/plank, bench, running/5K, conditioning | Square card 1:1, landscape 16:9, portrait 9:16, transparent object, small-detail and dark-surface variants |
| Baseline | Ready, rep, timed, known result, deferred, not-yet-able | Static accessible illustration and small icon |
| Honest result | Target reached, meaningful improvement, unchanged, lower result, test postponed, no test, non-comparable, target reached early | Still and optional reveal; improved without target must not imply failure |
| Return | Welcome back, paused, schedule adjusted, repeat this week, re-entry session, shortened session, resume | Still and restrained transition; no broken chains or streaks |
| System | No active Shift, no history, offline workout, sync pending, conflict/review, account versus backup, permissions unavailable, feature unavailable, content under review | Still, explicit status copy, recovery action |
| Milestone | First session, week complete, midpoint, personal best, Week 6, review, next Shift | Sculptural object, no coins or reward economy |

Hero template: "Using SHIFT6 Master Visual DNA v1, depict [reviewed goal] through [subject/material], with the six-part motif integrated structurally. [Composition/camera/light]. Communicate [state] without invented performance numbers. No embedded copy or person unless separately justified. Preserve mobile centre safe area and consistent small-size silhouette. Produce [aspect ratio/variant]."

## Motion grammar

Purposeful, tactile, calm movement with restrained easing and little overshoot. Define trigger, start/end frames, continuity, duration, haptic, loading/offline/error and static/reduced-motion response for: navigation, set complete, rest timer, exercise transition, workout complete, PR, week transition, milestone, pause/resume, re-entry, result reveal and next Shift. A PR animation fires only from an actual comparable observation. A complete session never prompts unsafe extra work.

Frequent interactions use app-native motion; decorative rendered loops only when they add visual value. Plan 2–5 second silent in-app loops and 5–12 second onboarding/marketing scenes. Storyboard a 15–30 second store trailer from real screens and clearly illustrative data. Each clip has a poster, source master, safe crop, loop policy and reduced-motion alternative. GIF is for review/sharing, not the assumed runtime format.

Motion template: "SHIFT6 [state], Master Visual DNA v1. Begin [start], move [action] over [duration], resolve [end] with locked camera, continuous object/material/light and mobile-safe crop. [loop/no loop]. No embedded text. Final frame is the static fallback. Do not imply unmeasured improvement."

## Custom icons and exercise media

Design original icon families for navigation, workout actions, equipment, movement types, goal categories, schedule, progress, system states, health/privacy and contextual Coach. Specify grid, stroke, radius, optical weight, selected state, accessibility label and small-size tests. Normalize/redraw any generated exploration as clean vectors.

Exercise instruction media is a separate safety-sensitive pipeline. Record stable variant ID, start/end positions, visible joints and equipment, camera angle, setup, reviewer, provenance and revision history. A generated human technique image is never publication-ready without real human fitness review. See [exercise review](18_EXERCISE_CONTENT_REVIEW.md).

## Prompt record schema

Store one versioned record per asset with these keys:

```json
{
  "asset_id": "shift6-result-improved-v01",
  "family": "result",
  "screen/state": "review/improved",
  "purpose": "Respectful measured-result illustration",
  "master_style_version": "v1-draft",
  "subject": "six-part sculptural path",
  "composition": "centre-safe editorial crop",
  "camera": "Visual DNA board reference pending",
  "materials": ["soft tactile ceramic"],
  "palette_tokens": ["lavender", "cream", "charcoal"],
  "lighting": "Visual DNA board reference pending",
  "background": "off-white",
  "aspect_ratio": "1:1",
  "safe_area": "centre 70%",
  "motion_duration": null,
  "loop": false,
  "start_state": null,
  "end_state": null,
  "negative_constraints": ["no numerical result", "no failure imagery"],
  "accessibility_fallback": "static art with result stated in accessible text",
  "runtime_intent": "lazy decorative art",
  "human_review_required": true,
  "provenance": "prompt and source link pending",
  "status": "planned"
}
```

Statuses: `planned`, `generated-draft`, `art-directed`, `approved`, `implemented`, `retired`. Prompt revisions and exported asset versions advance separately. Naming examples: `shift6-shift-pullup-hero-v01`, `shift6-baseline-reps-ready-v01`, `shift6-week-03-progress-v01`, `shift6-workout-set-complete-motion-v01`, `shift6-return-welcome-back-v01`, `shift6-result-improved-v01`, `shift6-result-target-reached-v01`.

## Figma-first workflow

1. Build Visual DNA board.
2. Approve camera/material/lighting rules.
3. Approve six-part motif.
4. Produce three to five explorations.
5. Select one art direction.
6. Design Goal Select, Home, Workout, Progress and Review in Figma with real states.
7. Place draft assets to test composition.
8. Generate a small exploration batch.
9. Art-direct against real screens.
10. Approve the system.
11. Produce the library from versioned prompts.
12. Normalize/edit vectors, raster and motion.
13. Test small and large mobile layouts.
14. Implement still and reduced-motion fallbacks.

Critical workout actions cannot depend on downloading decorative media. Lazy-load noncritical media, avoid simultaneous autoplay, pause off-screen motion where practical and test low/mid-range Android. No important state may exist only in colour, video, motion or haptics. The [release asset gate](23_RELEASE_ASSET_GATE.md) and human/device review remain separate.
