import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateLocalUserToAccount } from '../db/accountRepository';
import { LOCAL_GUEST_USER_ID } from '../domain/userIdentity';
import type { AuthSession } from './contracts';

export interface ResolvedUserIdentity {
  userId: string;
  kind: 'guest' | 'account';
}

/**
 * Resolves the local owner after authentication, adopting guest-owned rows in
 * one guarded transaction before account-scoped screens are allowed to mount.
 * The migration refuses implicit merges, so an account with existing local
 * data fails closed instead of presenting a partial history.
 */
export async function resolveLocalUserIdentity(
  database: SQLiteDatabase,
  session: AuthSession | null,
): Promise<ResolvedUserIdentity> {
  if (!session || session.userId === LOCAL_GUEST_USER_ID) {
    return { userId: LOCAL_GUEST_USER_ID, kind: 'guest' };
  }

  await migrateLocalUserToAccount(database, LOCAL_GUEST_USER_ID, session.userId);
  return { userId: session.userId, kind: 'account' };
}
