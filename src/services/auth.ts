import type { AuthProvider, AuthSession } from './contracts';

/** Explicit guest/unconfigured state used until an account provider is selected. */
export class UnavailableAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession | null> {
    return null;
  }

  async getAccessToken(): Promise<string | null> {
    return null;
  }

  async signOut(): Promise<void> {
    // There is no local account session to revoke in the unconfigured state.
  }
}

export function authStatus(session: AuthSession | null): 'signed-in' | 'signed-out' {
  return session ? 'signed-in' : 'signed-out';
}
