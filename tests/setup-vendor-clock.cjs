// The retained sprintf-js callback test compares two separate Date.now calls.
// Pin only that upstream suite's clock; preserve its source/checksum and keep
// application suites on their own clocks.
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
