import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  Text,
} from '../src/components/ui';
import {
  demoCycle,
  demoProgram,
  demoProgramVersion,
  demoWorkout,
} from '../src/domain/fixtures/home';
import { buildNextSessionTargets } from '../src/domain/nextSession';
import type {
  CompletedSet,
  SetTarget,
  TrainingCycle,
  WorkoutExercise,
  WorkoutSession,
} from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import {
  advanceTrainingCycleAfterCompletedWorkout,
  getActiveTrainingCycle,
} from '../src/db/cycleRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { getUserProgramVersion } from '../src/db/programRepository';
import { getLatestCompletedWorkoutSets } from '../src/db/progressRepository';
import {
  completeWorkoutSession,
  getCompletedSets,
  saveCompletedSet,
  saveWorkoutSession,
} from '../src/db/workoutRepository';
import { colors, radii, spacing } from '../src/design/tokens';

interface SetInputValues {
  load: string;
  reps: string;
  duration: string;
  distance: string;
  rpe: string;
  rir: string;
}

export default function ActiveWorkoutScreen() {
  const database = useLocalDatabase();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [activeCycle, setActiveCycle] = useState<TrainingCycle>(demoCycle);
  const [activeProgram, setActiveProgram] = useState(demoProgram);
  const [activeProgramVersion, setActiveProgramVersion] = useState(demoProgramVersion);
  const activeWorkout = useMemo(
    () =>
      activeProgramVersion.workouts.find((workout) => workout.id === workoutId) ??
      activeProgramVersion.workouts[0] ??
      demoWorkout,
    [activeProgramVersion, workoutId],
  );
  const [startedAt] = useState(() => new Date().toISOString());
  const [values, setValues] = useState<Record<string, SetInputValues>>(() =>
    buildInitialValues(activeWorkout),
  );
  const [targetOverrides, setTargetOverrides] = useState<Record<string, SetTarget>>({});
  const [completedSetKeys, setCompletedSetKeys] = useState<Set<string>>(() => new Set());
  const [loadingCycle, setLoadingCycle] = useState(database !== null);
  const [loadingSession, setLoadingSession] = useState(database !== null);
  const [savingSetKey, setSavingSetKey] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);

  const session = useMemo<WorkoutSession>(
    () => ({
      id: `session-${activeCycle.id}-week-${activeCycle.currentWeek}-${activeWorkout.id}`,
      cycleId: activeCycle.id,
      cycleWeek: activeCycle.currentWeek,
      workoutId: activeWorkout.id,
      programVersionId: activeWorkout.programVersionId,
      workoutFocus: activeWorkout.focus,
      status: 'in-progress',
      startedAt,
      isOffline: false,
    }),
    [activeCycle.id, activeCycle.currentWeek, activeWorkout, startedAt],
  );

  useEffect(() => {
    if (!database) {
      setLoadingCycle(false);
      return;
    }

    let active = true;
    void getActiveTrainingCycle(database, 'guest-user')
      .then(async (cycle) => {
        if (!active || !cycle) return;
        setActiveCycle(cycle);
        const snapshot = await getUserProgramVersion(
          database,
          'guest-user',
          cycle.programVersionId,
        );
        if (!active || !snapshot) return;
        setActiveProgram(snapshot.program);
        setActiveProgramVersion(snapshot.version);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingCycle(false);
      });

    return () => {
      active = false;
    };
  }, [database]);

  useEffect(() => {
    if (loadingCycle) return;
    if (!database) {
      setLoadingSession(false);
      return;
    }

    let active = true;
    void saveWorkoutSession(database, session)
      .then(async () => {
        const [completedSets, previousSets, profile] = await Promise.all([
          getCompletedSets(database, session.id),
          getLatestCompletedWorkoutSets(database, activeCycle.id, activeWorkout.id),
          getOnboardingProfile(database, 'guest-user'),
        ]);
        return {
          completedSets,
          previousSets,
          unitSystem: profile?.user.unitSystem ?? 'imperial',
        };
      })
      .then(({ completedSets, previousSets, unitSystem }) => {
        if (!active) return;
        setCompletedSetKeys(new Set(completedSets.map(completedSetKey)));
        const nextTargets =
          previousSets.length > 0
            ? buildNextSessionTargets(
                activeWorkout,
                activeProgram.progressionStrategy,
                previousSets,
                unitSystem,
              )
            : [];
        const overrides = Object.fromEntries(
          nextTargets.map((target) => [target.workoutExerciseId, target.decision.nextTarget]),
        );
        setTargetOverrides(overrides);
        setValues((current) => mergeInitialValues(activeWorkout, overrides, current));
      })
      .catch(() => {
        if (active) setError('We could not load this workout from local storage.');
      })
      .finally(() => {
        if (active) setLoadingSession(false);
      });

    return () => {
      active = false;
    };
  }, [activeCycle.id, activeWorkout, database, loadingCycle, session]);

  useEffect(() => {
    if (restEndsAt === null) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setRestSecondsRemaining(remaining);
      if (remaining === 0) setRestEndsAt(null);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [restEndsAt]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && restEndsAt !== null) {
        setRestSecondsRemaining(Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000)));
      }
    });

    return () => subscription.remove();
  }, [restEndsAt]);

  const totalSets = activeWorkout.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
  const completedCount = completedSetKeys.size;
  const allSetsComplete = completedCount >= totalSets;

  const updateValue = (key: string, field: keyof SetInputValues, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: { ...(current[key] ?? emptySetInput()), [field]: value },
    }));
    setError(null);
  };

  const handleCompleteSet = async (workoutExercise: WorkoutExercise, setNumber: number) => {
    const key = setKey(workoutExercise.id, setNumber);
    if (completedSetKeys.has(key) || savingSetKey) return;

    const target =
      targetOverrides[workoutExercise.id] ?? workoutExercise.sets[setNumber - 1]?.target;
    const input = values[key] ?? emptySetInput(target);
    const reps = parseNumber(input.reps);
    const durationSeconds = parseNumber(input.duration);
    const distanceMeters = parseNumber(input.distance);
    if (target?.reps !== undefined && reps === undefined) {
      setError(`Enter the reps completed for set ${setNumber} before marking it complete.`);
      return;
    }

    const completedSet: CompletedSet = {
      id: `completed-${session.id}-${key}`,
      sessionId: session.id,
      workoutExerciseId: workoutExercise.id,
      setNumber,
      load: parseNumber(input.load),
      reps,
      durationSeconds,
      distanceMeters,
      rpe: parseNumber(input.rpe),
      rir: parseNumber(input.rir),
      completedAt: new Date().toISOString(),
      idempotencyKey: `${session.id}:${workoutExercise.id}:${setNumber}`,
    };

    setSavingSetKey(key);
    setError(null);
    try {
      if (database) await saveCompletedSet(database, completedSet);
      setCompletedSetKeys((current) => new Set(current).add(key));
      const restSeconds = workoutExercise.sets[setNumber - 1]?.restSeconds ?? 90;
      setRestEndsAt(Date.now() + restSeconds * 1000);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'We could not save this set locally.',
      );
    } finally {
      setSavingSetKey(null);
    }
  };

  const handleFinishWorkout = async () => {
    if (!allSetsComplete || finishing) return;

    setFinishing(true);
    setError(null);
    try {
      if (database) await completeWorkoutSession(database, session.id, new Date().toISOString());
      if (database) {
        await advanceTrainingCycleAfterCompletedWorkout(
          database,
          session.cycleId,
          session.cycleWeek,
        );
      }
      router.replace('/');
    } catch (finishError) {
      setError(
        finishError instanceof Error ? finishError.message : 'We could not finish this workout.',
      );
    } finally {
      setFinishing(false);
    }
  };

  if (loadingCycle || loadingSession) {
    return (
      <Screen contentContainerStyle={styles.loadingContent}>
        <LoadingSkeleton width={44} height={44} />
        <LoadingSkeleton height={52} style={styles.loadingTitle} />
        <LoadingSkeleton height={112} style={styles.loadingCard} />
        <LoadingSkeleton height={160} style={styles.loadingCard} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Home"
          onPress={() => router.back()}
        />
        <View style={styles.headerCopy}>
          <Text variant="caption" tone="muted">
            ACTIVE WORKOUT
          </Text>
          <Text variant="smallMedium">
            {completedCount} of {totalSets} sets
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {activeWorkout.title}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Complete each set when it is done. Your device saves the set before the button changes
        state.
      </Text>

      <Card tone={database ? 'mint' : 'yellow'} style={styles.localFirstCard}>
        <View style={styles.localFirstHeader}>
          <Ionicons
            name={database ? 'phone-portrait-outline' : 'desktop-outline'}
            size={22}
            color={colors.ink}
          />
          <Text variant="smallMedium">{database ? 'Local-first workout' : 'Web preview'}</Text>
        </View>
        <Text variant="small" tone="muted" style={styles.localFirstText}>
          {database
            ? 'Set completion is persisted to SQLite and queued for future sync. Network availability is not required here.'
            : 'Native SQLite is not active in this preview. Set state is kept in memory for this browser session.'}
        </Text>
      </Card>

      {restSecondsRemaining > 0 ? (
        <Card
          tone="ink"
          style={styles.timerCard}
          accessibilityLabel={`Rest timer: ${formatTimer(restSecondsRemaining)}`}
        >
          <View>
            <Text variant="caption" tone="inverse">
              REST TIMER
            </Text>
            <Text variant="h1" tone="inverse">
              {formatTimer(restSecondsRemaining)}
            </Text>
          </View>
          <Button label="Skip rest" variant="ghost" onPress={() => setRestEndsAt(null)} />
        </Card>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      {activeWorkout.exercises.map((workoutExercise) => (
        <Card key={workoutExercise.id} tone="white" style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNumber}>
              <Text variant="smallMedium">{workoutExercise.order}</Text>
            </View>
            <View style={styles.exerciseCopy}>
              <Text variant="h3">{formatExerciseName(workoutExercise.exerciseId)}</Text>
              <Text variant="small" tone="muted">
                {workoutExercise.sets.length} sets ·{' '}
                {targetSummary(workoutExercise.sets[0]?.target)}
              </Text>
            </View>
          </View>
          <View style={styles.setList}>
            {workoutExercise.sets.map((workoutSet) => {
              const key = setKey(workoutExercise.id, workoutSet.setNumber);
              const completed = completedSetKeys.has(key);
              return (
                <View key={workoutSet.id} style={styles.setRow}>
                  <View style={styles.setLabel}>
                    <Text variant="smallMedium">Set {workoutSet.setNumber}</Text>
                    <Text variant="caption" tone="muted">
                      {targetSummary(targetOverrides[workoutExercise.id] ?? workoutSet.target)}
                    </Text>
                  </View>
                  <TextInput
                    accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId)} set ${workoutSet.setNumber} load`}
                    editable={!completed}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => updateValue(key, 'load', value)}
                    placeholder="Load"
                    placeholderTextColor={colors.inkMuted}
                    style={styles.valueInput}
                    value={values[key]?.load ?? ''}
                  />
                  <TextInput
                    accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId)} set ${workoutSet.setNumber} reps`}
                    editable={!completed}
                    keyboardType="number-pad"
                    onChangeText={(value) => updateValue(key, 'reps', value)}
                    placeholder="Reps"
                    placeholderTextColor={colors.inkMuted}
                    style={styles.valueInput}
                    value={values[key]?.reps ?? ''}
                  />
                  <Button
                    label={completed ? 'Done' : 'Complete'}
                    variant={completed ? 'secondary' : 'primary'}
                    disabled={completed}
                    loading={savingSetKey === key}
                    onPress={() => handleCompleteSet(workoutExercise, workoutSet.setNumber)}
                    style={styles.completeButton}
                  />
                </View>
              );
            })}
          </View>
        </Card>
      ))}

      <Button
        label="Finish workout"
        onPress={handleFinishWorkout}
        disabled={!allSetsComplete}
        loading={finishing}
        icon={<Ionicons name="checkmark" size={18} color={colors.white} />}
        style={styles.finishButton}
        accessibilityHint={
          allSetsComplete ? 'Saves the completed workout locally' : 'Complete every set first'
        }
      />
    </Screen>
  );
}

