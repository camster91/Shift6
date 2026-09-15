# SHIFT6 asset pipeline

`assets/` is the checked-in handoff boundary for original, reviewed visual
assets. Figma is the source of truth for the design system; exported files are
versioned here only after naming, accessibility, provenance, and review status
are recorded in `asset-manifest.json`.

The first source vectors are the original SHIFT6 S6 mark and app-icon geometry
in `brand/`. They are implementation-ready explorations, not a store-approved
icon export. The app currently uses the semantic icon registry in
`src/design/iconography.ts`, with Ionicons as a temporary glyph fallback. This
keeps product screens decoupled from the fallback library while the Figma
library and production raster exports are reviewed.

Exercise imagery and instructional media remain blocked until a human reviews
technique, accessibility alt text, licensing/provenance, and platform crops.
Do not treat generated or draft media as production content.
