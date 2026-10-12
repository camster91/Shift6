import { normalizeApiBaseUrl, parseAppEnvironment, resolveRuntimeConfiguration } from './env';
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

test('guest-only mobile builds fail closed on a configured backend and default to local data', () => {
  expect(resolveRuntimeConfiguration('production', undefined, undefined).releaseMode).toBe(
    'guest-only',
  );
  expect(() =>
    resolveRuntimeConfiguration('production', 'guest-only', 'https://api.invalid'),
  ).toThrow('cannot configure');
  expect(() => resolveRuntimeConfiguration('production', 'connected', undefined)).toThrow(
    'require a backend',
  );
  expect(() => resolveRuntimeConfiguration('production', 'typo', undefined)).toThrow(
    'RELEASE_MODE',
  );
  for (const profile of Object.values(easBuildConfiguration.build))
    expect(profile.env.EXPO_PUBLIC_RELEASE_MODE).toBe('guest-only');
});
