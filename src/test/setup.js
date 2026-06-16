// Vitest setup — runs before each test file.
// jsdom environment is configured in vite.config.js, so `window`, `document`,
// `localStorage`, and `navigator` are all available here.
//
// Add global test setup below as the test suite grows. Today (June 2026)
// the repo has no tests, so this file is just a placeholder that proves
// the test runner can find the setup path. See CODE_REVIEW.md (2026-04-12,
// pre-rebrand "Shift6") for the prior 15+ test files that were removed
// during the rebrand; they should be re-added as v3 ships.
import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia; stub it so PWA/responsive code paths
// that gate on it don't throw during render.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
