import type { SQLiteDatabase } from 'expo-sqlite';

export interface LocalAccountMigrationResult {
  status: 'migrated' | 'no-data';
  fromUserId: string;
  toUserId: string;
}

interface UserProfileRow {
  id: string;
  display_name: string;
  unit_system: string;
  goals_json: string;
  experience: string;
  training_days_per_week: number;
  preferred_session_minutes: number;
  preferred_training_time: string;
  coach_tone: string;
  coach_intervention: string;
  health_connection: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

interface SyncMutationRow {
  id: string;
  idempotency_key: string;
  entity_type: string;
  entity_id: string;
  payload_json: string;
}

/**
 * Adopts guest-owned local records after an auth provider has established an
 * account. The destination must be empty; merging two local identities would
 * require explicit conflict UX and must never happen as a side effect of sign-in.
 */
export async function migrateLocalUserToAccount(
  database: SQLiteDatabase,
  fromUserId: string,
  toUserId: string,
): Promise<LocalAccountMigrationResult> {
  const sourceUserId = fromUserId.trim();
  const destinationUserId = toUserId.trim();
  if (!sourceUserId || !destinationUserId) {
    throw new Error('Both local and account user IDs are required.');
  }
  if (sourceUserId === destinationUserId) {
    return { status: 'no-data', fromUserId: sourceUserId, toUserId: destinationUserId };
  }

  let result: LocalAccountMigrationResult = {
    status: 'no-data',
    fromUserId: sourceUserId,
    toUserId: destinationUserId,
  };

  await database.withTransactionAsync(async () => {
    const destinationConflict = await database.getFirstAsync<{ conflict: 1 }>(
      `SELECT 1 AS conflict
         FROM user_profiles
        WHERE id = ?
       UNION ALL
       SELECT 1 FROM user_programs WHERE user_id = ?
       UNION ALL
       SELECT 1 FROM user_exercises WHERE user_id = ?
       UNION ALL
       SELECT 1 FROM training_cycles WHERE user_id = ?
       UNION ALL
       SELECT 1 FROM coach_proposals WHERE user_id = ?
       UNION ALL
       SELECT 1 FROM health_summaries WHERE user_id = ?
       UNION ALL
       SELECT 1 FROM notification_preferences WHERE user_id = ?
       UNION ALL
       SELECT 1 FROM sync_outbox WHERE idempotency_key = ?
        LIMIT 1;`,
      destinationUserId,
      destinationUserId,
      destinationUserId,
      destinationUserId,
      destinationUserId,
      destinationUserId,
      destinationUserId,
      `profile:${destinationUserId}`,
    );
    if (destinationConflict) {
      throw new Error('The account already has local data; explicit merge is required.');
    }

    const sourceProfile = await database.getFirstAsync<UserProfileRow>(
      `SELECT id, display_name, unit_system, goals_json, experience, training_days_per_week,
              preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
              health_connection, completed_at, created_at, updated_at
         FROM user_profiles
        WHERE id = ?
        LIMIT 1;`,
      sourceUserId,
    );
    const mutations = await database.getAllAsync<SyncMutationRow>(
      `SELECT id, idempotency_key, entity_type, entity_id, payload_json
         FROM sync_outbox
        WHERE (entity_type = 'profile' AND entity_id = ?)
           OR (entity_type = 'notification-preference' AND entity_id = ?)
           OR (entity_type = 'training-cycle' AND entity_id IN (
                SELECT id FROM training_cycles WHERE user_id = ?
              ))
           OR (entity_type = 'program-version' AND entity_id IN (
                SELECT user_program_versions.id
                  FROM user_program_versions
                  INNER JOIN user_programs ON user_programs.id = user_program_versions.program_id
                 WHERE user_programs.user_id = ?
              ))
           OR (entity_type = 'exercise' AND entity_id IN (
                SELECT id FROM user_exercises WHERE user_id = ?
              ))
           OR (entity_type = 'coach-proposal' AND entity_id IN (
                SELECT id FROM coach_proposals WHERE user_id = ?
              ))
           OR (entity_type = 'workout-session' AND entity_id IN (
                SELECT workout_sessions.id
                  FROM workout_sessions
                  INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
                 WHERE training_cycles.user_id = ?
              ))
           OR (entity_type = 'completed-set' AND entity_id IN (
                SELECT completed_sets.id
                  FROM completed_sets
                  INNER JOIN workout_sessions ON workout_sessions.id = completed_sets.session_id
                  INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
                 WHERE training_cycles.user_id = ?
              ))
           OR (entity_type = 'workout-check-in' AND entity_id IN (
                SELECT workout_check_ins.session_id
                  FROM workout_check_ins
                  INNER JOIN workout_sessions ON workout_sessions.id = workout_check_ins.session_id
                  INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
                 WHERE training_cycles.user_id = ?
              ))
        ORDER BY created_at ASC, id ASC;`,
      sourceUserId,
      sourceUserId,
      sourceUserId,
      sourceUserId,
      sourceUserId,
      sourceUserId,
      sourceUserId,
      sourceUserId,
      sourceUserId,
    );

    if (!sourceProfile && mutations.length === 0) return;

    for (const mutation of mutations) {
      const payload = parseMutationPayload(mutation.payload_json, mutation.id);
      const nextPayload = replaceUserIdentity(payload, sourceUserId, destinationUserId);
      const isProfileMutation = mutation.entity_type === 'profile';
      await database.runAsync(
        `UPDATE sync_outbox
            SET id = ?, idempotency_key = ?, entity_id = ?, payload_json = ?
          WHERE id = ?;`,
        isProfileMutation ? `outbox-profile-${destinationUserId}` : mutation.id,
        isProfileMutation ? `profile:${destinationUserId}` : mutation.idempotency_key,
        isProfileMutation ? destinationUserId : mutation.entity_id,
        JSON.stringify(nextPayload),
        mutation.id,
      );
    }

    if (sourceProfile) {
      await database.runAsync(
        `INSERT INTO user_profiles
          (id, display_name, unit_system, goals_json, experience, training_days_per_week,
           preferred_session_minutes, preferred_training_time, coach_tone, coach_intervention,
           health_connection, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        destinationUserId,
        sourceProfile.display_name,
        sourceProfile.unit_system,
        sourceProfile.goals_json,
        sourceProfile.experience,
        sourceProfile.training_days_per_week,
        sourceProfile.preferred_session_minutes,
        sourceProfile.preferred_training_time,
        sourceProfile.coach_tone,
        sourceProfile.coach_intervention,
        sourceProfile.health_connection,
        sourceProfile.completed_at,
        sourceProfile.created_at,
        sourceProfile.updated_at,
      );
    }

    await database.runAsync(
      'UPDATE user_equipment SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    await database.runAsync(
      'UPDATE user_programs SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    await database.runAsync(
      'UPDATE user_exercises SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    await database.runAsync(
      'UPDATE training_cycles SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    await database.runAsync(
      'UPDATE coach_proposals SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    await database.runAsync(
      'UPDATE health_summaries SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    await database.runAsync(
      'UPDATE notification_preferences SET user_id = ? WHERE user_id = ?;',
      destinationUserId,
      sourceUserId,
    );
    if (sourceProfile) {
      await database.runAsync('DELETE FROM user_profiles WHERE id = ?;', sourceUserId);
    }

    result = { status: 'migrated', fromUserId: sourceUserId, toUserId: destinationUserId };
  });

  return result;
}

function parseMutationPayload(payload: string, mutationId: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(`Local sync mutation ${mutationId} has invalid JSON.`);
  }
}

function replaceUserIdentity(
  value: unknown,
  fromUserId: string,
  toUserId: string,
  parentKey?: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceUserIdentity(item, fromUserId, toUserId, parentKey));
  }
  if (!value || typeof value !== 'object') return value;

  const object = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(object).map(([key, child]) => {
      const shouldReplace =
        child === fromUserId && (key === 'userId' || (key === 'id' && parentKey === 'user'));
      return [
        key,
        shouldReplace ? toUserId : replaceUserIdentity(child, fromUserId, toUserId, key),
      ];
    }),
  );
}
