# SHIFT6 release asset gate

Updated: 2026-09-19

SHIFT6 currently has SVG brand explorations in `assets/brand/`, but those source files are not final store-ready raster assets and are not wired into Expo release configuration.

Expo's current app-config guidance recommends a 1024×1024 PNG for the app icon, supports an Android adaptive foreground image/background configuration, and recommends verifying splash behaviour in a standalone/release build.

`npm run validate:release-assets` turns the repository-side portion of that requirement into a hard release gate. `npm run validate:release-ready` now includes this asset gate after the public URL/provider configuration gate.

## Required before the validator can pass

1. Figma/brand review approves the final SHIFT6 launcher icon and splash treatment.
2. Export a final 1024×1024 PNG app icon with a non-draft filename.
3. Export a final square Android adaptive foreground PNG of at least 512px.
4. Configure `expo.android.adaptiveIcon.backgroundColor`.
5. Prefer a matching Android monochrome PNG for themed icons; the validator warns if it is omitted.
6. Export/configure a local PNG for the `expo-splash-screen` plugin and set a six-digit hex background colour.
7. Wire the approved local paths into `app.json`.

Example shape only — filenames/colours are not approval:

```json
{
  "expo": {
    "icon": "./assets/release/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/release/adaptive-foreground.png",
        "monochromeImage": "./assets/release/adaptive-monochrome.png",
        "backgroundColor": "#000000"
      }
    },
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/release/splash.png",
          "backgroundColor": "#000000"
        }
      ]
    ]
  }
}
```

Do not copy the example values as final design decisions.

## What the script enforces

- app icon is a repository-local PNG and exactly 1024×1024;
- adaptive foreground is a repository-local square PNG at least 512px;
- adaptive background uses `#RRGGBB`;
- optional monochrome asset matches foreground dimensions;
- splash plugin uses configured form with a local PNG and `#RRGGBB` background;
- release asset filenames cannot contain `draft`, `placeholder`, `temp`, or `sample`;
- configured release asset paths cannot escape the repository or use remote URLs.

## What it cannot prove

A passing script does not prove visual quality, platform guideline compliance, accessibility, safe-zone composition, contrast on real launchers, or correct splash appearance. Those remain Figma/human review plus signed iOS/Android device QA. Expo also notes that development/Expo Go splash behaviour does not fully represent standalone release behaviour.
