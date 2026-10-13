import type { SQLiteDatabase } from 'expo-sqlite';
import type { CoachMemoryFact, CoachMemoryValue } from '../domain/localPersistence';
import type { OnboardingProfile } from '../domain/types';
import { validateCoachMemoryValue } from '../domain/localRestore';
import { getOnboardingProfile } from './profileRepository';

interface FactRow {
  id: string;
  user_id: string;
  value_json: string;
  revision: number;
  operation_id: string;
  confirmed_at: string;
  updated_at: string;
}
interface PreferenceRow {
  user_id: string;
  enabled: number;
  updated_at: string;
}
export interface CoachMemorySnapshot {
  owner: string;
  profile: OnboardingProfile | null;
  enabled: boolean;
  preferenceUpdatedAt: string | null;
  facts: CoachMemoryFact[];
}
export type MemoryWriteGuard = () => boolean;
const conflict = () => {
  throw new Error('Local memory changed. Reload and review before confirming.');
};
function guardCurrent(guard?: MemoryWriteGuard) {
  if (guard && !guard()) throw new Error('Memory context changed. No preference was changed.');
}
function identifier(value: string) {
  if (!value?.trim() || value.length > 200 || /[\u0000-\u001f]/.test(value))
    throw new Error('A valid local memory operation is required.');
}
function instant(value: string) {
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value)
    throw new Error('A valid confirmation time is required.');
}
function mapFact(row: FactRow): CoachMemoryFact {
  return {
    id: row.id,
    userId: row.user_id,
    value: validateCoachMemoryValue(row.value_json),
    revision: row.revision,
    operationId: row.operation_id,
    confirmedAt: row.confirmed_at,
    updatedAt: row.updated_at,
  };
}
async function preference(db: SQLiteDatabase, owner: string) {
  return db.getFirstAsync<PreferenceRow>(
    'SELECT * FROM coach_memory_preferences WHERE user_id=?;',
    owner,
  );
}
async function ownedProfile(db: SQLiteDatabase, owner: string) {
  identifier(owner);
  const profile = await getOnboardingProfile(db, owner);
  if (!profile || profile.user.id !== owner)
    throw new Error('Complete your own local setup before confirming memory.');
  return profile;
}
function nextStamp(at: string, previous: string | null) {
  // Distinct CAS tokens even if several user operations occur in one millisecond.
  return new Date(Math.max(Date.parse(at), previous ? Date.parse(previous) + 1 : 0)).toISOString();
}
async function touchPreference(db: SQLiteDatabase, owner: string, enabled: boolean, at: string) {
  await db.runAsync(
    'INSERT INTO coach_memory_preferences (user_id,enabled,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at;',
    owner,
    enabled ? 1 : 0,
    at,
  );
}

export async function getCoachMemorySnapshot(
  db: SQLiteDatabase,
  owner: string,
): Promise<CoachMemorySnapshot> {
  identifier(owner);
  let snapshot: CoachMemorySnapshot | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const profile = await getOnboardingProfile(tx, owner);
    const saved = await preference(tx, owner);
    const rows = await tx.getAllAsync<FactRow>(
      'SELECT * FROM coach_memory_facts WHERE user_id=? ORDER BY id;',
      owner,
    );
    const facts = rows.map(mapFact);
    if ((profile && profile.user.id !== owner) || (!profile && (saved || facts.length)))
      throw new Error('Local memory ownership could not be verified.');
    if (new Set(facts.map((fact) => fact.value.kind)).size !== facts.length)
      throw new Error('Local memory has conflicting preferences. Review is required.');
    snapshot = {
      owner,
      profile,
      enabled: saved?.enabled === 1,
      preferenceUpdatedAt: saved?.updated_at ?? null,
      facts,
    };
  });
  if (!snapshot) throw new Error('Local memory could not be read.');
  return snapshot;
}

