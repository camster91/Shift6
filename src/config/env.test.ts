import { normalizeApiBaseUrl, parseAppEnvironment } from './env';
import easBuildConfiguration from '../../eas.json';

describe('runtime environment configuration', () => {
  it.each(Object.entries(easBuildConfiguration.build))(
    'starts with the environment configured for the %s native build',
    (_name, profile) => {
      const configured = 'env' in profile ? profile.env.EXPO_PUBLIC_ENVIRONMENT : undefined;
      expect(() => parseAppEnvironment(configured)).not.toThrow();
    },
  );

  it('uses production release gates in the production native build', () => {
    expect(
      parseAppEnvironment(easBuildConfiguration.build.production.env.EXPO_PUBLIC_ENVIRONMENT),
    ).toBe('production');
  });

  it('defaults an omitted environment to development', () => {
    expect(parseAppEnvironment(undefined)).toBe('development');
    expect(parseAppEnvironment('   ')).toBe('development');
  });

  it.each(['development', 'staging', 'production'] as const)(
    'accepts the %s environment',
    (environment) => {
      expect(parseAppEnvironment(environment)).toBe(environment);
    },
  );

  it('fails closed on an invalid explicit environment', () => {
    expect(() => parseAppEnvironment('prodction')).toThrow('Invalid EXPO_PUBLIC_ENVIRONMENT');
  });

  it('normalizes an optional API base URL', () => {
    expect(normalizeApiBaseUrl(undefined, 'development')).toBeNull();
    expect(normalizeApiBaseUrl('  ', 'development')).toBeNull();
    expect(normalizeApiBaseUrl(' https://api.shift6.example/v1/ ', 'staging')).toBe(
      'https://api.shift6.example/v1',
    );
  });

  it('allows HTTP only outside production', () => {
    expect(normalizeApiBaseUrl('http://127.0.0.1:4000/', 'development')).toBe(
      'http://127.0.0.1:4000',
    );
    expect(() => normalizeApiBaseUrl('http://api.shift6.example', 'production')).toThrow(
      'Production EXPO_PUBLIC_API_BASE_URL must use HTTPS.',
    );
  });

  it('rejects malformed URLs and embedded credentials', () => {
    expect(() => normalizeApiBaseUrl('not-a-url', 'development')).toThrow(
      'EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.',
    );
    expect(() => normalizeApiBaseUrl('ftp://api.shift6.example', 'development')).toThrow(
      'EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.',
    );
    expect(() => normalizeApiBaseUrl('https://user:pass@api.shift6.example', 'production')).toThrow(
      'EXPO_PUBLIC_API_BASE_URL must not contain embedded credentials.',
    );
  });
});
