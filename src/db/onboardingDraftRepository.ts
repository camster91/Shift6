import type { SQLiteDatabase } from 'expo-sqlite';
import {
  parseOnboardingRecoveryState,
  type OnboardingRecoveryState,
} from '../domain/onboardingRecovery';

const owner = (userId: string) => {
  const normalized = userId.trim();
  if (!normalized) throw new Error('A user ID is required for setup recovery.');
  return normalized;
};

export async function getOnboardingDraft(
  database: SQLiteDatabase,
  userId: string,
): Promise<OnboardingRecoveryState | null> {
  const row = await database.getFirstAsync<{ state_json: string }>(
    'SELECT state_json FROM onboarding_drafts WHERE user_id = ?;',
    owner(userId),
  );
  if (!row) return null;
  try {
    return parseOnboardingRecoveryState(JSON.parse(row.state_json));
  } catch {
    return null;
  }
}

export async function saveOnboardingDraft(
  database: SQLiteDatabase,
  userId: string,
  state: OnboardingRecoveryState,
): Promise<void> {
  const user = owner(userId);
  if (!parseOnboardingRecoveryState(state)) throw new Error('Setup recovery data is invalid.');
  await database.runAsync(
    `INSERT INTO onboarding_drafts (user_id, state_json, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at;`,
    user,
    JSON.stringify(state),
    new Date().toISOString(),
  );
}

export async function clearOnboardingDraft(
  database: SQLiteDatabase,
  userId: string,
): Promise<void> {
  await database.runAsync('DELETE FROM onboarding_drafts WHERE user_id = ?;', owner(userId));
}
