# QA Loop 3 — Cross-platform (does it work everywhere?)

**Date:** 2026-06-06
**Goal:** Find the rendering issues that only show up on specific browsers, devices, or screen sizes.
**Method:** 2 subagents, one testing viewport matrix, one testing browser matrix.

**Subagent E — Viewport matrix (paste this prompt):**

```
You are a QA tester for responsive design. The Armor PWA is used on iPhones, Androids,
iPads, and desktops. Test how it looks and works at each size.

Open https://getshift6.com in Chrome DevTools with device emulation. For each viewport:
- Set the viewport
- Go through onboarding + dashboard
- Take a screenshot
- Note any layout issues

**Viewports to test:**
- iPhone SE (375×667) — smallest modern iPhone
- iPhone 14 (390×844) — the design viewport
- iPhone 14 Pro Max (430×932) — the design max
- iPhone 14 Pro Max @3x export (1290×2796) — the marketing screenshot size
- Pixel 7 (412×915)
- iPad Mini (768×1024) — tablet portrait
- iPad Pro 12.9" (1024×1366) — large tablet
- Desktop 1280×800
- Desktop 1920×1080

**For each viewport, check:**
- Does the bottom nav render correctly?
- Are buttons ≥44px tap targets?
- Is text readable (not clipped, not too small)?
- Are the dashboard stat tiles aligned?
- Does the workout session card fit?
- Is there horizontal overflow?
- Are the marketing-grade sections (if any) preserved?

**Output:** Write to `~/Shift6/docs/loop3-viewports.md`. For each viewport:
- A screenshot
- Pass/fail
- Specific issues if fail
```

**Subagent F — Browser matrix (paste this prompt):**

```
You are a QA tester for cross-browser compatibility. The Armor PWA needs to work in
Safari (iOS), Chrome (Android), and modern desktop browsers.

Test the PWA in each browser, on each platform. For each:
- Does it load?
- Does onboarding work?
- Does the workout session work?
- Does the service worker register?
- Does the install prompt appear?
- Any visual issues?

**Browsers to test (if you can):**
- Safari 17 on iOS 17 (real device if possible)
- Chrome on Android (real device if possible)
- Chrome desktop (latest)
- Firefox desktop (latest)
- Safari desktop (latest)
- Edge (latest)

**Output:** Write to `~/Shift6/docs/loop3-browsers.md`. For each:
- Pass/fail
- Specific issues
