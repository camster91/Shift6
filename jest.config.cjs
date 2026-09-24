module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    '^@kingstinct/react-native-healthkit$': '<rootDir>/tests/mocks/healthkit.ts',
    '^react-native-health-connect$': '<rootDir>/tests/mocks/health-connect.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
