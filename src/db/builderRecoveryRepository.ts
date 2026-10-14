import type { SQLiteDatabase } from 'expo-sqlite';
import {
  assertPrivateRecoveryMovementIds,
  builderRecoveryId,
  builderRecoveryRoute,
} from '../domain/builderRecovery';
import { validateBuilderRecoverySnapshot } from '../domain/localRestore';
import type { BuilderRecoveryDraft, BuilderRecoverySnapshot } from '../domain/localPersistence';
type Row = {
  id: string;
  user_id: string;
  snapshot_json: string;
  revision: number;
  updated_at: string;
};
function owner(value: string) {
  if (!value.trim()) throw new Error('A local owner is required.');
  return value;
}
async function exclusive(
  database: SQLiteDatabase,
  operation: (tx: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (tx) => {
    const flags = await tx.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
    if (flags?.foreign_keys !== 1)
      throw new Error('Private recovery requires enforced local foreign keys.');
    await operation(tx);
  });
}
export async function getBuilderRecovery(
  database: SQLiteDatabase,
  userId: string,
  route: string,
): Promise<BuilderRecoveryDraft | null> {
  const rows = await database.getAllAsync<Row>(
    'SELECT id,user_id,snapshot_json,revision,updated_at FROM builder_recovery_drafts WHERE user_id=?;',
    owner(userId),
  );
  const matches = rows.filter((row) => builderRecoveryRoute(row.id) === route);
  if (matches.length > 1)
    throw new Error(
      'More than one recovery exists for this route. Export your local data before resolving it.',
    );
  if (!matches[0]) return null;
  const row = matches[0];
  const snapshot = validateBuilderRecoverySnapshot(row.snapshot_json, userId);
  assertPrivateRecoveryMovementIds(snapshot);
  return {
    id: row.id,
    userId,
    revision: row.revision,
    updatedAt: row.updated_at,
    snapshot,
  };
}
export async function saveBuilderRecovery(
  database: SQLiteDatabase,
  userId: string,
  route: string,
  snapshot: BuilderRecoverySnapshot,
  expectedRevision: number,
  existingId = builderRecoveryId(userId, route),
): Promise<BuilderRecoveryDraft> {
  const user = owner(userId);
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    builderRecoveryRoute(existingId) !== route
  )
    throw new Error('Invalid recovery revision or route.');
  const serialized = JSON.stringify(snapshot);
  validateBuilderRecoverySnapshot(serialized, user);
  assertPrivateRecoveryMovementIds(snapshot);
  const now = new Date().toISOString();
  await exclusive(database, async (tx) => {
    const existing = await tx.getAllAsync<{ id: string }>(
      'SELECT id FROM builder_recovery_drafts WHERE user_id=?;',
      user,
    );
    if (
      existing.some((entry) => entry.id !== existingId && builderRecoveryRoute(entry.id) === route)
    )
      throw new Error(
        'Recovery changed in another editor. Reopen and choose which draft to resume.',
      );
    const result =
      expectedRevision === 0
        ? await tx.runAsync(
            'INSERT INTO builder_recovery_drafts(id,user_id,snapshot_json,revision,updated_at) VALUES (?,?,?,1,?) ON CONFLICT(id) DO NOTHING;',
            existingId,
            user,
            serialized,
            now,
          )
        : await tx.runAsync(
            'UPDATE builder_recovery_drafts SET snapshot_json=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=?;',
            serialized,
            now,
            existingId,
            user,
            expectedRevision,
          );
    if (result.changes !== 1)
      throw new Error(
        'Recovery changed in another editor. Reopen and choose which draft to resume.',
      );
  });
  return { id: existingId, userId: user, snapshot, revision: expectedRevision + 1, updatedAt: now };
}
export async function clearBuilderRecovery(
  database: SQLiteDatabase,
  userId: string,
  id: string,
  expectedRevision: number,
): Promise<void> {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)
    throw new Error('Invalid recovery revision.');
  await exclusive(database, async (tx) => {
    const result = await tx.runAsync(
      'DELETE FROM builder_recovery_drafts WHERE id=? AND user_id=? AND revision=?;',
      id,
      owner(userId),
      expectedRevision,
    );
    if (result.changes !== 1)
      throw new Error('Recovery changed in another editor. Reopen before discarding.');
  });
}
