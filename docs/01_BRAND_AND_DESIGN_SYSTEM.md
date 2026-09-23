# SHIFT6 — Brand & Design System

> **Canonical scope, 2026-09-23:** [#304](https://github.com/camster91/Shift6/issues/304) defines **Six weeks. One measurable goal.** [The goal-first release contract](25_GOAL_FIRST_RELEASE_CONTRACT.md) and [#305](https://github.com/camster91/Shift6/issues/305) supersede conflicting launch breadth below. Counts of 20 programs and 300+ exercises are future catalogue targets or historical implementation facts, never focused-v1 quotas. Existing technical evidence is not human content, Figma or native release approval.

#319 defines the Figma-first custom visual and motion world in [the prompt system](07_ASSET_AND_ICON_PROMPTS.md). The older five-destination navigation is historical design direction; #308 makes one active Shift and Today dominant, with Coach contextual. Use native motion for frequent actions and static/reduced-motion alternatives.


## Design objective

Build an original premium fitness identity based on the visual direction supplied in the reference screenshots: light surfaces, lavender framing, rounded cards, black high-contrast controls, pastel information blocks, clean photography, playful dimensional objects, and spacious mobile layouts.

Reference:
https://dribbble.com/shots/23040815-Fitness-App-Design-Concept

Do not reproduce the source composition, artwork, icons, exact typography, or proprietary assets. Use it as mood and interaction direction only.

## Brand idea

**SHIFT6** means deliberate improvement in six-week intervals.

Brand themes:
- progress without obsession;
- strength for life;
- measurable change;
- calm confidence;
- human coaching + intelligent assistance.

Possible supporting lines:
- “Progress, six weeks at a time.”
- “Build the next six weeks.”
- “Train. Review. Shift.”
- “Your next six starts here.”

Primary recommendation: **Progress, six weeks at a time.**

## Logo direction

Create an original SHIFT6 wordmark where the “6” is the brand anchor.

Concept routes:
1. numeral 6 formed by a continuous progress loop with a forward notch;
2. S + 6 monogram using two interlocking curves;
3. six-segment ring with one segment shifting forward;
4. barbell plate with six minimal index marks;
5. stacked progress bars forming a subtle 6.

Avoid generic lightning bolts, aggressive bodybuilding imagery, flames, skulls, or macho visual language.

## Colour system

### Core
- Ink / near black: `#0D101B`
- Canvas: `#F8F8F8`
- Pure white: `#FFFFFF`
- Lavender background: `#E9E4FF`
- Primary lavender: `#B3A0FF`
- Primary blue: `#A0C6FF`

### Supporting pastels
- Mint: `#B9EFC5`
- Cyan: `#A8E6EF`
- Warm yellow: `#FFC768`
- Soft coral: `#FFB5A8`
- Soft pink: `#F2A6E8`
- Rest grey: `#E9EAEE`

### Semantic
- Success: use green plus icon/text, never colour alone.
- Warning: warm amber plus explicit label.
- Error: accessible red with descriptive text.
- Info: blue.

All text/background combinations must pass WCAG AA at minimum. Pastels are primarily card backgrounds, not body-text colours.

## Typography

The reference uses a rounded geometric sans style. Do not assume the reference font is licensed.

Implementation recommendation:
- Primary: **Manrope** or another licensed/open-source geometric humanist sans.
- Display: same family at heavier weights to keep system simple.
- Numbers: tabular numerals for loads, timers, sets, charts.

Type scale target:
- Display 40/44 semibold
- H1 32/36 semibold
- H2 24/30 semibold
- H3 20/26 semibold
- Body 16/24 regular
- Small 14/20 regular
- Caption 12/16 medium

Support dynamic type up to accessibility sizes without clipping critical controls.

## Shape language

- Main cards: 20–28 px corner radius
- Small cards/chips: 12–18 px
- Buttons: 16–22 px or full pill for compact actions
- Bottom nav: black rounded capsule floating above safe area
- Minimum touch target: 44×44 iOS / 48×48 Android

## Layout

- 8-point base grid
- 20–24 px horizontal phone padding
- generous vertical whitespace
- one primary action per screen
- important metrics above the fold
- charts must include textual summaries

## Navigation

Primary tabs:
1. Home
2. Programs
3. Progress
4. Coach
5. Profile

On smaller widths, Coach may be a prominent floating/action entry while Profile moves to Home avatar, but default planning assumes five destinations are still reachable accessibly.

## Card categories

- Strength: lavender
- Cardio: blue/cyan
- Mobility: mint
- Recovery: cool grey
- Power: warm yellow
- Coach insight: light lavender/white gradient
- Health signal: blue or mint based on category

## Motion

Use motion as feedback, not decoration.
- 150–250 ms transitions
- subtle card expansion
- circular cycle progress animation
- completion check transitions
- number count-up only when reduced motion is off
- honour iOS/Android reduced-motion settings

## 3D accent strategy

Use small original 3D objects as category accents, echoing the reference mood without copying it.

Examples:
- abstract plates;
- simplified dumbbell;
- six-segment ring;
- soft foam blocks;
- curved progress bands;
- simple bike wheel;
- balance disc.

These should never replace functional icons.

## Photography

Exercise media should be instructional, neutral, and consistent:
- uncluttered gym background;
- full body visible when relevant;
- inclusive range of models;
- correct equipment;
- no misleading maximal loads;
- consistent camera angles by movement category;
- optional dark/transparent overlays only when text must sit over image.

## Figma requirements

Create one Figma library with:
- primitives/tokens;
- typography styles;
- colour variables for light and dark mode;
- spacing/radius variables;
- icon components;
- buttons;
- chips;
- cards;
- list rows;
- charts;
- workout set row;
- exercise card;
- program card;
- cycle progress component;
- coach proposal component;
- bottom navigation;
- sheet/modal patterns;
- empty/error/loading states.

Every production screen should be composed from library components wherever practical.

## Accessibility acceptance criteria

- No status communicated by colour only.
- Contrast AA minimum.
- 200% text scaling does not prevent workout completion.
- Controls have meaningful accessibility labels.
- Charts have text equivalents.
- Reduced motion respected.
- Haptics optional.
- Exercise videos have captions/transcript or written instructions.
