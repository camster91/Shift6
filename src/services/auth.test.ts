import { authStatus, SecureAuthProvider } from './auth';
import type { AuthSession } from './contracts';
import { UnavailableAuthProvider } from './auth';

describe('auth boundary', () => {
  it('keeps an unconfigured guest state explicit', async () => {
    const provider = new UnavailableAuthProvider();

    await expect(provider.getSession()).resolves.toBeNull();
    await expect(provider.getAccessToken()).resolves.toBeNull();
    await expect(provider.signOut()).resolves.toBeUndefined();
    expect(authStatus(null)).toBe('signed-out');
  });

  it('does not expose a token through the status helper', () => {
    const session: AuthSession = {
      userId: 'user-1',
      provider: 'email',
      accessToken: 'test-token',
    };

    expect(authStatus(session)).toBe('signed-in');
  });

  it('round-trips a valid session through the injected secure store', async () => {
    const values = new Map<string, string>();
    const store = {
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        values.delete(key);
      },
    };
    const provider = new SecureAuthProvider(store);
    const session: AuthSession = {
      userId: 'user-1',
      provider: 'apple',
      accessToken: 'test-token',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };

    await provider.setSession(session);

    await expect(provider.getSession()).resolves.toEqual(session);
    await expect(provider.getAccessToken()).resolves.toBe('test-token');
  });

  it('removes malformed and expired sessions instead of exposing them', async () => {
    const values = new Map<string, string>([['shift6.auth.session', '{not-json']]);
    const store = {
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        values.delete(key);
      },
    };
    const provider = new SecureAuthProvider(store);

    await expect(provider.getSession()).resolves.toBeNull();
    expect(values.has('shift6.auth.session')).toBe(false);

    values.set(
      'shift6.auth.session',
      JSON.stringify({
        userId: 'user-1',
        provider: 'email',
        accessToken: 'expired-token',
        expiresAt: '2000-01-01T00:00:00.000Z',
      }),
    );
    await expect(provider.getSession()).resolves.toBeNull();
    await expect(provider.getAccessToken()).resolves.toBeNull();
  });

  it('rejects empty tokens and supports explicit sign out', async () => {
    const values = new Map<string, string>();
    const store = {
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value);
      },
      deleteItemAsync: async (key: string) => {
        values.delete(key);
      },
    };
    const provider = new SecureAuthProvider(store);

    await expect(
      provider.setSession({ userId: 'user-1', provider: 'email', accessToken: ' ' }),
    ).rejects.toThrow('invalid or expired');
    await provider.setSession({ userId: 'user-1', provider: 'email', accessToken: 'token' });
    await provider.signOut();
    await expect(provider.getSession()).resolves.toBeNull();
  });
});
