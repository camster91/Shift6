import type {
  AccountDeletionResult,
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

  async deleteAccount(): Promise<AccountDeletionResult> {
    throw new BackendUnavailableError('Remote account deletion is not configured.');
  }
}

export interface HttpBackendClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
}

/**
 * Vendor-neutral backend transport. Authentication is injected, never read
 * from the app bundle, and the mobile app can replace this adapter without
 * changing repositories or domain logic.
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
    const sentMutationIds = validateSyncMutationBatch(mutations);
    const accessToken = await this.requireAccessToken('Sign in to enable cloud sync.');

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

    let parsed: SyncResult;
    try {
      parsed = parseSyncResult(await response.json());
    } catch (error) {
      if (error instanceof BackendProtocolError) throw error;
      throw new BackendProtocolError('The sync service returned invalid JSON.');
    }

    validateSyncResultForBatch(parsed, sentMutationIds);
    return parsed;
  }

  async deleteAccount(): Promise<AccountDeletionResult> {
    const accessToken = await this.requireAccessToken(
      'Sign in again before deleting the remote account.',
    );

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/v1/account`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The account deletion request failed.';
      throw new BackendUnavailableError(message);
    }

    if (!response.ok) {
      throw new BackendUnavailableError(
        `The account deletion service returned HTTP ${response.status}.`,
      );
    }

    if (response.status === 204) return { deleted: true };

    try {
      return parseAccountDeletionResult(await response.json());
    } catch (error) {
      if (error instanceof BackendProtocolError) throw error;
      throw new BackendProtocolError('The account deletion service returned invalid JSON.');
    }
  }

  private async requireAccessToken(message: string): Promise<string> {
    if (!this.baseUrl) throw new BackendUnavailableError();

    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new BackendUnavailableError(message);
    return accessToken;
  }
}

export function parseAccountDeletionResult(value: unknown): AccountDeletionResult {
  if (!isRecord(value) || value.deleted !== true) {
    throw new BackendProtocolError('The account deletion service did not confirm deletion.');
  }
  return { deleted: true };
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

  const serverVersion = optionalServerVersion(value.serverVersion);
  if (serverVersion === null) {
    throw new BackendProtocolError('The sync response contained an invalid server version.');
  }

  return {
    acknowledgedMutationIds: unique(acknowledgedMutationIds),
    rejectedMutationIds: unique(rejectedMutationIds),
    ...(conflicts.length > 0 ? { conflicts } : {}),
    ...(serverVersion === undefined ? {} : { serverVersion }),
  };
}

function validateSyncMutationBatch(mutations: readonly SyncMutation[]): Set<string> {
  const mutationIds = new Set<string>();
  const idempotencyKeys = new Set<string>();

  mutations.forEach((mutation, index) => {
    const id = mutation.id.trim();
    const idempotencyKey = mutation.idempotencyKey.trim();
    if (!id) {
      throw new BackendProtocolError(`Sync mutation ${index + 1} is missing an ID.`);
    }
    if (!idempotencyKey) {
      throw new BackendProtocolError(`Sync mutation ${index + 1} is missing an idempotency key.`);
    }
    if (mutationIds.has(id)) {
      throw new BackendProtocolError(`Sync mutation ID ${id} appears more than once in the batch.`);
    }
    if (idempotencyKeys.has(idempotencyKey)) {
      throw new BackendProtocolError(
        `Sync idempotency key ${idempotencyKey} appears more than once in the batch.`,
      );
    }
    mutationIds.add(id);
    idempotencyKeys.add(idempotencyKey);
  });

  return mutationIds;
}

function validateSyncResultForBatch(result: SyncResult, sentMutationIds: ReadonlySet<string>): void {
  const statuses = new Map<string, 'acknowledged' | 'rejected' | 'conflict'>();

  const recordStatus = (mutationId: string, status: 'acknowledged' | 'rejected' | 'conflict') => {
    if (!sentMutationIds.has(mutationId)) {
      throw new BackendProtocolError(
        `The sync service returned ${status} status for unknown mutation ${mutationId}.`,
      );
    }
    const existing = statuses.get(mutationId);
    if (existing && existing !== status) {
      throw new BackendProtocolError(
        `The sync service returned contradictory statuses for mutation ${mutationId}: ${existing} and ${status}.`,
      );
    }
    if (existing === status && status === 'conflict') {
      throw new BackendProtocolError(
        `The sync service returned duplicate conflict statuses for mutation ${mutationId}.`,
      );
    }
    statuses.set(mutationId, status);
  };

  result.acknowledgedMutationIds.forEach((mutationId) => recordStatus(mutationId, 'acknowledged'));
  result.rejectedMutationIds.forEach((mutationId) => recordStatus(mutationId, 'rejected'));
  result.conflicts?.forEach((conflict) => recordStatus(conflict.mutationId, 'conflict'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) return null;
    values.push(item.trim());
  }
  return values;
}

function syncConflicts(value: unknown): SyncConflict[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const conflicts: SyncConflict[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.mutationId !== 'string' ||
      !item.mutationId.trim() ||
      !isConflictCode(item.code)
    ) {
      return null;
    }
    conflicts.push({ mutationId: item.mutationId.trim(), code: item.code });
  }
  return conflicts;
}

function optionalServerVersion(value: unknown): number | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
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
