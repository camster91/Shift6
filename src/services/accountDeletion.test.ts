import type { SQLiteDatabase } from 'expo-sqlite';

import type { AuthProvider, BackendClient } from './contracts';
import { deleteAuthenticatedAccount } from './accountDeletion';

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

describe('account deletion orchestration', () => {
  it('does not touch local data or auth when remote deletion is not confirmed', async () => {
    const deleteLocalData = jest.fn(async () => undefined);
    const signOut = jest.fn(async () => undefined);

    await expect(
      deleteAuthenticatedAccount({
        database,
        userId: 'account-user',
        backend: backend(async () => Promise.reject(new Error('remote unavailable'))),
        auth: auth(signOut),
        deleteLocalData,
      }),
    ).rejects.toThrow('remote unavailable');

    expect(deleteLocalData).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('clears local data and signs out after remote deletion succeeds', async () => {
    const order: string[] = [];
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
      }),
    ).resolves.toEqual({
      remoteDeleted: true,
      localDataDeleted: true,
      signedOut: true,
      warnings: [],
    });

    expect(order).toEqual(['remote-delete', 'local-delete', 'sign-out']);
    expect(deleteLocalData).toHaveBeenCalledWith(database, 'account-user');
  });

  it('keeps auth mounted for a local cleanup retry after remote deletion succeeds', async () => {
    const signOut = jest.fn(async () => undefined);

    const outcome = await deleteAuthenticatedAccount({
      database,
      userId: 'account-user',
      backend: backend(async () => ({ deleted: true })),
      auth: auth(signOut),
      deleteLocalData: async () => Promise.reject(new Error('local delete failed')),
    });

    expect(outcome).toMatchObject({
      remoteDeleted: true,
      localDataDeleted: false,
      signedOut: false,
    });
    expect(outcome.warnings).toHaveLength(1);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('reports a sign-out warning after remote and local deletion succeed', async () => {
    const outcome = await deleteAuthenticatedAccount({
      database,
      userId: 'account-user',
      backend: backend(async () => ({ deleted: true })),
      auth: auth(async () => Promise.reject(new Error('sign-out failed'))),
      deleteLocalData: async () => undefined,
    });

    expect(outcome).toMatchObject({
      remoteDeleted: true,
      localDataDeleted: true,
      signedOut: false,
    });
    expect(outcome.warnings).toHaveLength(1);
  });
});
