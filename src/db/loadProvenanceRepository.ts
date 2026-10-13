import type { SQLiteDatabase } from 'expo-sqlite';
import type { CompletedSet, WorkoutDraftValues } from '../domain/types';
import { actualLoadUnit } from '../domain/loadUnits';

export async function assertOwnedLoadSession(
  db: SQLiteDatabase,
  sessionId: string,
  owner: string | undefined,
): Promise<string> {
  if (!owner) throw new Error('The current person is required to save actual load units.');
  const row = await db.getFirstAsync<{ user_id: string }>(
    'SELECT c.user_id FROM workout_sessions s JOIN training_cycles c ON c.id=s.cycle_id WHERE s.id=? AND c.user_id=?;',
    sessionId,
    owner,
  );
  if (!row) throw new Error('This workout does not belong to the current person.');
  return owner;
}
/** Caller owns the same transaction as the base set write. */
export async function writeSetLoadProvenance(
  db: SQLiteDatabase,
  set: CompletedSet,
  owner: string | undefined,
) {
  await assertOwnedLoadSession(db, set.sessionId, owner);
  if (set.load === undefined) {
    await db.runAsync(
      'DELETE FROM completed_set_load_provenance WHERE completed_set_id=? AND session_id=? AND user_id=?;',
      set.id,
      set.sessionId,
      owner!,
    );
    return;
  }
  const unit = actualLoadUnit(set.loadUnit);
  if (!unit || !Number.isFinite(set.load) || set.load < 0)
    throw new Error('Confirm kg or lb for the actual load before saving.');
  await assertOwnedLoadSession(db, set.sessionId, owner);
  await db.runAsync(
    `INSERT INTO completed_set_load_provenance (completed_set_id,session_id,user_id,load_unit,load_value,set_completed_at,recorded_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(completed_set_id) DO UPDATE SET session_id=excluded.session_id,user_id=excluded.user_id,load_unit=excluded.load_unit,load_value=excluded.load_value,set_completed_at=excluded.set_completed_at,recorded_at=excluded.recorded_at;`,
    set.id,
    set.sessionId,
    owner!,
    unit,
    set.load,
    set.completedAt,
    set.completedAt,
  );
}
export function splitDraftLoadUnits(values: WorkoutDraftValues) {
  const units: Record<string, string> = {};
  const plain = Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (value.loadUnit === 'kg' || value.loadUnit === 'lb') units[key] = value.loadUnit;
      const { loadUnit: discard, ...fields } = value;
      void discard;
      return [key, fields];
    }),
  );
  return { plain, units };
}
