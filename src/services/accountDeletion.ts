import type { SQLiteDatabase } from 'expo-sqlite';

import { assertNoUnsupportedShiftOutboxRows, deleteLocalUserData } from '../db/privacyRepository';
import {
  accountDeletionRecoveryStore,
  type AccountDeletionRecoveryStore,
} from './accountDeletionRecovery';
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
  recoveryStore?: AccountDeletionRecoveryStore;
  now?: () => string;
}

/**
 * Remote confirmation is the irreversible boundary. Local data and auth state
 * are not touched until the backend confirms that the account was deleted.
 * A secure recovery marker makes post-delete cleanup resumable after app exit.
 */
export async function deleteAuthenticatedAccount({
  database,
  userId,
  backend,
  auth,
  deleteLocalData = deleteLocalUserData,
  recoveryStore = accountDeletionRecoveryStore,
  now = () => new Date().toISOString(),
}: DeleteAuthenticatedAccountInput): Promise<AccountDeletionOutcome> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('A user ID is required to delete an account.');

  // Do not cross the irreversible remote boundary if a newer Shift mutation
  // could survive local cleanup under an unknown child entity ID convention.
  if (deleteLocalData === deleteLocalUserData) {
    await assertNoUnsupportedShiftOutboxRows(database);
  }

  await backend.deleteAccount();

  const remoteDeletedAt = normalizeTimestamp(now());
  let recoveryPersisted = true;
  try {
    await recoveryStore.set({
      userId: normalizedUserId,
      stage: 'local-data',
      remoteDeletedAt,
    });
  } catch {
    recoveryPersisted = false;
  }

  try {
    await deleteLocalData(database, normalizedUserId);
  } catch {
    if (!recoveryPersisted) {
      try {
        await recoveryStore.set({
          userId: normalizedUserId,
          stage: 'local-data',
          remoteDeletedAt,
        });
        recoveryPersisted = true;
      } catch {
        // The UI still receives the incomplete state for an immediate retry.
      }
    }

    return {
      remoteDeleted: true,
      localDataDeleted: false,
      signedOut: false,
      warnings: [
        'The remote account was deleted, but local device data could not be cleared. Retry local cleanup before signing out.',
        ...(recoveryPersisted
          ? []
          : [
              'This device could not save the cleanup recovery marker. Keep SHIFT6 open and retry cleanup now.',
            ]),
      ],
    };
  }

  try {
    await recoveryStore.set({
      userId: normalizedUserId,
      stage: 'sign-out',
      remoteDeletedAt,
    });
  } catch {
    // A previous local-data marker is still safe: repeating local deletion is idempotent.
  }

  try {
    await auth.signOut();
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

  const warnings: string[] = [];
  try {
    await recoveryStore.clear(normalizedUserId);
  } catch {
    warnings.push('The account was deleted, but the local cleanup marker could not be removed.');
  }

  return { remoteDeleted: true, localDataDeleted: true, signedOut: true, warnings };
}

function normalizeTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('A valid deletion timestamp is required.');
  return new Date(timestamp).toISOString();
}
