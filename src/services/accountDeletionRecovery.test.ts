import {
  SecureAccountDeletionRecoveryStore,
  parseAccountDeletionRecovery,
  type RecoveryKeyValueStore,
} from './accountDeletionRecovery';

function keyValueStore(): RecoveryKeyValueStore & { value: string | null } {
  const store: RecoveryKeyValueStore & { value: string | null } = {
    value: null,
    getItemAsync: async () => store.value,
    setItemAsync: async (_key, value) => {
      store.value = value;
    },
    deleteItemAsync: async () => {
      store.value = null;
    },
  };
  return store;
}

describe('account deletion recovery store', () => {
  it('persists, reloads, and clears a user-scoped cleanup marker', async () => {
    const storage = keyValueStore();
    const store = new SecureAccountDeletionRecoveryStore(storage);

    await store.set({
      userId: ' account-user ',
      stage: 'local-data',
      remoteDeletedAt: '2026-09-16T11:00:00.000Z',
    });

    await expect(store.get('account-user')).resolves.toEqual({
      userId: 'account-user',
      stage: 'local-data',
      remoteDeletedAt: '2026-09-16T11:00:00.000Z',
    });
    await expect(store.get('different-user')).resolves.toBeNull();

    await store.clear('account-user');
    await expect(store.get('account-user')).resolves.toBeNull();
  });

  it('fails closed on malformed recovery payloads', () => {
    expect(parseAccountDeletionRecovery('{bad-json')).toBeNull();
    expect(
      parseAccountDeletionRecovery(
        JSON.stringify({
          userId: 'account-user',
          stage: 'unknown',
          remoteDeletedAt: '2026-09-16T11:00:00.000Z',
        }),
      ),
    ).toBeNull();
    expect(
      parseAccountDeletionRecovery(
        JSON.stringify({
          userId: 'account-user',
          stage: 'sign-out',
          remoteDeletedAt: 'not-a-date',
        }),
      ),
    ).toBeNull();
  });
});
