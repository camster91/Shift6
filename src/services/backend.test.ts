import type { SyncMutation } from './contracts';
import {
  BackendProtocolError,
  BackendUnavailableError,
  HttpBackendClient,
  UnavailableBackendClient,
  parseAccountDeletionResult,
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

const secondMutation: SyncMutation = {
  ...mutation,
  id: 'outbox-2',
  idempotencyKey: 'set:2',
  entityId: 'set-2',
  payload: { id: 'set-2' },
};

function httpClient(responseBody: unknown, status = 200): HttpBackendClient {
  return new HttpBackendClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: async () => 'token-for-test',
    fetcher: async () =>
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  });
}

describe('backend boundary', () => {
  it('keeps the no-backend state explicit', async () => {
    const client = new UnavailableBackendClient();

    await expect(client.sync([mutation])).rejects.toBeInstanceOf(BackendUnavailableError);
    await expect(client.deleteAccount()).rejects.toBeInstanceOf(BackendUnavailableError);
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

  it('allows a partial sync result so unresolved mutations remain retryable in the outbox', async () => {
    const client = httpClient({
      acknowledgedMutationIds: ['outbox-1'],
      rejectedMutationIds: [],
      serverVersion: 4,
    });

    await expect(client.sync([mutation, secondMutation])).resolves.toEqual({
      acknowledgedMutationIds: ['outbox-1'],
      rejectedMutationIds: [],
      serverVersion: 4,
    });
  });

  it('rejects unknown mutation IDs returned by the sync server', async () => {
    const acknowledged = httpClient({
      acknowledgedMutationIds: ['unknown-id'],
      rejectedMutationIds: [],
    });
    const rejected = httpClient({
      acknowledgedMutationIds: [],
      rejectedMutationIds: ['unknown-id'],
    });
    const conflicted = httpClient({
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      conflicts: [{ mutationId: 'unknown-id', code: 'version-conflict' }],
    });

    await expect(acknowledged.sync([mutation])).rejects.toBeInstanceOf(BackendProtocolError);
    await expect(rejected.sync([mutation])).rejects.toBeInstanceOf(BackendProtocolError);
    await expect(conflicted.sync([mutation])).rejects.toBeInstanceOf(BackendProtocolError);
  });

  it('rejects contradictory statuses for the same sent mutation', async () => {
    const acknowledgedAndRejected = httpClient({
      acknowledgedMutationIds: ['outbox-1'],
      rejectedMutationIds: ['outbox-1'],
    });
    const acknowledgedAndConflicted = httpClient({
      acknowledgedMutationIds: ['outbox-1'],
      rejectedMutationIds: [],
      conflicts: [{ mutationId: 'outbox-1', code: 'version-conflict' }],
    });

    await expect(acknowledgedAndRejected.sync([mutation])).rejects.toBeInstanceOf(
      BackendProtocolError,
    );
    await expect(acknowledgedAndConflicted.sync([mutation])).rejects.toBeInstanceOf(
      BackendProtocolError,
    );
  });

  it('rejects duplicate conflict statuses for one mutation', async () => {
    const client = httpClient({
      acknowledgedMutationIds: [],
      rejectedMutationIds: [],
      conflicts: [
        { mutationId: 'outbox-1', code: 'version-conflict' },
        { mutationId: 'outbox-1', code: 'validation-conflict' },
      ],
    });

    await expect(client.sync([mutation])).rejects.toBeInstanceOf(BackendProtocolError);
  });

  it('rejects duplicate outbound mutation IDs or idempotency keys before the network call', async () => {
    let requestCount = 0;
    const client = new HttpBackendClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'token-for-test',
      fetcher: async () => {
        requestCount += 1;
        return new Response(
          JSON.stringify({ acknowledgedMutationIds: [], rejectedMutationIds: [] }),
          { status: 200 },
        );
      },
    });

    await expect(
      client.sync([mutation, { ...secondMutation, id: mutation.id }]),
    ).rejects.toBeInstanceOf(BackendProtocolError);
    await expect(
      client.sync([mutation, { ...secondMutation, idempotencyKey: mutation.idempotencyKey }]),
    ).rejects.toBeInstanceOf(BackendProtocolError);
    expect(requestCount).toBe(0);
  });

  it('wraps invalid sync JSON as a protocol error', async () => {
    const client = new HttpBackendClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'token-for-test',
      fetcher: async () =>
        new Response('{not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });

    await expect(client.sync([mutation])).rejects.toBeInstanceOf(BackendProtocolError);
  });

  it('requires authenticated remote confirmation before account deletion succeeds', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = new HttpBackendClient({
      baseUrl: 'https://api.example.test/',
      getAccessToken: async () => 'token-for-delete',
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(JSON.stringify({ deleted: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    await expect(client.deleteAccount()).resolves.toEqual({ deleted: true });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe('https://api.example.test/v1/account');
    expect(requests[0]?.init?.method).toBe('DELETE');
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: 'Bearer token-for-delete',
    });
    expect(requests[0]?.init?.body).toBeUndefined();
  });

  it('accepts an authenticated no-content deletion response', async () => {
    const client = new HttpBackendClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'token-for-delete',
      fetcher: async () => new Response(null, { status: 204 }),
    });

    await expect(client.deleteAccount()).resolves.toEqual({ deleted: true });
  });

  it('fails closed when remote account deletion is not confirmed', async () => {
    const malformed = new HttpBackendClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'token-for-delete',
      fetcher: async () =>
        new Response(JSON.stringify({ deleted: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    const rejected = new HttpBackendClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: async () => 'token-for-delete',
      fetcher: async () => new Response(null, { status: 409 }),
    });

    await expect(malformed.deleteAccount()).rejects.toBeInstanceOf(BackendProtocolError);
    await expect(rejected.deleteAccount()).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(() => parseAccountDeletionResult({ deleted: false })).toThrow(BackendProtocolError);
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
    await expect(client.deleteAccount()).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(requestCount).toBe(0);
  });

  it('rejects malformed backend responses before they reach the outbox', () => {
    expect(() => parseSyncResult({ acknowledgedMutationIds: ['outbox-1'] })).toThrow(
      BackendProtocolError,
    );
    expect(() =>
      parseSyncResult({ acknowledgedMutationIds: [], rejectedMutationIds: [2] }),
    ).toThrow(BackendProtocolError);
    expect(() =>
      parseSyncResult({
        acknowledgedMutationIds: [],
        rejectedMutationIds: [],
        conflicts: [{ mutationId: 'outbox-1', code: 'unknown-conflict' }],
      }),
    ).toThrow(BackendProtocolError);
    expect(() =>
      parseSyncResult({ acknowledgedMutationIds: [''], rejectedMutationIds: [] }),
    ).toThrow(BackendProtocolError);
    expect(() =>
      parseSyncResult({
        acknowledgedMutationIds: [],
        rejectedMutationIds: [],
        conflicts: [{ mutationId: '', code: 'version-conflict' }],
      }),
    ).toThrow(BackendProtocolError);
    expect(() =>
      parseSyncResult({
        acknowledgedMutationIds: [],
        rejectedMutationIds: [],
        serverVersion: -1,
      }),
    ).toThrow(BackendProtocolError);
    expect(() =>
      parseSyncResult({
        acknowledgedMutationIds: [],
        rejectedMutationIds: [],
        serverVersion: 1.5,
      }),
    ).toThrow(BackendProtocolError);
  });
});
