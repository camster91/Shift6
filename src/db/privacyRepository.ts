import type { SQLiteDatabase } from 'expo-sqlite';

export interface LocalDataExport {
  schemaVersion: 8;
  exportedAt: string;
  userId: string;
  userProfiles: Record<string, unknown>[];
  userEquipment: Record<string, unknown>[];
  userConsiderations: Record<string, unknown>[];
  bodyMetrics: Record<string, unknown>[];
  coachPrivacyPreferences: Record<string, unknown>[];
  trainingCycles: Record<string, unknown>[];
  workoutSessions: Record<string, unknown>[];
  completedSets: Record<string, unknown>[];
  workoutDrafts: Record<string, unknown>[];
  workoutCheckIns: Record<string, unknown>[];
  userPrograms: Record<string, unknown>[];
  userProgramVersions: Record<string, unknown>[];
  userExercises: Record<string, unknown>[];
  coachProposals: Record<string, unknown>[];
  healthSummaries: Record<string, unknown>[];
  notificationPreferences: Record<string, unknown>[];
  cycleReviews: Record<string, unknown>[];
  workoutScheduleOverrides: Record<string, unknown>[];
}

export async function exportLocalUserData(
  database: SQLiteDatabase,
  userId: string,
  exportedAt: string,
): Promise<LocalDataExport> {
  const userProfiles = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM user_profiles WHERE id = ?;',
    userId,
  );
  const userEquipment = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM user_equipment WHERE user_id = ? ORDER BY equipment_id;',
    userId,
  );
  const userConsiderations = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM user_considerations WHERE user_id = ?;',
    userId,
  );
  const bodyMetrics = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM body_metrics
      WHERE user_id = ?
      ORDER BY metric_type ASC, measured_at ASC, id ASC;`,
    userId,
  );
  const coachPrivacyPreferences = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM coach_privacy_preferences WHERE user_id = ?;',
    userId,
  );
  const trainingCycles = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM training_cycles WHERE user_id = ? ORDER BY started_at ASC, id ASC;',
    userId,
  );
  const workoutSessions = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM workout_sessions
      WHERE cycle_id IN (SELECT id FROM training_cycles WHERE user_id = ?)
      ORDER BY started_at ASC, id ASC;`,
    userId,
  );
  const completedSets = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM completed_sets
      WHERE session_id IN (
        SELECT workout_sessions.id
          FROM workout_sessions
          INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
         WHERE training_cycles.user_id = ?
      )
      ORDER BY completed_at ASC, id ASC;`,
    userId,
  );
  const workoutDrafts = await database.getAllAsync<Record<string, unknown>>(
    `SELECT workout_drafts.*
       FROM workout_drafts
       INNER JOIN workout_sessions ON workout_sessions.id = workout_drafts.session_id
       INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
      WHERE training_cycles.user_id = ?
      ORDER BY workout_drafts.updated_at ASC, workout_drafts.session_id ASC;`,
    userId,
  );
  const workoutCheckIns = await database.getAllAsync<Record<string, unknown>>(
    `SELECT workout_check_ins.*
       FROM workout_check_ins
       INNER JOIN workout_sessions ON workout_sessions.id = workout_check_ins.session_id
       INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
      WHERE training_cycles.user_id = ?
      ORDER BY workout_check_ins.updated_at ASC, workout_check_ins.session_id ASC;`,
    userId,
  );
  const userPrograms = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM user_programs WHERE user_id = ? ORDER BY id ASC;',
    userId,
  );
  const userProgramVersions = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM user_program_versions
      WHERE program_id IN (SELECT id FROM user_programs WHERE user_id = ?)
      ORDER BY program_id ASC, version ASC;`,
    userId,
  );
  const userExercises = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM user_exercises WHERE user_id = ? ORDER BY id ASC;',
    userId,
  );
  const coachProposals = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM coach_proposals WHERE user_id = ? ORDER BY created_at ASC, id ASC;',
    userId,
  );
  const healthSummaries = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM health_summaries
      WHERE user_id = ?
      ORDER BY start_at ASC, end_at ASC, source ASC, id ASC;`,
    userId,
  );
  const notificationPreferences = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM notification_preferences
      WHERE user_id = ?;`,
    userId,
  );
  const cycleReviews = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM cycle_reviews
      WHERE user_id = ?
      ORDER BY updated_at ASC, id ASC;`,
    userId,
  );
  const workoutScheduleOverrides = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM workout_schedule_overrides
      WHERE user_id = ?
      ORDER BY cycle_id ASC, cycle_week ASC, scheduled_date ASC, workout_id ASC;`,
    userId,
  );

  return {
    schemaVersion: 8,
    exportedAt,
    userId,
    userProfiles,
    userEquipment,
    userConsiderations,
    bodyMetrics,
    coachPrivacyPreferences,
    trainingCycles,
    workoutSessions,
    completedSets,
    workoutDrafts,
    workoutCheckIns,
    userPrograms,
    userProgramVersions,
    userExercises,
    coachProposals,
    healthSummaries,
    notificationPreferences,
    cycleReviews,
    workoutScheduleOverrides,
  };
}

