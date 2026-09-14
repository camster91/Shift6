import type { SyncMutation } from './contracts';
import {
  BackendProtocolError,
  BackendUnavailableError,
  HttpBackendClient,
  UnavailableBackendClient,
  parseSyncResult,
} from './backend';

const mutation: SyncMutation = {
  id: 'outbox-1',
  idempotencyKey: 'set:1',
  entityType: 'completed-set',
  entityId: 'set-1',
  payload: { id: 'set-1' },
  createdAt: '2026-09-14T12:00:00.000Z',
};

describe('backend boundary', () => {
  it('keeps the no-backend state explicit', async () => {
    const client = new UnavailableBackendClient();

    await expect(client.sync([mutation])).rejects.toBeInstanceOf(BackendUnavailableError);
  });

  it('injects auth and sends only through the typed sync endpoint', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new HttpBackendClient({
      baseUrl: 'https://api.example.test/',
      getAccessToken: async () => 'token-for-test',
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(
          JSON.stringify({
            acknowledgedMutationIds: ['outbox-1', 'outbox-1'],
            rejectedMutationIds: [],
            serverVersion: 3,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });

    await expect(client.sync([mutation])).resolves.toEqual({
      acknowledgedMutationIds: ['outbox-1'],
      rejectedMutationIds: [],
      serverVersion: 3,
    });
    expect(requests[0]?.url).toBe('https://api.example.test/v1/sync');
    expect(requests[0]?.init?.method).toBe('POST');
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: 'Bearer token-for-test',
    });
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({ mutations: [mutation] });
  });

  it('does not make a network request without an access token', async () => {
    let requestCount = 0;
    const client = new HttpBackendClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => null,
      fetcher: async () => {
        requestCount += 1;
        return new Response(null, { status: 200 });
      },
    });

    await expect(client.sync([mutation])).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(requestCount).toBe(0);
  });

  it('rejects malformed backend responses before they reach the outbox', () => {
    expect(() => parseSyncResult({ acknowledgedMutationIds: ['outbox-1'] })).toThrow(
      BackendProtocolError,
    );
    expect(() =>
      parseSyncResult({ acknowledgedMutationIds: [], rejectedMutationIds: [2] }),
    ).toThrow(BackendProtocolError);
  });
});
