import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  OfflineBanner,
  Screen,
  Text,
} from '../src/components/ui';
import { equipmentCatalog, findExerciseSubstitutions } from '../src/domain/equipment';
import {
  demoCycle,
  demoProgram,
  demoProgramVersion,
  demoUser,
  demoWorkout,
} from '../src/domain/fixtures/home';
import { foundationalExercises } from '../src/domain/fixtures/exercises';
import { buildNextSessionTargets } from '../src/domain/nextSession';
import { resolveTrackingType } from '../src/domain/exerciseTracking';
import {
  createProgramVersionRevision,
  replaceExerciseInWorkout,
} from '../src/domain/programBuilder';
import type {
  CompletedSet,
  Exercise,
  SetTarget,
  TrainingCycle,
  WorkoutDraftSetValues,
  Workout,
  WorkoutExercise,
  WorkoutReadiness,
  WorkoutSession,
} from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { getActiveTrainingCycle, saveTrainingCycle } from '../src/db/cycleRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import {
  getUserExercises,
  getUserProgramVersion,
  saveProgramVersion,
} from '../src/db/programRepository';
import { getLatestCompletedWorkoutSets } from '../src/db/progressRepository';
import {
  completeWorkoutSessionAndAdvanceCycle,
  getCompletedSets,
  getInProgressWorkoutSession,
  getWorkoutDraft,
  saveCompletedSet,
  saveWorkoutDraft,
  saveWorkoutSession,
  updateWorkoutSessionReadiness,
  updateWorkoutSessionProgramVersion,
  updateCompletedSet,
} from '../src/db/workoutRepository';
import { colors, radii, spacing } from '../src/design/tokens';
import { connectivityStatusFromNetworkState } from '../src/services/connectivity';
import * as Network from 'expo-network';
import type { ConnectivityStatus } from '../src/services/syncCoordinator';

type SetInputValues = WorkoutDraftSetValues;

