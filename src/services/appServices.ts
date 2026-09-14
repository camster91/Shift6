import type { AuthProvider, BackendClient, CoachGateway } from './contracts';
import { UnavailableBackendClient, HttpBackendClient } from './backend';
import { HttpCoachGateway, UnavailableCoachGateway } from './coach';
import { ExpoConnectivityProvider } from './connectivity';
import type { ConnectivityProvider } from './syncCoordinator';

export interface AppServices {
  auth: AuthProvider;
  backend: BackendClient;
  coach: CoachGateway;
  connectivity: ConnectivityProvider;
}

export interface AppServicesOptions {
  auth: AuthProvider;
  apiBaseUrl?: string | null;
  fetcher?: typeof fetch;
  connectivity?: ConnectivityProvider;
  coach?: CoachGateway;
}

/**
 * Composes replaceable service adapters without making the guest shell depend
 * on a concrete auth vendor or backend deployment.
 */
export function createAppServices({
  auth,
  apiBaseUrl,
  fetcher,
  connectivity = new ExpoConnectivityProvider(),
  coach: configuredCoach,
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

  return { auth, backend, coach, connectivity };
}
