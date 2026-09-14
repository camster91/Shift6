module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
