import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createEmptyUserConsiderations,
  normalizeAccessibilityNeeds,
  normalizeMovementConsiderations,
  type UserConsiderations,
} from '../domain/considerations';

interface UserConsiderationsRow {
  user_id: string;
  movement_considerations_json: string;
  accessibility_needs_json: string;
  updated_at: string;
}

/**
 * Preferences that may reveal accessibility or movement limitations remain
 * local-only until a separate remote privacy policy explicitly opts them in.
 */
export async function saveUserConsiderations(
  database: SQLiteDatabase,
  considerations: UserConsiderations,
): Promise<UserConsiderations> {
  const userId = considerations.userId.trim();
  if (!userId) throw new Error('A user ID is required to save considerations.');

  const normalized: UserConsiderations = {
    userId,
    movementConsiderations: normalizeMovementConsiderations(
      considerations.movementConsiderations,
    ),
    accessibilityNeeds: normalizeAccessibilityNeeds(considerations.accessibilityNeeds),
    updatedAt: normalizeDate(considerations.updatedAt),
  };

  await database.runAsync(
    `INSERT INTO user_considerations
      (user_id, movement_considerations_json, accessibility_needs_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       movement_considerations_json = excluded.movement_considerations_json,
       accessibility_needs_json = excluded.accessibility_needs_json,
       updated_at = excluded.updated_at;`,
    normalized.userId,
    JSON.stringify(normalized.movementConsiderations),
    JSON.stringify(normalized.accessibilityNeeds),
    normalized.updatedAt,
  );

  return normalized;
}

export async function getUserConsiderations(
  database: SQLiteDatabase,
  userId: string,
): Promise<UserConsiderations> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return createEmptyUserConsiderations('', new Date(0).toISOString());

  const row = await database.getFirstAsync<UserConsiderationsRow>(
    `SELECT user_id, movement_considerations_json, accessibility_needs_json, updated_at
       FROM user_considerations
      WHERE user_id = ?;`,
    normalizedUserId,
  );

  if (!row) return createEmptyUserConsiderations(normalizedUserId, new Date(0).toISOString());

  return {
    userId: row.user_id,
    movementConsiderations: normalizeMovementConsiderations(
      parseArray(row.movement_considerations_json),
    ),
    accessibilityNeeds: normalizeAccessibilityNeeds(parseArray(row.accessibility_needs_json)),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function parseArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('A valid updated timestamp is required.');
  return new Date(timestamp).toISOString();
}
