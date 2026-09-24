import type { SQLiteDatabase } from 'expo-sqlite';

import type { AccountDeletionRecoveryStore } from './accountDeletionRecovery';
import { deleteAuthenticatedAccount } from './accountDeletion';
import type { AuthProvider, BackendClient } from './contracts';

const database = {} as SQLiteDatabase;

function backend(deleteAccount: BackendClient['deleteAccount']): BackendClient {
  return {
    sync: async () => ({ acknowledgedMutationIds: [], rejectedMutationIds: [] }),
    deleteAccount,
  };
}

function auth(signOut: AuthProvider['signOut']): AuthProvider {
  return {
    getSession: async () => null,
    getAccessToken: async () => null,
    signOut,
  };
}

function recoveryStore() {
  let value: Awaited<ReturnType<AccountDeletionRecoveryStore['get']>> = null;
  const calls: string[] = [];
  const store: AccountDeletionRecoveryStore = {
    get: async (userId) => (value?.userId === userId ? value : null),
    set: async (recovery) => {
      calls.push(`set:${recovery.stage}`);
      value = recovery;
    },
    clear: async (userId) => {
      calls.push('clear');
      if (value?.userId === userId) value = null;
    },
  };
  return { store, calls, current: () => value };
}

describe('account deletion orchestration', () => {
  it('does not request irreversible remote deletion while future Shift child sync records remain', async () => {
    const deleteAccount = jest.fn(async () => ({ deleted: true as const }));
    const signOut = jest.fn(async () => undefined);
    const databaseWithUnknownShift = {
      getFirstAsync: async () => ({ id: 'future-child' }),
    } as unknown as SQLiteDatabase;

    await expect(
      deleteAuthenticatedAccount({
        database: databaseWithUnknownShift,
        userId: 'account-user',
        backend: backend(deleteAccount),
        auth: auth(signOut),
      }),
    ).rejects.toThrow('Shift sync records require a compatible build');
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('does not touch local data, auth, or recovery when remote deletion is not confirmed', async () => {
    const deleteLocalData = jest.fn(async () => undefined);
    const signOut = jest.fn(async () => undefined);
    const recovery = recoveryStore();

    await expect(
      deleteAuthenticatedAccount({
        database,
        userId: 'account-user',
        backend: backend(async () => Promise.reject(new Error('remote unavailable'))),
        auth: auth(signOut),
        deleteLocalData,
        recoveryStore: recovery.store,
      }),
    ).rejects.toThrow('remote unavailable');

    expect(deleteLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(recovery.calls).toEqual([]);
  });

  it('records cleanup stages, clears local data, signs out, then removes recovery', async () => {
    const order: string[] = [];
    const recovery = recoveryStore();
    const deleteLocalData = jest.fn(async () => {
      order.push('local-delete');
    });
    const signOut = jest.fn(async () => {
      order.push('sign-out');
    });

    await expect(
      deleteAuthenticatedAccount({
        database,
        userId: ' account-user ',
        backend: backend(async () => {
          order.push('remote-delete');
          return { deleted: true };
        }),
        auth: auth(signOut),
        deleteLocalData,
        recoveryStore: recovery.store,
        now: () => '2026-09-16T11:00:00.000Z',
      }),
    ).resolves.toEqual({
      remoteDeleted: true,
      localDataDeleted: true,
      signedOut: true,
      warnings: [],
    });

    expect(order).toEqual(['remote-delete', 'local-delete', 'sign-out']);
    expect(recovery.calls).toEqual(['set:local-data', 'set:sign-out', 'clear']);
    expect(recovery.current()).toBeNull();
    expect(deleteLocalData).toHaveBeenCalledWith(database, 'account-user');
  });

  it('keeps a durable local-cleanup marker when local deletion fails', async () => {
    const signOut = jest.fn(async () => undefined);
    const recovery = recoveryStore();

    const outcome = await deleteAuthenticatedAccount({
      database,
      userId: 'account-user',
      backend: backend(async () => ({ deleted: true })),
      auth: auth(signOut),
      deleteLocalData: async () => Promise.reject(new Error('local delete failed')),
      recoveryStore: recovery.store,
      now: () => '2026-09-16T11:00:00.000Z',
    });

    expect(outcome).toMatchObject({
      remoteDeleted: true,
      localDataDeleted: false,
      signedOut: false,
    });
    expect(recovery.current()).toEqual({
      userId: 'account-user',
      stage: 'local-data',
      remoteDeletedAt: '2026-09-16T11:00:00.000Z',
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('keeps a sign-out recovery marker when local deletion succeeds but sign-out fails', async () => {
    const recovery = recoveryStore();
    const outcome = await deleteAuthenticatedAccount({
      database,
      userId: 'account-user',
      backend: backend(async () => ({ deleted: true })),
      auth: auth(async () => Promise.reject(new Error('sign-out failed'))),
      deleteLocalData: async () => undefined,
      recoveryStore: recovery.store,
      now: () => '2026-09-16T11:00:00.000Z',
    });

    expect(outcome).toMatchObject({
      remoteDeleted: true,
      localDataDeleted: true,
      signedOut: false,
    });
    expect(recovery.current()?.stage).toBe('sign-out');
    expect(outcome.warnings).toHaveLength(1);
  });
});
