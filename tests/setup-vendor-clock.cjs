// The retained upstream callback test compares consecutive clock reads.
// Keep its source unchanged and pin only that suite's clock.
/* global beforeEach, afterEach, expect, jest */
let clock;
beforeEach(() => {
  const path = expect.getState().testPath.replaceAll('\\', '/');
  if (path.endsWith('/vendor/sprintf-js/test/test.js')) {
    clock = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  }
});
afterEach(() => {
  clock?.mockRestore();
  clock = undefined;
});
