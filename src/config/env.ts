export type AppEnvironment = 'development' | 'staging' | 'production';

const validEnvironments: AppEnvironment[] = ['development', 'staging', 'production'];
const configuredEnvironment = process.env.EXPO_PUBLIC_ENVIRONMENT;

const environment: AppEnvironment = validEnvironments.includes(
  configuredEnvironment as AppEnvironment,
)
  ? (configuredEnvironment as AppEnvironment)
  : 'development';

export const runtimeConfig = Object.freeze({
  environment,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || null,
  hasConfiguredBackend: Boolean(process.env.EXPO_PUBLIC_API_BASE_URL?.trim()),
});

export const isProduction = runtimeConfig.environment === 'production';