/**
 * Deletes only local records owned by the requested user. The caller must obtain
 * explicit confirmation before invoking this operation and separately handle
 * remote account deletion when an account backend is connected.
 */
export async function deleteLocalUserData(database: SQLiteDatabase, userId: string): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `DELETE FROM sync_outbox
        WHERE (entity_type = 'profile' AND entity_id = ?)
           OR (entity_type = 'notification-preference' AND entity_id = ?)
           OR (entity_type = 'training-cycle' AND entity_id IN (
                SELECT id FROM training_cycles WHERE user_id = ?
              ))
           OR (entity_type = 'cycle-review' AND entity_id IN (
                SELECT id FROM cycle_reviews WHERE user_id = ?
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
           OR (entity_type = 'workout-check-in' AND entity_id IN (
                SELECT workout_check_ins.session_id
                  FROM workout_check_ins
                  INNER JOIN workout_sessions ON workout_sessions.id = workout_check_ins.session_id
                  INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
                 WHERE training_cycles.user_id = ?
              ))
           OR (entity_type = 'workout-schedule-override' AND entity_id IN (
                SELECT id FROM workout_schedule_overrides WHERE user_id = ?
              ));`,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
    );
    await database.runAsync('DELETE FROM notification_preferences WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM health_summaries WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM user_considerations WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM body_metrics WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM coach_privacy_preferences WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM cycle_reviews WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM workout_schedule_overrides WHERE user_id = ?;', userId);
    await database.runAsync(
      `DELETE FROM completed_sets
        WHERE session_id IN (
          SELECT workout_sessions.id
            FROM workout_sessions
            INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
           WHERE training_cycles.user_id = ?
        );`,
      userId,
    );
    await database.runAsync(
      `DELETE FROM workout_drafts
        WHERE session_id IN (
          SELECT workout_sessions.id
            FROM workout_sessions
            INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
           WHERE training_cycles.user_id = ?
        );`,
      userId,
    );
    await database.runAsync(
      `DELETE FROM workout_check_ins
        WHERE session_id IN (
          SELECT workout_sessions.id
            FROM workout_sessions
            INNER JOIN training_cycles ON training_cycles.id = workout_sessions.cycle_id
           WHERE training_cycles.user_id = ?
        );`,
      userId,
    );
    await database.runAsync(
      `DELETE FROM workout_sessions
        WHERE cycle_id IN (SELECT id FROM training_cycles WHERE user_id = ?);`,
      userId,
    );
    await database.runAsync('DELETE FROM training_cycles WHERE user_id = ?;', userId);
    await database.runAsync(
      `DELETE FROM user_program_versions
        WHERE program_id IN (SELECT id FROM user_programs WHERE user_id = ?);`,
      userId,
    );
    await database.runAsync('DELETE FROM user_programs WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM user_exercises WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM coach_proposals WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM user_equipment WHERE user_id = ?;', userId);
    await database.runAsync('DELETE FROM user_profiles WHERE id = ?;', userId);
  });
}
