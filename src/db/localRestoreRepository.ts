import type { SQLiteDatabase } from 'expo-sqlite';
import { runtimeConfig } from '../config/env';
import { LOCAL_GUEST_USER_ID } from '../domain/userIdentity';
import { remapCoachReviewReceipt } from '../domain/coachReviewJournal';
import {
  restoreTables,
  restoreColumns,
  validateLocalBackup,
  type RestoreSection,
  type RestoreRow,
} from '../domain/localRestore';

export async function assertEmptyRestoreTarget(db: SQLiteDatabase): Promise<void> {
  for (const table of [...Object.values(restoreTables), 'sync_outbox']) {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM ${table};`,
    );
    if (!row || row.count !== 0)
      throw new Error(
        'This installation already contains local records. Restore does not merge or overwrite them. Export your current data first; no records were changed.',
      );
  }
}

export async function restoreLocalBackup(
  db: SQLiteDatabase,
  owner: string,
  serialized: string,
): Promise<number> {
  if (runtimeConfig.releaseMode !== 'guest-only' || owner !== LOCAL_GUEST_USER_ID)
    throw new Error('Restore is available only in an empty guest installation.');
  const preview = validateLocalBackup(serialized);
  if (!preview.recordCount) throw new Error('This export has no records to restore.');
  const sourceOwner = preview.data.userId;
  await db.execAsync('PRAGMA foreign_keys=ON;');
  await db.withExclusiveTransactionAsync(async (tx) => {
    const foreignKeys = await tx.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
    if (foreignKeys?.foreign_keys !== 1)
      throw new Error('Restore needs verified foreign-key enforcement. No records were restored.');
    await assertEmptyRestoreTarget(tx);
    await tx.execAsync('PRAGMA defer_foreign_keys=ON;');
    for (const key of Object.keys(restoreTables) as RestoreSection[]) {
      const columns = restoreColumns(restoreTables[key]);
      const sql = `INSERT INTO ${restoreTables[key]} (${columns.map((column) => column.name).join(',')}) VALUES (${columns.map(() => '?').join(',')});`;
      for (const source of preview.data[key] ?? []) {
        const row = { ...source } as RestoreRow;
        if (row.user_id !== undefined) row.user_id = owner;
        if (key === 'userProfiles') {
          row.id = owner;
          row.health_connection = 'not-now';
        }
        if (key === 'coachPrivacyPreferences') row.provider_coach_enabled = 0;
        if (key === 'coachMemoryPreferences') row.enabled = 0;
        if (key === 'notificationPreferences')
          for (const field of [
            'workout_reminders',
            'rest_timer',
            'weekly_review',
            'cycle_review',
            'coach_messages',
          ])
            row[field] = 0;
        for (const column of columns.filter((column) => column.name.endsWith('_json'))) {
          let value: unknown = JSON.parse(String(row[column.name]));
          if (key === 'userPrograms')
            value = { ...(value as Record<string, unknown>), ownerId: owner };
          if (key === 'userExercises') value = { ...(value as Record<string, unknown>), media: [] };
          if (key === 'builderRecoveryDrafts') {
            const snapshot = value as {
              program: Record<string, unknown>;
              customExercises: Record<string, unknown>[];
            };
            value = {
              ...snapshot,
              program: { ...snapshot.program, ownerId: owner },
              customExercises: snapshot.customExercises.map((exercise) => ({
                ...exercise,
                media: [],
              })),
            };
          }
          if (key === 'onboardingDrafts') {
            const state = value as { draft: Record<string, unknown> };
            value = { ...state, draft: { ...state.draft, healthConnection: 'not-now' } };
          }
          if (key === 'coachReviewJournal')
            value = JSON.parse(remapCoachReviewReceipt(String(row[column.name]), owner));
          row[column.name] = JSON.stringify(value);
        }
        // IDs embedded in strings remain stable. Only explicit owner fields are
        // remapped, so every historical reference still names the same record.
        if (key === 'userPrograms' && sourceOwner !== owner) {
          const value = JSON.parse(String(row.program_json));
          if (value.ownerId !== owner) throw new Error('Owner remapping failed.');
        }
        await tx.runAsync(sql, ...columns.map((column) => row[column.name]!));
      }
    }
    const foreignErrors = await tx.getAllAsync('PRAGMA foreign_key_check;');
    if (foreignErrors.length)
      throw new Error('Backup references could not be restored. No records were changed.');
  });
  return preview.recordCount;
}
