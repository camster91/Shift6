export type AppEnvironment = 'development' | 'staging' | 'production';

const validEnvironments: readonly AppEnvironment[] = ['development', 'staging', 'production'];

export function parseAppEnvironment(configuredEnvironment: string | undefined): AppEnvironment {
  const normalized = configuredEnvironment?.trim();
  if (!normalized) return 'development';
  if (validEnvironments.includes(normalized as AppEnvironment)) {
    return normalized as AppEnvironment;
  }
  throw new Error(
    `Invalid EXPO_PUBLIC_ENVIRONMENT "${normalized}". Expected development, staging, or production.`,
  );
}

export function normalizeApiBaseUrl(
  configuredUrl: string | undefined,
  environment: AppEnvironment,
): string | null {
  const normalized = configuredUrl?.trim();
  if (!normalized) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must not contain embedded credentials.');
  }
  if (environment === 'production' && parsed.protocol !== 'https:') {
    throw new Error('Production EXPO_PUBLIC_API_BASE_URL must use HTTPS.');
  }

  return normalized.replace(/\/+$/, '');
}

const environment = parseAppEnvironment(process.env.EXPO_PUBLIC_ENVIRONMENT);
const apiBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL, environment);

export const runtimeConfig = Object.freeze({
  environment,
  apiBaseUrl,
  hasConfiguredBackend: apiBaseUrl !== null,
});

export const isProduction = runtimeConfig.environment === 'production';