export default function ActiveWorkoutScreen() {
  const database = useLocalDatabase();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [activeCycle, setActiveCycle] = useState<TrainingCycle>(demoCycle);
  const [activeProgram, setActiveProgram] = useState(demoProgram);
  const [activeProgramVersion, setActiveProgramVersion] = useState(demoProgramVersion);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState(demoUser.equipmentIds);
  const availableExercises = useMemo(
    () => [...foundationalExercises, ...customExercises],
    [customExercises],
  );
  const activeWorkout = useMemo(
    () =>
      activeProgramVersion.workouts.find((workout) => workout.id === workoutId) ??
      activeProgramVersion.workouts[0] ??
      demoWorkout,
    [activeProgramVersion, workoutId],
  );
  const [startedAt] = useState(() => new Date().toISOString());
  const [resumedSession, setResumedSession] = useState<WorkoutSession | null>(null);
  const [values, setValues] = useState<Record<string, SetInputValues>>(() =>
    buildInitialValues(activeWorkout),
  );
  const [targetOverrides, setTargetOverrides] = useState<Record<string, SetTarget>>({});
  const [completedSetKeys, setCompletedSetKeys] = useState<Set<string>>(() => new Set());
  const [editingSetKey, setEditingSetKey] = useState<string | null>(null);
  const [substitutionFor, setSubstitutionFor] = useState<string | null>(null);
  const [loadingCycle, setLoadingCycle] = useState(database !== null);
  const [loadingSession, setLoadingSession] = useState(database !== null);
  const [draftReady, setDraftReady] = useState(database === null);
  const [savingSetKey, setSavingSetKey] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>('unknown');
  const [readiness, setReadiness] = useState<WorkoutReadiness | null>(null);
  const [readinessSaving, setReadinessSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void Network.getNetworkStateAsync()
      .then((state) => {
        if (active) setConnectivity(connectivityStatusFromNetworkState(state));
      })
      .catch(() => {
        if (active) setConnectivity('unknown');
      });
    const subscription = Network.addNetworkStateListener((state) => {
      if (active) setConnectivity(connectivityStatusFromNetworkState(state));
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setResumedSession(null);
    setCustomExercises([]);
    setValues(buildInitialValues(activeWorkout));
    setTargetOverrides({});
    setCompletedSetKeys(new Set());
    setEditingSetKey(null);
    setSubstitutionFor(null);
    setReadiness(null);
    setLoadingSession(database !== null);
    setDraftReady(database === null);
  }, [activeWorkout.id, database]);

  const proposedSession = useMemo<WorkoutSession>(
    () => ({
      id: buildWorkoutSessionId(
        activeCycle.id,
        activeCycle.currentWeek,
        activeWorkout.id,
        startedAt,
      ),
      cycleId: activeCycle.id,
      cycleWeek: activeCycle.currentWeek,
      workoutId: activeWorkout.id,
      programVersionId: activeWorkout.programVersionId,
      workoutFocus: activeWorkout.focus,
      status: 'in-progress',
      startedAt,
      isOffline: connectivity === 'offline',
      readiness: readiness ?? undefined,
    }),
    [activeCycle.id, activeCycle.currentWeek, activeWorkout, connectivity, readiness, startedAt],
  );
  const session = resumedSession ?? proposedSession;

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
      setDraftReady(true);
      return;
    }

    let active = true;
    void getInProgressWorkoutSession(
      database,
      activeCycle.id,
      activeCycle.currentWeek,
      activeWorkout.id,
    )
      .then(async (existingSession) => {
        const sessionToUse = existingSession ?? session;
        if (existingSession && existingSession.id !== session.id) {
          setResumedSession(existingSession);
        }
        await saveWorkoutSession(database, sessionToUse);
        const [completedSets, previousSets, profile, draft, userExercises] = await Promise.all([
          getCompletedSets(database, sessionToUse.id),
          getLatestCompletedWorkoutSets(
            database,
            activeCycle.id,
            activeWorkout.id,
            activeProgramVersion.id,
          ),
          getOnboardingProfile(database, 'guest-user'),
          getWorkoutDraft(database, sessionToUse.id),
          getUserExercises(database, 'guest-user'),
        ]);
        return {
          completedSets,
          previousSets,
          unitSystem: profile?.user.unitSystem ?? 'imperial',
          equipmentIds: profile?.user.equipmentIds ?? demoUser.equipmentIds,
          readiness: sessionToUse.readiness,
          draft,
          userExercises,
        };
      })
      .then(
        ({
          completedSets,
          previousSets,
          unitSystem,
          equipmentIds,
          readiness,
          draft,
          userExercises,
        }) => {
          if (!active) return;
          setCustomExercises(userExercises);
          setAvailableEquipmentIds(equipmentIds);
          setReadiness(readiness ?? null);
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
          setValues((current) =>
            mergeDraftValues(
              mergeCompletedSetValues(
                mergeInitialValues(activeWorkout, overrides, current),
                completedSets,
              ),
              draft,
            ),
          );
          setDraftReady(true);
        },
      )
      .catch(() => {
        if (active) setError('We could not load this workout from local storage.');
      })
      .finally(() => {
        if (active) setLoadingSession(false);
      });

    return () => {
      active = false;
    };
  }, [activeCycle.currentWeek, activeCycle.id, activeWorkout, database, loadingCycle, session]);

  useEffect(() => {
    if (!database || !draftReady) return;

    const timeout = setTimeout(() => {
      void saveWorkoutDraft(database, session.id, values, new Date().toISOString()).catch(() => {
        setError('We could not save the unfinished workout locally.');
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [database, draftReady, session.id, values]);

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
    const alreadyCompleted = completedSetKeys.has(key);
    const editing = editingSetKey === key;
    if ((alreadyCompleted && !editing) || savingSetKey) return;

    const target =
      targetOverrides[workoutExercise.id] ?? workoutExercise.sets[setNumber - 1]?.target;
    const input = values[key] ?? emptySetInput(target);
    const reps = parseNumber(input.reps);
    const durationSeconds = parseNumber(input.duration);
    const distanceMeters = parseNumber(input.distance);
    const trackingType = getTrackingType(workoutExercise.exerciseId, target, availableExercises);
    if (target?.reps !== undefined && reps === undefined) {
      setError(`Enter the reps completed for set ${setNumber} before marking it complete.`);
      return;
    }
    if (requiresDuration(trackingType, target) && durationSeconds === undefined) {
      setError(`Enter the time completed for set ${setNumber} before marking it complete.`);
      return;
    }
    if (requiresDistance(trackingType, target) && distanceMeters === undefined) {
      setError(`Enter the distance completed for set ${setNumber} before marking it complete.`);
      return;
    }

    const completedSet: CompletedSet = {
      id: `completed-${session.id}-${key}`,
      sessionId: session.id,
      workoutExerciseId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
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
      if (database) {
        const result = alreadyCompleted
          ? await updateCompletedSet(database, completedSet)
          : await saveCompletedSet(database, completedSet);
        if (alreadyCompleted && result === 'missing') {
          throw new Error('This completed set is no longer available locally.');
        }
      }
      setCompletedSetKeys((current) => new Set(current).add(key));
      if (editing) {
        setEditingSetKey(null);
      } else {
        const restSeconds = workoutExercise.sets[setNumber - 1]?.restSeconds ?? 90;
        setRestEndsAt(Date.now() + restSeconds * 1000);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'We could not save this set locally.',
      );
    } finally {
      setSavingSetKey(null);
    }
  };

  const handlePauseWorkout = async () => {
    if (database) {
      try {
        await saveWorkoutDraft(database, session.id, values, new Date().toISOString());
      } catch {
        setError('We could not save the unfinished workout locally.');
        return;
      }
    }
    router.back();
  };

  const handleReadinessChange = async (nextReadiness: WorkoutReadiness) => {
    if (readinessSaving || readiness === nextReadiness) return;

    const previousReadiness = readiness;
    setReadiness(nextReadiness);
    setError(null);
    if (!database) return;

    setReadinessSaving(true);
    try {
      const updatedSession = await updateWorkoutSessionReadiness(
        database,
        session.id,
        nextReadiness,
      );
      if (!updatedSession) throw new Error('This workout session is no longer active locally.');
      setResumedSession(updatedSession);
    } catch (readinessError) {
      setReadiness(previousReadiness);
      setError(
        readinessError instanceof Error
          ? readinessError.message
          : 'We could not save your readiness locally.',
      );
    } finally {
      setReadinessSaving(false);
    }
  };

  const handleSubstituteExercise = async (
    workoutExercise: WorkoutExercise,
    replacementExerciseId: string,
  ) => {
    if (
      workoutExercise.sets.some((set) =>
        completedSetKeys.has(setKey(workoutExercise.id, set.setNumber)),
      )
    ) {
      setError(
        'Finish or keep this movement before substituting it so completed history stays clear.',
      );
      return;
    }

    setError(null);
    try {
      const replacedVersion = replaceExerciseInWorkout(
        activeProgramVersion,
        activeWorkout.id,
        workoutExercise.id,
        replacementExerciseId,
      );
      const createdAt = new Date().toISOString();
      const nextVersion = createProgramVersionRevision(
        replacedVersion,
        `${activeProgramVersion.id}-revision-${Date.now()}`,
        createdAt,
      );
      const nextProgram = { ...activeProgram, currentVersionId: nextVersion.id };
      const nextCycle = { ...activeCycle, programVersionId: nextVersion.id };
      if (database) {
        await saveProgramVersion(database, 'guest-user', nextProgram, nextVersion);
        await saveTrainingCycle(database, nextCycle);
        const updatedSession = await updateWorkoutSessionProgramVersion(
          database,
          session.id,
          nextVersion.id,
        );
        if (updatedSession) setResumedSession(updatedSession);
      }
      setActiveProgram(nextProgram);
      setActiveProgramVersion(nextVersion);
      setActiveCycle(nextCycle);
      setSubstitutionFor(null);
    } catch (substitutionError) {
      setError(
        substitutionError instanceof Error
          ? substitutionError.message
          : 'We could not apply this substitution.',
      );
    }
  };

  const handleFinishWorkout = async () => {
    if (!allSetsComplete || finishing) return;

    setFinishing(true);
    setError(null);
    try {
      if (database)
        await completeWorkoutSessionAndAdvanceCycle(database, session.id, new Date().toISOString());
      router.replace({
        pathname: '/summary',
        params: { sessionId: session.id, workoutId: activeWorkout.id },
      });
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
          onPress={() => void handlePauseWorkout()}
        />
        <View style={styles.headerCopy}>
          <Text variant="caption" tone="muted">
            ACTIVE WORKOUT
          </Text>
          <Text variant="smallMedium">
            {completedCount} of {totalSets} sets
          </Text>
        </View>
        <Button label="Pause" variant="ghost" onPress={() => void handlePauseWorkout()} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {activeWorkout.title}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Complete each set when it is done. Your device saves the set before the button changes
        state.
      </Text>

      {connectivity === 'offline' ? <OfflineBanner status="offline" /> : null}

      <WorkoutPreflight
        workout={activeWorkout}
        availableEquipmentIds={availableEquipmentIds}
        hasLocalDatabase={database !== null}
        readiness={readiness}
        saving={readinessSaving}
        onReadinessChange={(nextReadiness) => void handleReadinessChange(nextReadiness)}
      />

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

      {activeWorkout.exercises.map((workoutExercise) => {
        const exerciseName = formatExerciseName(workoutExercise.exerciseId, availableExercises);
        const sourceExercise = foundationalExercises.find(
          (candidate) => candidate.id === workoutExercise.exerciseId,
        );
        const substitutions = sourceExercise
          ? findExerciseSubstitutions(
              sourceExercise,
              foundationalExercises,
              availableEquipmentIds,
              3,
            )
          : [];

        return (
          <Card key={workoutExercise.id} tone="white" style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseNumber}>
                <Text variant="smallMedium">{workoutExercise.order}</Text>
              </View>
              <View style={styles.exerciseCopy}>
                <Text variant="h3">{exerciseName}</Text>
                <Text variant="small" tone="muted">
                  {workoutExercise.sets.length} sets ·{' '}
                  {targetSummary(workoutExercise.sets[0]?.target)}
                </Text>
              </View>
              {substitutions.length > 0 ? (
                <Button
                  label={substitutionFor === workoutExercise.id ? 'Close' : 'Substitute'}
                  variant="ghost"
                  onPress={() =>
                    setSubstitutionFor((current) =>
                      current === workoutExercise.id ? null : workoutExercise.id,
                    )
                  }
                  accessibilityHint="Available before completing a set so workout history stays clear"
                  style={styles.substitutionToggle}
                />
              ) : null}
            </View>
            {substitutionFor === workoutExercise.id ? (
              <Card
                tone="lavender"
                style={styles.substitutionCard}
                accessibilityLabel={`${exerciseName} substitution options`}
              >
                <Text variant="smallMedium">Equipment-compatible options</Text>
                <Text variant="caption" tone="muted">
                  Choose before completing this movement. The current set prescription is kept.
                </Text>
                {substitutions.map((candidate) => (
                  <Button
                    key={candidate.id}
                    label={`Use ${candidate.name}`}
                    variant="ghost"
                    onPress={() => void handleSubstituteExercise(workoutExercise, candidate.id)}
                    style={styles.substitutionButton}
                  />
                ))}
              </Card>
            ) : null}
            <View style={styles.setList}>
              {workoutExercise.sets.map((workoutSet) => {
                const key = setKey(workoutExercise.id, workoutSet.setNumber);
                const completed = completedSetKeys.has(key);
                const editing = editingSetKey === key;
                return (
                  <View key={workoutSet.id} style={styles.setRow}>
                    <View style={styles.setLabel}>
                      <Text variant="smallMedium">Set {workoutSet.setNumber}</Text>
                      <Text variant="caption" tone="muted">
                        {targetSummary(targetOverrides[workoutExercise.id] ?? workoutSet.target)}
                      </Text>
                    </View>
                    {showsLoad(
                      workoutExercise.exerciseId,
                      workoutSet.target,
                      availableExercises,
                    ) ? (
                      <TextInput
                        accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} load`}
                        editable={!completed || editing}
                        keyboardType="decimal-pad"
                        onChangeText={(value) => updateValue(key, 'load', value)}
                        placeholder="Load"
                        placeholderTextColor={colors.inkMuted}
                        style={styles.valueInput}
                        value={values[key]?.load ?? ''}
                      />
                    ) : null}
                    {showsReps(
                      workoutExercise.exerciseId,
                      workoutSet.target,
                      availableExercises,
                    ) ? (
                      <TextInput
                        accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} reps`}
                        editable={!completed || editing}
                        keyboardType="number-pad"
                        onChangeText={(value) => updateValue(key, 'reps', value)}
                        placeholder="Reps"
                        placeholderTextColor={colors.inkMuted}
                        style={styles.valueInput}
                        value={values[key]?.reps ?? ''}
                      />
                    ) : null}
                    {showsDuration(
                      workoutExercise.exerciseId,
                      workoutSet.target,
                      availableExercises,
                    ) ? (
                      <TextInput
                        accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} duration in seconds`}
                        editable={!completed || editing}
                        keyboardType="number-pad"
                        onChangeText={(value) => updateValue(key, 'duration', value)}
                        placeholder="Seconds"
                        placeholderTextColor={colors.inkMuted}
                        style={styles.valueInput}
                        value={values[key]?.duration ?? ''}
                      />
                    ) : null}
                    {showsDistance(
                      workoutExercise.exerciseId,
                      workoutSet.target,
                      availableExercises,
                    ) ? (
                      <TextInput
                        accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} distance in meters`}
                        editable={!completed || editing}
                        keyboardType="decimal-pad"
                        onChangeText={(value) => updateValue(key, 'distance', value)}
                        placeholder="Meters"
                        placeholderTextColor={colors.inkMuted}
                        style={styles.valueInput}
                        value={values[key]?.distance ?? ''}
                      />
                    ) : null}
                    <Button
                      label={completed ? (editing ? 'Save' : 'Edit') : 'Complete'}
                      variant={completed && !editing ? 'secondary' : 'primary'}
                      disabled={completed && !editing}
                      loading={savingSetKey === key}
                      onPress={
                        completed && !editing
                          ? () => setEditingSetKey(key)
                          : () => handleCompleteSet(workoutExercise, workoutSet.setNumber)
                      }
                      style={styles.completeButton}
                    />
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })}

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

interface WorkoutPreflightProps {
  workout: Workout;
  availableEquipmentIds: readonly string[];
  hasLocalDatabase: boolean;
  readiness: WorkoutReadiness | null;
  saving: boolean;
  onReadinessChange: (readiness: WorkoutReadiness) => void;
}

function WorkoutPreflight({
  workout,
  availableEquipmentIds,
  hasLocalDatabase,
  readiness,
  saving,
  onReadinessChange,
}: WorkoutPreflightProps) {
  const requiredEquipment = equipmentCatalog.filter((equipment) =>
    workout.equipmentIds.includes(equipment.id),
  );
  const missingEquipment = requiredEquipment.filter(
    (equipment) => !availableEquipmentIds.includes(equipment.id),
  );
  const readinessOptions: readonly { value: WorkoutReadiness; label: string }[] = [
    { value: 'ready', label: 'Ready to train' },
    { value: 'limited', label: 'Limited today' },
    { value: 'rest', label: 'I need rest' },
  ];

  return (
    <Card tone="lavender" style={styles.preflightCard} accessibilityLabel="Workout preflight">
      <View style={styles.preflightHeader}>
        <View style={styles.preflightIcon}>
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.ink} />
        </View>
        <View style={styles.preflightCopy}>
          <Text variant="caption" tone="muted">
            WORKOUT PREFLIGHT
          </Text>
          <Text variant="h3">Set your context.</Text>
        </View>
      </View>
      <Text variant="small" tone="muted" style={styles.preflightSummary}>
        {workout.estimatedDurationMinutes} min · {workout.exercises.length} movements
      </Text>
      <Text variant="smallMedium" style={styles.preflightLabel}>
        Equipment check
      </Text>
      <Text variant="small" tone="muted">
        {requiredEquipment.length === 0
          ? 'No equipment required.'
          : missingEquipment.length === 0
            ? `Ready with ${requiredEquipment.map((equipment) => equipment.name).join(', ')}.`
            : `Missing ${missingEquipment.map((equipment) => equipment.name).join(', ')}. Use a substitution below if needed.`}
      </Text>
      <Text variant="smallMedium" style={styles.preflightLabel}>
        How are you feeling?
      </Text>
      <View style={styles.readinessOptions} accessibilityRole="radiogroup">
        {readinessOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={readiness === option.value}
            onPress={() => onReadinessChange(option.value)}
          />
        ))}
      </View>
      <Text variant="caption" tone="muted" style={styles.preflightNote}>
        {saving
          ? 'Saving your answer locally…'
          : readiness
            ? hasLocalDatabase
              ? 'This context is saved with the workout session. It does not change your plan.'
              : 'This context is kept in the browser preview for this session. It does not change your plan.'
            : 'Optional context for this session. Workout logging stays available either way.'}
      </Text>
    </Card>
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

function mergeCompletedSetValues(
  initial: Record<string, SetInputValues>,
  completedSets: readonly CompletedSet[],
): Record<string, SetInputValues> {
  const completedByKey = new Map(
    completedSets.map((completedSet) => [completedSetKey(completedSet), completedSet]),
  );

  return Object.fromEntries(
    Object.entries(initial).map(([key, values]) => {
      const completedSet = completedByKey.get(key);
      if (!completedSet) return [key, values];

      return [
        key,
        {
          ...values,
          load: valueOrEmpty(completedSet.load),
          reps: valueOrEmpty(completedSet.reps),
          duration: valueOrEmpty(completedSet.durationSeconds),
          distance: valueOrEmpty(completedSet.distanceMeters),
          rpe: valueOrEmpty(completedSet.rpe),
          rir: valueOrEmpty(completedSet.rir),
        },
      ];
    }),
  );
}

function mergeDraftValues(
  initial: Record<string, SetInputValues>,
  draft: Record<string, SetInputValues> | null,
): Record<string, SetInputValues> {
  if (!draft) return initial;

  return Object.fromEntries(
    Object.entries(initial).map(([key, values]) => [key, { ...values, ...(draft[key] ?? {}) }]),
  );
}

function valueOrEmpty(value: number | undefined): string {
  return value === undefined ? '' : String(value);
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

function buildWorkoutSessionId(
  cycleId: string,
  cycleWeek: number,
  workoutId: string,
  startedAt: string,
): string {
  const attempt = startedAt.replace(/[^0-9]/g, '');
  return `session-${cycleId}-week-${cycleWeek}-${workoutId}-${attempt}`;
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

function formatExerciseName(
  exerciseId: string,
  exercises: readonly Exercise[] = foundationalExercises,
) {
  const exercise = exercises.find((candidate) => candidate.id === exerciseId);
  if (exercise) return exercise.name;

  return exerciseId
    .replace('exercise-', '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getTrackingType(
  exerciseId: string,
  target: SetTarget | undefined,
  exercises: readonly Exercise[],
) {
  return resolveTrackingType(exerciseId, target, exercises);
}

function showsLoad(
  exerciseId: string,
  target: SetTarget | undefined,
  exercises: readonly Exercise[],
): boolean {
  const trackingType = getTrackingType(exerciseId, target, exercises);
  return trackingType === 'reps' || trackingType === 'custom';
}

function showsReps(exerciseId: string, target: SetTarget, exercises: readonly Exercise[]): boolean {
  return getTrackingType(exerciseId, target, exercises) === 'reps' || target.reps !== undefined;
}

function showsDuration(
  exerciseId: string,
  target: SetTarget,
  exercises: readonly Exercise[],
): boolean {
  const trackingType = getTrackingType(exerciseId, target, exercises);
  return (
    trackingType === 'time' ||
    trackingType === 'duration-and-distance' ||
    target.durationSeconds !== undefined
  );
}

function showsDistance(
  exerciseId: string,
  target: SetTarget,
  exercises: readonly Exercise[],
): boolean {
  const trackingType = getTrackingType(exerciseId, target, exercises);
  return (
    trackingType === 'distance' ||
    trackingType === 'duration-and-distance' ||
    target.distanceMeters !== undefined
  );
}

function requiresDuration(
  trackingType: ReturnType<typeof getTrackingType>,
  target: SetTarget | undefined,
): boolean {
  return (
    trackingType === 'time' ||
    trackingType === 'duration-and-distance' ||
    target?.durationSeconds !== undefined
  );
}

function requiresDistance(
  trackingType: ReturnType<typeof getTrackingType>,
  target: SetTarget | undefined,
): boolean {
  return (
    trackingType === 'distance' ||
    trackingType === 'duration-and-distance' ||
    target?.distanceMeters !== undefined
  );
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
  preflightCard: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  preflightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preflightIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preflightCopy: {
    gap: spacing.xxs,
  },
  preflightSummary: {
    marginTop: spacing.xs,
  },
  preflightLabel: {
    marginTop: spacing.sm,
  },
  readinessOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  preflightNote: {
    marginTop: spacing.xs,
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
    alignItems: 'flex-start',
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
  substitutionToggle: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  substitutionCard: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  substitutionButton: {
    alignSelf: 'stretch',
    minHeight: 44,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
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
