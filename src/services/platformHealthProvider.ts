import type { HealthProvider } from './health';

/** Web and non-native fallback. Native builds resolve the platform files. */
export function createPlatformHealthProvider(): HealthProvider {
  return {
    async isAvailable() {
      return false;
    },
    async requestPermissions(types) {
      return {
        status: 'unavailable',
        grantedTypes: [],
        deniedTypes: [...types],
      };
    },
    async readSummaries() {
      return [];
    },
  };
}
