import type { SQLiteDatabase } from 'expo-sqlite';

import type { OnboardingProfile } from '../domain/types';

interface UserProfileRow {
  id: string;
  display_name: string;
  unit_system: OnboardingProfile['user']['unitSystem'];
  goals_json: string;
  experience: OnboardingProfile['user']['experience'];
  training_days_per_week: number;
  preferred_session_minutes: number;
  preferred_training_time?: OnboardingProfile['user']['preferredTrainingTime'];
  coach_tone: OnboardingProfile['coachTone'];
  coach_intervention: OnboardingProfile['coachIntervention'];
  health_connection: OnboardingProfile['healthConnection'];
  completed_at: string;
  created_at: string;
  updated_at: string;
}

interface UserEquipmentRow {
  equipment_id: string;
}

export async function saveOnboardingProfile(
  database: SQLiteDatabase,
  profile: OnboardingProfile,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO user_profiles
        (id, display_name, unit_system, goals_json, experience, training_days_per_week,
         preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
         health_connection, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         unit_system = excluded.unit_system,
         goals_json = excluded.goals_json,
         experience = excluded.experience,
         training_days_per_week = excluded.training_days_per_week,
         preferred_session_minutes = excluded.preferred_session_minutes,
         preferred_training_time = excluded.preferred_training_time,
         coach_tone = excluded.coach_tone,
         coach_intervention = excluded.coach_intervention,
         health_connection = excluded.health_connection,
         completed_at = excluded.completed_at,
         updated_at = excluded.updated_at;`,
      profile.user.id,
      profile.user.displayName,
      profile.user.unitSystem,
      JSON.stringify(profile.user.goals),
      profile.user.experience,
      profile.user.trainingDaysPerWeek,
      profile.user.preferredSessionMinutes,
      profile.user.preferredTrainingTime,
      profile.coachTone,
      profile.coachIntervention,
      profile.healthConnection,
      profile.completedAt,
      profile.user.createdAt,
      profile.user.updatedAt,
    );

    await database.runAsync('DELETE FROM user_equipment WHERE user_id = ?;', profile.user.id);

    for (const equipmentId of profile.user.equipmentIds) {
      await database.runAsync(
        `INSERT INTO user_equipment (user_id, equipment_id) VALUES (?, ?);`,
        profile.user.id,
        equipmentId,
      );
    }

    await enqueueProfileMutation(database, profile);
  });
}

/**
 * Disconnects future health imports without touching the platform permission.
 * The profile snapshot and replaceable outbox mutation change together so a
 * later authenticated sync cannot resurrect the previous preference.
 */
export async function updateHealthConnectionPreference(
  database: SQLiteDatabase,
  userId: string,
  healthConnection: OnboardingProfile['healthConnection'],
  updatedAt: string,
): Promise<void> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) throw new Error('A user ID is required to update health preference.');

  await database.withTransactionAsync(async () => {
    const result = await database.runAsync(
      `UPDATE user_profiles
          SET health_connection = ?, updated_at = ?
        WHERE id = ?;`,
      healthConnection,
      updatedAt,
      normalizedUserId,
    );
    if (result.changes !== 1) {
      throw new Error('The local profile could not be found.');
    }

    const profile = await getOnboardingProfile(database, normalizedUserId);
    if (!profile) throw new Error('The local profile could not be reloaded.');
    await enqueueProfileMutation(database, profile);
  });
}

export async function getOnboardingProfile(
  database: SQLiteDatabase,
  userId: string,
): Promise<OnboardingProfile | null> {
  const row = await database.getFirstAsync<UserProfileRow>(
    `SELECT id, display_name, unit_system, goals_json, experience, training_days_per_week,
            preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
            health_connection, completed_at, created_at, updated_at
       FROM user_profiles
      WHERE id = ?;`,
    userId,
  );
  if (!row) return null;

  const equipmentRows = await database.getAllAsync<UserEquipmentRow>(
    'SELECT equipment_id FROM user_equipment WHERE user_id = ? ORDER BY equipment_id;',
    userId,
  );

  return {
    user: {
      id: row.id,
      displayName: row.display_name,
      unitSystem: row.unit_system,
      goals: JSON.parse(row.goals_json) as OnboardingProfile['user']['goals'],
      experience: row.experience,
      equipmentIds: equipmentRows.map((equipment) => equipment.equipment_id),
      trainingDaysPerWeek: row.training_days_per_week,
      preferredSessionMinutes: row.preferred_session_minutes,
      preferredTrainingTime: row.preferred_training_time ?? 'morning',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    coachTone: row.coach_tone,
    coachIntervention: row.coach_intervention,
    healthConnection: row.health_connection,
    completedAt: row.completed_at,
  };
}

async function enqueueProfileMutation(
  database: SQLiteDatabase,
  profile: OnboardingProfile,
): Promise<void> {
  await database.runAsync(
    `INSERT INTO sync_outbox
      (id, idempotency_key, entity_type, entity_id, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(idempotency_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       created_at = excluded.created_at,
       last_error = NULL;`,
    `outbox-profile-${profile.user.id}`,
    `profile:${profile.user.id}`,
    'profile',
    profile.user.id,
    JSON.stringify({ userId: profile.user.id, profile }),
    profile.user.updatedAt,
  );
}