export interface ConfirmMemoryInput {
  owner: string;
  value: CoachMemoryValue;
  expectedRevision: number;
  expectedPreferenceUpdatedAt: string | null;
  operationId: string;
  confirmedAt: string;
  guard?: MemoryWriteGuard;
}
export async function confirmCoachMemoryFact(
  db: SQLiteDatabase,
  input: ConfirmMemoryInput,
): Promise<CoachMemoryFact> {
  identifier(input.owner);
  identifier(input.operationId);
  instant(input.confirmedAt);
  const value = validateCoachMemoryValue(JSON.stringify(input.value));
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) conflict();
  let result: CoachMemoryFact | undefined;
  await db.withExclusiveTransactionAsync(async (tx) => {
    guardCurrent(input.guard);
    await ownedProfile(tx, input.owner);
    const rows = await tx.getAllAsync<FactRow>(
      'SELECT * FROM coach_memory_facts WHERE user_id=?;',
      input.owner,
    );
    const facts = rows.map(mapFact);
    const priorOperation = facts.find((fact) => fact.operationId === input.operationId);
    if (priorOperation) {
      if (
        JSON.stringify(priorOperation.value) !== JSON.stringify(value) ||
        priorOperation.revision !== input.expectedRevision + 1
      )
        conflict();
      guardCurrent(input.guard);
      result = priorOperation;
      return;
    }
    const matching = facts.filter((fact) => fact.value.kind === value.kind);
    if (matching.length > 1) conflict();
    const current = matching[0];
    const saved = await preference(tx, input.owner);
    if (
      (saved?.updated_at ?? null) !== input.expectedPreferenceUpdatedAt ||
      (current?.revision ?? 0) !== input.expectedRevision
    )
      conflict();
    const updatedAt = nextStamp(input.confirmedAt, saved?.updated_at ?? null);
    const id = current?.id ?? `memory-${input.operationId}`;
    guardCurrent(input.guard);
    if (current) {
      const written = await tx.runAsync(
        'UPDATE coach_memory_facts SET value_json=?,revision=?,operation_id=?,confirmed_at=?,updated_at=? WHERE id=? AND user_id=? AND revision=?;',
        JSON.stringify(value),
        current.revision + 1,
        input.operationId,
        input.confirmedAt,
        updatedAt,
        id,
        input.owner,
        input.expectedRevision,
      );
      if (written.changes !== 1) conflict();
    } else
      await tx.runAsync(
        'INSERT INTO coach_memory_facts (id,user_id,value_json,revision,operation_id,confirmed_at,updated_at) VALUES (?,?,?,?,?,?,?);',
        id,
        input.owner,
        JSON.stringify(value),
        1,
        input.operationId,
        input.confirmedAt,
        updatedAt,
      );
    await touchPreference(tx, input.owner, saved?.enabled === 1, updatedAt);
    guardCurrent(input.guard);
    result = {
      id,
      userId: input.owner,
      value,
      revision: (current?.revision ?? 0) + 1,
      operationId: input.operationId,
      confirmedAt: input.confirmedAt,
      updatedAt,
    };
  });
  if (!result) throw new Error('Memory confirmation did not complete.');
  return result;
}

export async function setCoachMemoryEnabled(
  db: SQLiteDatabase,
  owner: string,
  enabled: boolean,
  expectedPreferenceUpdatedAt: string | null,
  at: string,
  guard?: MemoryWriteGuard,
): Promise<void> {
  identifier(owner);
  instant(at);
  if (typeof enabled !== 'boolean') throw new Error('Choose whether local memory is enabled.');
  await db.withExclusiveTransactionAsync(async (tx) => {
    guardCurrent(guard);
    await ownedProfile(tx, owner);
    const saved = await preference(tx, owner);
    if ((saved?.updated_at ?? null) !== expectedPreferenceUpdatedAt) conflict();
    guardCurrent(guard);
    await touchPreference(tx, owner, enabled, nextStamp(at, saved?.updated_at ?? null));
    guardCurrent(guard);
  });
}

export async function forgetCoachMemoryFact(
  db: SQLiteDatabase,
  owner: string,
  factId: string,
  expectedRevision: number,
  expectedPreferenceUpdatedAt: string | null,
  at: string,
  guard?: MemoryWriteGuard,
): Promise<boolean> {
  identifier(owner);
  identifier(factId);
  instant(at);
  let removed = false;
  await db.withExclusiveTransactionAsync(async (tx) => {
    guardCurrent(guard);
    await ownedProfile(tx, owner);
    const fact = await tx.getFirstAsync<FactRow>(
      'SELECT * FROM coach_memory_facts WHERE id=? AND user_id=?;',
      factId,
      owner,
    );
    if (!fact) return; // Safe repeated deletion; no value or tombstone retained.
    const saved = await preference(tx, owner);
    if (
      fact.revision !== expectedRevision ||
      (saved?.updated_at ?? null) !== expectedPreferenceUpdatedAt
    )
      conflict();
    guardCurrent(guard);
    const written = await tx.runAsync(
      'DELETE FROM coach_memory_facts WHERE id=? AND user_id=? AND revision=?;',
      factId,
      owner,
      expectedRevision,
    );
    if (written.changes !== 1) conflict();
    await touchPreference(
      tx,
      owner,
      saved?.enabled === 1,
      nextStamp(at, saved?.updated_at ?? null),
    );
    guardCurrent(guard);
    removed = true;
  });
  return removed;
}
