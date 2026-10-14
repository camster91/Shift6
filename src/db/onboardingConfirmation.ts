import type { SQLiteDatabase } from 'expo-sqlite';
import type { OnboardingRecoveryState } from '../domain/onboardingRecovery';
import { parseOnboardingRecoveryState } from '../domain/onboardingRecovery';
import {
  toOnboardingProfile,
  fromOnboardingProfile,
  getOnboardingMissingFields,
} from '../domain/onboarding';
import { getOnboardingProfile, saveOnboardingProfileInTransaction } from './profileRepository';
import { getUserConsiderations, saveUserConsiderations } from './considerationsRepository';
import { getOnboardingDraft, clearOnboardingDraft } from './onboardingDraftRepository';

export const setupChoiceSnapshot = (state: OnboardingRecoveryState) =>
  JSON.stringify({
    draft: state.draft,
    movementConsiderations: state.movementConsiderations,
    accessibilityNeeds: state.accessibilityNeeds,
  });

/** No canonical or recovery write survives a cancelled in-flight transaction.
 * After commit, the confirmed snapshot is valid even if its screen is no longer
 * visible; callers must suppress navigation/receipts for stale completions. */
export async function confirmOnboardingSetup(
  database: SQLiteDatabase,
  owner: string,
  confirmed: OnboardingRecoveryState,
  expectedRecovery: OnboardingRecoveryState | null,
  confirmedAt: string,
  isCurrent: () => boolean,
): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(confirmed)) as OnboardingRecoveryState;
  const recoverySnapshot = JSON.stringify(expectedRecovery);
  if (!parseOnboardingRecoveryState(snapshot) || !owner.trim())
    throw new Error('Invalid setup confirmation.');
  if (
    [0, 1, 2, 3, 4, 6, 7, 8].some(
      (question) => getOnboardingMissingFields(question, snapshot.draft).length,
    )
  )
    throw new Error('Required setup choices are missing. Review before confirming.');
  const assertCurrent = () => {
    if (!isCurrent())
      throw new Error('Setup confirmation was cancelled. Review your choices again.');
  };
  assertCurrent();
  const profile = toOnboardingProfile(snapshot.draft, confirmedAt, owner);
  await database.withExclusiveTransactionAsync(async (tx) => {
    // Guard every asynchronous operation, including profile writer internals.
    const guarded = new Proxy(tx, {
      get(target, key) {
        const value = Reflect.get(target, key);
        if (typeof value !== 'function') return value;
        return async (...args: unknown[]) => {
          assertCurrent();
          const result = await Reflect.apply(value, target, args);
          assertCurrent();
          return result;
        };
      },
    }) as SQLiteDatabase;
    assertCurrent();
    const foreignKeys = await guarded.getFirstAsync<{ foreign_keys: number }>(
      'PRAGMA foreign_keys;',
    );
    if (foreignKeys?.foreign_keys !== 1)
      throw new Error('Safe local setup storage is unavailable.');
    const actualRecovery = await getOnboardingDraft(guarded, owner);
    const rawRecovery = await guarded.getFirstAsync<{ state_json: string }>(
      'SELECT state_json FROM onboarding_drafts WHERE user_id=?;',
      owner,
    );
    if (
      (rawRecovery && !actualRecovery) ||
      JSON.stringify(actualRecovery) !== recoverySnapshot ||
      (actualRecovery && setupChoiceSnapshot(actualRecovery) !== setupChoiceSnapshot(snapshot))
    )
      throw new Error('Setup choices changed. Reload and review before confirming.');
    await saveOnboardingProfileInTransaction(guarded, profile);
    await saveUserConsiderations(guarded, {
      userId: owner,
      movementConsiderations: snapshot.movementConsiderations,
      accessibilityNeeds: snapshot.accessibilityNeeds,
      updatedAt: confirmedAt,
    });
    const storedProfile = await getOnboardingProfile(guarded, owner);
    const storedConsiderations = await getUserConsiderations(guarded, owner);
    const sortedChoices = (state: OnboardingRecoveryState) =>
      setupChoiceSnapshot({
        ...state,
        draft: { ...state.draft, equipmentIds: [...state.draft.equipmentIds].sort() },
      });
    if (
      !storedProfile ||
      sortedChoices({
        ...snapshot,
        draft: fromOnboardingProfile(storedProfile),
        movementConsiderations: storedConsiderations.movementConsiderations,
        accessibilityNeeds: storedConsiderations.accessibilityNeeds,
      }) !==
        sortedChoices({
          ...snapshot,
          draft: { ...snapshot.draft, displayName: snapshot.draft.displayName.trim() },
        })
    )
      throw new Error('Confirmed setup could not be verified. No changes were saved.');
    await clearOnboardingDraft(guarded, owner);
    assertCurrent();
  });
}
