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

  let localDataDeleted = true;
  let signedOut = true;
  const warnings: string[] = [];

  try {
    await deleteLocalData(database, normalizedUserId);
  } catch {
    localDataDeleted = false;
    warnings.push('The remote account was deleted, but local device data could not be cleared.');
  }

  try {
    await auth.signOut();
  } catch {
    signedOut = false;
    warnings.push('The remote account was deleted, but the local auth session could not be cleared.');
  }

  return { remoteDeleted: true, localDataDeleted, signedOut, warnings };
}
