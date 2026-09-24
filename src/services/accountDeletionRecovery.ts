import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AccountDeletionRecoveryStage = 'local-data' | 'sign-out';

export interface AccountDeletionRecovery {
  userId: string;
  stage: AccountDeletionRecoveryStage;
  remoteDeletedAt: string;
}

export interface AccountDeletionRecoveryStore {
  get(userId: string): Promise<AccountDeletionRecovery | null>;
  set(recovery: AccountDeletionRecovery): Promise<void>;
  clear(userId: string): Promise<void>;
}

export interface RecoveryKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const recoveryKey = 'shift6.account.deletion.recovery';

const expoRecoveryKeyValueStore: RecoveryKeyValueStore = {
  getItemAsync: (key) =>
    Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => {
    if (Platform.OS === 'web') return Promise.resolve();
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: (key) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key),
};

export class SecureAccountDeletionRecoveryStore implements AccountDeletionRecoveryStore {
  constructor(private readonly store: RecoveryKeyValueStore = expoRecoveryKeyValueStore) {}

  async get(userId: string): Promise<AccountDeletionRecovery | null> {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) return null;

    const serialized = await this.store.getItemAsync(recoveryKey);
    if (!serialized) return null;

    const recovery = parseAccountDeletionRecovery(serialized);
    if (!recovery || recovery.userId !== normalizedUserId) return null;
    return recovery;
  }

  async set(recovery: AccountDeletionRecovery): Promise<void> {
    const normalized = normalizeRecovery(recovery);
    await this.store.setItemAsync(recoveryKey, JSON.stringify(normalized));
  }

  async clear(userId: string): Promise<void> {
    const existing = await this.get(userId);
    if (!existing) return;
    await this.store.deleteItemAsync(recoveryKey);
  }
}

export const accountDeletionRecoveryStore = new SecureAccountDeletionRecoveryStore();

export function parseAccountDeletionRecovery(serialized: string): AccountDeletionRecovery | null {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.userId !== 'string' ||
    !candidate.userId.trim() ||
    (candidate.stage !== 'local-data' && candidate.stage !== 'sign-out') ||
    typeof candidate.remoteDeletedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.remoteDeletedAt))
  ) {
    return null;
  }

  return normalizeRecovery({
    userId: candidate.userId,
    stage: candidate.stage,
    remoteDeletedAt: candidate.remoteDeletedAt,
  });
}

function normalizeRecovery(recovery: AccountDeletionRecovery): AccountDeletionRecovery {
  const userId = recovery.userId.trim();
  if (!userId) throw new Error('A user ID is required for account deletion recovery.');
  const timestamp = Date.parse(recovery.remoteDeletedAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error('A valid remote deletion timestamp is required.');
  }
  return {
    userId,
    stage: recovery.stage,
    remoteDeletedAt: new Date(timestamp).toISOString(),
  };
}
