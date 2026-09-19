import type {
  AnalyticsClient,
  AuthProvider,
  BackendClient,
  CoachGateway,
  ErrorReporter,
} from './contracts';
import { createNoopAnalyticsClient } from './analytics';
import { UnavailableBackendClient, HttpBackendClient } from './backend';
import { HttpCoachGateway, UnavailableCoachGateway } from './coach';
import { ExpoConnectivityProvider } from './connectivity';
import { createNoopErrorReporter } from './errors';
import { createPlatformHealthProvider, type HealthProvider } from './health';
import type { ConnectivityProvider } from './syncCoordinator';

export interface AppServices {
  auth: AuthProvider;
  analytics: AnalyticsClient;
  backend: BackendClient;
  coach: CoachGateway;
  connectivity: ConnectivityProvider;
  errors: ErrorReporter;
  health: HealthProvider;
}

export interface AppServicesOptions {
  auth: AuthProvider;
  analytics?: AnalyticsClient;
  apiBaseUrl?: string | null;
  fetcher?: typeof fetch;
  connectivity?: ConnectivityProvider;
  coach?: CoachGateway;
  errors?: ErrorReporter;
  health?: HealthProvider;
}

/**
 * Composes replaceable service adapters without making the guest shell depend
 * on a concrete auth vendor or backend deployment.
 */
export function createAppServices({
  auth,
  analytics: configuredAnalytics,
  apiBaseUrl,
  fetcher,
  connectivity = new ExpoConnectivityProvider(),
  coach: configuredCoach,
  errors: configuredErrors,
  health: configuredHealth,
}: AppServicesOptions): AppServices {
  const backend = apiBaseUrl?.trim()
    ? new HttpBackendClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => auth.getAccessToken(),
        fetcher,
      })
    : new UnavailableBackendClient();
  const coach =
    configuredCoach ??
    (apiBaseUrl?.trim()
      ? new HttpCoachGateway({
          baseUrl: apiBaseUrl,
          getAccessToken: () => auth.getAccessToken(),
          fetcher,
        })
      : new UnavailableCoachGateway());
  const health = configuredHealth ?? createPlatformHealthProvider();
  const analytics = configuredAnalytics ?? createNoopAnalyticsClient();
  const errors = configuredErrors ?? createNoopErrorReporter();

  return { auth, analytics, backend, coach, connectivity, errors, health };
}
