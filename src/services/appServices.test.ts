import type { AuthProvider } from './contracts';
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
});
