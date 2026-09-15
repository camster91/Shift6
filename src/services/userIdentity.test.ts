import type { SQLiteDatabase } from 'expo-sqlite';

import type { AuthSession } from './contracts';
import { resolveLocalUserIdentity } from './userIdentity';

function emptyDatabase() {
  return {
    getFirstAsync: async () => null,
    getAllAsync: async () => [],
    withTransactionAsync: async (callback: () => Promise<void>) => callback(),
  } as unknown as SQLiteDatabase;
}

describe('resolveLocalUserIdentity', () => {
  it('keeps the local guest owner when no account session exists', async () => {
    await expect(resolveLocalUserIdentity(emptyDatabase(), null)).resolves.toEqual({
      userId: 'guest-user',
      kind: 'guest',
    });
  });

  it('adopts the guest owner before returning an authenticated identity', async () => {
    const session: AuthSession = {
      userId: 'account-1',
      provider: 'apple',
      accessToken: 'test-token',
    };

    await expect(resolveLocalUserIdentity(emptyDatabase(), session)).resolves.toEqual({
      userId: 'account-1',
      kind: 'account',
    });
  });

  it('fails closed when account adoption would merge existing local data', async () => {
    const database = {
      getFirstAsync: async () => ({ conflict: 1 }),
      withTransactionAsync: async (callback: () => Promise<void>) => callback(),
    } as unknown as SQLiteDatabase;
    const session: AuthSession = {
      userId: 'account-1',
      provider: 'email',
      accessToken: 'test-token',
    };

    await expect(resolveLocalUserIdentity(database, session)).rejects.toThrow(
      'explicit merge is required',
    );
  });
});
