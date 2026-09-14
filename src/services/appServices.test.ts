import type { AnalyticsClient, AuthProvider } from './contracts';
import { UnavailableBackendClient, HttpBackendClient } from './backend';
import { createAppServices } from './appServices';

const auth: AuthProvider = {
  getSession: async () => null,
  getAccessToken: async () => null,
  signOut: async () => undefined,
};

describe('app service composition', () => {
  it('keeps the backend unavailable when no public API endpoint is configured', () => {
    const services = createAppServices({ auth, apiBaseUrl: '  ' });

    expect(services.auth).toBe(auth);
    expect(services.backend).toBeInstanceOf(UnavailableBackendClient);
  });

  it('injects auth into the configured vendor-neutral HTTP transport', async () => {
    let requestedToken: string | null = null;
    const services = createAppServices({
      auth: {
        ...auth,
        getAccessToken: async () => {
          requestedToken = 'token-from-provider';
          return requestedToken;
        },
      },
      apiBaseUrl: 'https://api.example.test',
      fetcher: async () =>
        new Response(JSON.stringify({ acknowledgedMutationIds: [], rejectedMutationIds: [] }), {
          status: 200,
        }),
    });

    expect(services.backend).toBeInstanceOf(HttpBackendClient);
    await services.backend.sync([]);
    expect(requestedToken).toBe('token-from-provider');
  });

  it('uses a no-op analytics client by default and preserves an injected client', () => {
    const defaultServices = createAppServices({ auth });
    const received: string[] = [];
    const analytics: AnalyticsClient = {
      track: (event) => received.push(event.name),
    };

    const configuredServices = createAppServices({ auth, analytics });

    expect(defaultServices.analytics).toBeDefined();
    expect(configuredServices.analytics).toBe(analytics);
    configuredServices.analytics.track({
      name: 'onboarding_started',
      occurredAt: '2026-09-14T12:00:00.000Z',
    });
    expect(received).toEqual(['onboarding_started']);
  });
});
