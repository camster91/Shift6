import type { AuthProvider, BackendClient } from './contracts';
import { UnavailableBackendClient, HttpBackendClient } from './backend';
import { ExpoConnectivityProvider } from './connectivity';
import type { ConnectivityProvider } from './syncCoordinator';

export interface AppServices {
  auth: AuthProvider;
  backend: BackendClient;
  connectivity: ConnectivityProvider;
}

export interface AppServicesOptions {
  auth: AuthProvider;
  apiBaseUrl?: string | null;
  fetcher?: typeof fetch;
  connectivity?: ConnectivityProvider;
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
}: AppServicesOptions): AppServices {
  const backend = apiBaseUrl?.trim()
    ? new HttpBackendClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => auth.getAccessToken(),
        fetcher,
      })
    : new UnavailableBackendClient();

  return { auth, backend, connectivity };
}
