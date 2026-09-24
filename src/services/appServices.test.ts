import type { AnalyticsClient, AuthProvider, ErrorReporter } from './contracts';
import { UnavailableBackendClient, HttpBackendClient } from './backend';
import { HttpCoachGateway, UnavailableCoachGateway } from './coach';
import { createAppServices } from './appServices';

const auth: AuthProvider = {
  getSession: async () => null,
  getAccessToken: async () => null,
  signOut: async () => undefined,
};

describe('app service composition', () => {
  it('keeps backend and Coach unavailable when no public API endpoint is configured', () => {
    const services = createAppServices({ auth, apiBaseUrl: '  ' });

    expect(services.auth).toBe(auth);
    expect(services.backend).toBeInstanceOf(UnavailableBackendClient);
    expect(services.coach).toBeInstanceOf(UnavailableCoachGateway);
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

  it('routes Coach requests through the configured SHIFT6 API with the app access token', async () => {
    let requestedUrl = '';
    let authorization = '';
    const services = createAppServices({
      auth: {
        ...auth,
        getAccessToken: async () => 'shift6-access-token',
      },
      apiBaseUrl: 'https://api.example.test',
      fetcher: async (input, init) => {
        requestedUrl = String(input);
        authorization = new Headers(init?.headers).get('Authorization') ?? '';
        return new Response(
          JSON.stringify({
            kind: 'message',
            text: 'Keep the next session repeatable.',
            factsUsed: ['current cycle week'],
          }),
          { status: 200 },
        );
      },
    });

    expect(services.coach).toBeInstanceOf(HttpCoachGateway);
    await services.coach.generateMessage(
      {
        user: {
          id: 'guest-user',
          unitSystem: 'imperial',
          goals: ['strength'],
          experience: 'beginner',
        },
        cycle: {
          id: 'cycle-1',
          programVersionId: 'version-1',
          currentWeek: 2,
          status: 'active',
        },
        structuredFacts: { currentWeek: 2 },
      },
      'weekly-review',
    );

    expect(requestedUrl).toBe('https://api.example.test/v1/coach/message');
    expect(authorization).toBe('Bearer shift6-access-token');
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

  it('keeps crash reporting inert by default and preserves an injected reporter', () => {
    const defaultServices = createAppServices({ auth });
    const received: string[] = [];
    const errors: ErrorReporter = {
      captureException: (_error, context) => received.push(String(context?.surface ?? 'unknown')),
      captureMessage: (message) => received.push(message),
    };

    const configuredServices = createAppServices({ auth, errors });

    expect(defaultServices.errors).toBeDefined();
    expect(() => defaultServices.errors.captureException(new Error('test'))).not.toThrow();
    expect(configuredServices.errors).toBe(errors);
    configuredServices.errors.captureException(new Error('boom'), { surface: 'root-render' });
    configuredServices.errors.captureMessage('manual-signal');
    expect(received).toEqual(['root-render', 'manual-signal']);
  });
});
