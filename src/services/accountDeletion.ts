import type { SQLiteDatabase } from 'expo-sqlite';

import { deleteLocalUserData } from '../db/privacyRepository';
import type { AuthProvider, BackendClient } from './contracts';

export interface AccountDeletionOutcome {
  remoteDeleted: true;
  localDataDeleted: boolean;
  signedOut: boolean;
  warnings: string[];
}

export interface DeleteAuthenticatedAccountInput {
  database: SQLiteDatabase;
  userId: string;
  backend: BackendClient;
  auth: AuthProvider;
  deleteLocalData?: typeof deleteLocalUserData;
}

/**
 * Remote confirmation is the irreversible boundary. Local data and auth state
 * are not touched until the backend confirms that the account was deleted.
 * If local cleanup then fails, keep the current local identity mounted so the
 * user can retry deletion instead of orphaning rows behind a guest identity.
 */
export async function deleteAuthenticatedAccount({
  database,
  userId,
  backend,
  auth,
  deleteLocalData = deleteLocalUserData,
}: DeleteAuthenticatedAccountInput): Promise<AccountDeletionOutcome> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('A user ID is required to delete an account.');

  await backend.deleteAccount();

  try {
    await deleteLocalData(database, normalizedUserId);
  } catch {
    return {
      remoteDeleted: true,
      localDataDeleted: false,
      signedOut: false,
      warnings: [
        'The remote account was deleted, but local device data could not be cleared. Retry local cleanup before signing out.',
      ],
    };
  }

  try {
    await auth.signOut();
    return { remoteDeleted: true, localDataDeleted: true, signedOut: true, warnings: [] };
  } catch {
    return {
      remoteDeleted: true,
      localDataDeleted: true,
      signedOut: false,
      warnings: [
        'The account and local data were deleted, but the local auth session could not be cleared.',
      ],
    };
  }
}
