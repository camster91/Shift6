import { authStatus } from './auth';
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
});
