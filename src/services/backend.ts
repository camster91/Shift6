import type {
  BackendClient,
  SyncConflict,
  SyncConflictCode,
  SyncMutation,
  SyncResult,
} from './contracts';

export type BackendAvailability = 'unconfigured' | 'adapter-pending' | 'available';

export class BackendUnavailableError extends Error {
  readonly code = 'backend-unavailable';

  constructor(message = 'SHIFT6 sync is not configured on this device.') {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export class BackendProtocolError extends Error {
  readonly code = 'backend-protocol-error';

  constructor(message: string) {
    super(message);
    this.name = 'BackendProtocolError';
  }
}

/** Explicit no-cloud adapter used until auth and a concrete backend are wired. */
export class UnavailableBackendClient implements BackendClient {
  constructor(private readonly message = 'Cloud sync will be available after account setup.') {}

  async sync(_mutations: readonly SyncMutation[]): Promise<SyncResult> {
    throw new BackendUnavailableError(this.message);
  }
}

export interface HttpBackendClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}

/**
 * Vendor-neutral sync transport. Authentication is injected, never read from
 * the app bundle, and the mobile app can replace this adapter without changing
 * repositories or domain logic.
 */
export class HttpBackendClient implements BackendClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => Promise<string | null>;
  private readonly fetcher: typeof fetch;

  constructor({ baseUrl, getAccessToken, fetcher = fetch }: HttpBackendClientOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.getAccessToken = getAccessToken;
    this.fetcher = fetcher;
  }

  async sync(mutations: readonly SyncMutation[]): Promise<SyncResult> {
    if (!this.baseUrl) {
      throw new BackendUnavailableError();
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new BackendUnavailableError('Sign in to enable cloud sync.');
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/v1/sync`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mutations }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The sync request failed.';
      throw new BackendUnavailableError(message);
    }

    if (!response.ok) {
      throw new BackendUnavailableError(`The sync service returned HTTP ${response.status}.`);
    }

    return parseSyncResult(await response.json());
  }
}

export function parseSyncResult(value: unknown): SyncResult {
  if (!isRecord(value)) {
    throw new BackendProtocolError('The sync service returned an invalid response.');
  }

  const acknowledgedMutationIds = stringArray(value.acknowledgedMutationIds);
  const rejectedMutationIds = stringArray(value.rejectedMutationIds);
  if (!acknowledgedMutationIds || !rejectedMutationIds) {
    throw new BackendProtocolError('The sync response did not contain mutation results.');
  }

  const conflicts = syncConflicts(value.conflicts);
  if (conflicts === null) {
    throw new BackendProtocolError('The sync response contained invalid conflict details.');
  }

  const serverVersion = typeof value.serverVersion === 'number' ? value.serverVersion : undefined;
  return {
    acknowledgedMutationIds: unique(acknowledgedMutationIds),
    rejectedMutationIds: unique(rejectedMutationIds),
    ...(conflicts.length > 0 ? { conflicts } : {}),
    ...(serverVersion === undefined ? {} : { serverVersion }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function syncConflicts(value: unknown): SyncConflict[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const conflicts: SyncConflict[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.mutationId !== 'string' || !isConflictCode(item.code)) {
      return null;
    }
    conflicts.push({ mutationId: item.mutationId, code: item.code });
  }
  return conflicts;
}

function isConflictCode(value: unknown): value is SyncConflictCode {
  return (
    value === 'version-conflict' ||
    value === 'ownership-conflict' ||
    value === 'validation-conflict'
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
