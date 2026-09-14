import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthProvider, AuthProviderKind, AuthSession } from './contracts';

const authSessionKey = 'shift6.auth.session';

export interface AuthSessionStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

const expoSecureSessionStore: AuthSessionStore = {
  getItemAsync: (key) =>
    Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => {
    if (Platform.OS === 'web') {
      return Promise.reject(new Error('Secure session storage is unavailable in web preview.'));
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: (key) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key),
};

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

/**
 * Stores only the auth session envelope in the OS secure store. An auth
 * adapter may call setSession after completing its provider-specific flow;
 * domain and sync code never receive the storage implementation.
 */
export class SecureAuthProvider implements AuthProvider {
  constructor(private readonly store: AuthSessionStore = expoSecureSessionStore) {}

  async getSession(): Promise<AuthSession | null> {
    const serialized = await this.store.getItemAsync(authSessionKey);
    if (!serialized) return null;

    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch {
      await this.store.deleteItemAsync(authSessionKey);
      return null;
    }

    if (!isAuthSession(value) || isExpired(value)) {
      await this.store.deleteItemAsync(authSessionKey);
      return null;
    }

    return value;
  }

  async getAccessToken(): Promise<string | null> {
    return (await this.getSession())?.accessToken ?? null;
  }

  async signOut(): Promise<void> {
    await this.store.deleteItemAsync(authSessionKey);
  }

  async setSession(session: AuthSession): Promise<void> {
    if (!isAuthSession(session) || isExpired(session)) {
      throw new Error('Cannot store an invalid or expired auth session.');
    }
    await this.store.setItemAsync(authSessionKey, JSON.stringify(session));
  }
}

export function createExpoSecureAuthProvider(): SecureAuthProvider {
  return new SecureAuthProvider();
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === 'string' &&
    candidate.userId.trim().length > 0 &&
    isAuthProviderKind(candidate.provider) &&
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.trim().length > 0 &&
    (candidate.expiresAt === undefined ||
      (typeof candidate.expiresAt === 'string' && Number.isFinite(Date.parse(candidate.expiresAt))))
  );
}

function isAuthProviderKind(value: unknown): value is AuthProviderKind {
  return value === 'apple' || value === 'google' || value === 'email';
}

function isExpired(session: AuthSession): boolean {
  return session.expiresAt !== undefined && Date.parse(session.expiresAt) <= Date.now();
}

export function authStatus(session: AuthSession | null): 'signed-in' | 'signed-out' {
  return session ? 'signed-in' : 'signed-out';
}
