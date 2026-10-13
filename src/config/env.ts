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

export type ReleaseMode = 'guest-only' | 'connected';

export function resolveRuntimeConfiguration(
  environmentValue: string | undefined,
  modeValue: string | undefined,
  urlValue: string | undefined,
) {
  const environment = parseAppEnvironment(environmentValue);
  const releaseMode = modeValue?.trim() || 'guest-only';
  if (releaseMode !== 'guest-only' && releaseMode !== 'connected')
    throw new Error('EXPO_PUBLIC_RELEASE_MODE must be guest-only or connected.');
  const apiBaseUrl = normalizeApiBaseUrl(urlValue, environment);
  if (releaseMode === 'guest-only' && apiBaseUrl)
    throw new Error('Guest-only builds cannot configure a backend URL.');
  if (releaseMode === 'connected' && environment === 'production' && !apiBaseUrl)
    throw new Error('Connected production builds require a backend URL.');
  return {
    environment,
    releaseMode: releaseMode as ReleaseMode,
    apiBaseUrl,
    hasConfiguredBackend: apiBaseUrl !== null,
  };
}

export const runtimeConfig = Object.freeze(
  resolveRuntimeConfiguration(
    process.env.EXPO_PUBLIC_ENVIRONMENT,
    process.env.EXPO_PUBLIC_RELEASE_MODE,
    process.env.EXPO_PUBLIC_API_BASE_URL,
  ),
);
export const isProduction = runtimeConfig.environment === 'production';