function buildInitialValues(
  workout: typeof demoWorkout,
  targetOverrides: Record<string, SetTarget> = {},
): Record<string, SetInputValues> {
  return Object.fromEntries(
    workout.exercises.flatMap((exercise) =>
      exercise.sets.map((workoutSet) => [
        setKey(exercise.id, workoutSet.setNumber),
        emptySetInput(targetOverrides[exercise.id] ?? workoutSet.target),
      ]),
    ),
  );
}

function mergeInitialValues(
  workout: typeof demoWorkout,
  targetOverrides: Record<string, SetTarget>,
  current: Record<string, SetInputValues>,
): Record<string, SetInputValues> {
  const initial = buildInitialValues(workout, targetOverrides);
  return Object.fromEntries(
    Object.entries(initial).map(([key, suggested]) => {
      const existing = current[key];
      if (!existing) return [key, suggested];

      return [
        key,
        {
          load: existing.load || suggested.load,
          reps: existing.reps || suggested.reps,
          duration: existing.duration || suggested.duration,
          distance: existing.distance || suggested.distance,
          rpe: existing.rpe || suggested.rpe,
          rir: existing.rir || suggested.rir,
        },
      ];
    }),
  );
}

function emptySetInput(target?: SetTarget): SetInputValues {
  const reps = typeof target?.reps === 'number' ? String(target.reps) : '';
  const load = target?.load?.value !== undefined ? String(target.load.value) : '';
  const duration = target?.durationSeconds !== undefined ? String(target.durationSeconds) : '';
  const distance = target?.distanceMeters !== undefined ? String(target.distanceMeters) : '';
  const rpe = target?.rpe !== undefined ? String(target.rpe) : '';
  const rir = target?.rir !== undefined ? String(target.rir) : '';
  return { load, reps, duration, distance, rpe, rir };
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function setKey(workoutExerciseId: string, setNumber: number): string {
  return `${workoutExerciseId}:${setNumber}`;
}

function completedSetKey(completedSet: CompletedSet): string {
  return setKey(completedSet.workoutExerciseId, completedSet.setNumber);
}

function targetSummary(target?: SetTarget): string {
  if (!target) return 'Target not set';
  const reps =
    typeof target.reps === 'number'
      ? `${target.reps} reps`
      : target.reps
        ? `${target.reps.min}–${target.reps.max} reps`
        : undefined;
  const duration = target.durationSeconds ? `${target.durationSeconds}s` : undefined;
  const distance = target.distanceMeters ? `${target.distanceMeters}m` : undefined;
  const load =
    target.load?.value !== undefined
      ? `${target.load.value} ${target.load.unit === 'imperial' ? 'lb' : 'kg'}`
      : undefined;
  const effort =
    target.rir !== undefined ? `${target.rir} RIR` : target.rpe ? `RPE ${target.rpe}` : undefined;
  return [load, reps, duration, distance, effort].filter(Boolean).join(' · ') || 'Open target';
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatExerciseName(exerciseId: string) {
  return exerciseId
    .replace('exercise-', '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  loadingContent: {
    paddingTop: spacing.xxxl,
  },
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    marginTop: spacing.xxxl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  localFirstCard: {
    marginTop: spacing.xl,
  },
  localFirstHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  localFirstText: {
    marginTop: spacing.sm,
  },
  timerCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseNumber: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.lavenderBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  setList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  setLabel: {
    flex: 1,
    gap: spacing.xxs,
  },
  valueInput: {
    width: 74,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.canvas,
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
  },
  completeButton: {
    minWidth: 88,
    paddingHorizontal: spacing.sm,
  },
  finishButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
