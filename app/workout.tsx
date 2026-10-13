import {
  actualLoadUnit,
  convertLoad,
  formatActualLoad,
  type LoadUnit,
} from '../src/domain/loadUnits';
import {
  buildInitialValues,
  emptySetInput,
  hydrateWorkoutValues,
} from '../src/domain/workoutInputs';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, TextInput, View } from 'react-native';

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
import {
  equipmentCatalog,
  findExerciseSubstitutions,
  missingEquipment,
} from '../src/domain/equipment';
import {
  demoCycle,
  demoProgram,
  demoProgramVersion,
  demoUser,
  demoWorkout,
} from '../src/domain/fixtures/home';
import { foundationalExercises } from '../src/domain/fixtures/exercises';
import { isExerciseAvailableToUser } from '../src/domain/runtimeContentGates';
import { buildNextSessionTargets, readinessInputForWorkout } from '../src/domain/nextSession';
import { resolveTrackingType } from '../src/domain/exerciseTracking';
import {
  createProgramVersionRevision,
  reorderWorkoutExercises,
  replaceExerciseInWorkout,
  setWorkoutExerciseSetCount,
} from '../src/domain/programBuilder';
import type {
  CompletedSet,
  Exercise,
  ProgramVersion,
  SetTarget,
  TrainingCycle,
  WorkoutDraftSetValues,
  Workout,
  WorkoutExercise,
  WorkoutReadiness,
  WorkoutSession,
  UnitSystem,
} from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { getActiveTrainingCycle } from '../src/db/cycleRepository';
import { getNotificationPreferences } from '../src/db/notificationRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { getUserExercises, getUserProgramVersion } from '../src/db/programRepository';
import { getLatestCompletedWorkoutSets } from '../src/db/progressRepository';
import {
  completeWorkoutSessionAndAdvanceCycle,
  finishWorkoutSessionPartially,
  finishWorkoutSessionSkipped,
  getCompletedSets,
  getInProgressWorkoutSession,
  getWorkoutDraft,
  saveCompletedSet,
  saveActiveWorkoutRevision,
  saveWorkoutDraft,
  saveWorkoutSession,
  updateWorkoutSessionNote,
  updateWorkoutSessionReadiness,
  updateCompletedSet,
} from '../src/db/workoutRepository';
import { colors, radii, spacing } from '../src/design/tokens';
import { connectivityStatusFromNetworkState } from '../src/services/connectivity';
import { createExpoNotificationProvider } from '../src/services/notifications';
import { cancelRestTimerCue, refreshRestTimerCue } from '../src/services/notificationScheduler';
import { useAppServices } from '../src/services/AppServicesProvider';
import { useSyncRuntime } from '../src/services/SyncRuntimeProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';
import * as Network from 'expo-network';
import type { ConnectivityStatus } from '../src/services/syncCoordinator';

import {
  nextWorkoutSet,
  previousComparableSet,
  appendSetDifficultyNote,
  setDifficultyChoices,
  type SetDifficulty,
} from '../src/domain/workoutFocus';

type SetInputValues = WorkoutDraftSetValues;
type PartialWorkoutReason = Exclude<NonNullable<WorkoutSession['completionReason']>, 'all-targets'>;

const partialWorkoutReasonOptions: readonly {
  reason: PartialWorkoutReason;
  label: string;
}[] = [
  { reason: 'time-limited', label: 'I ran out of time' },
  { reason: 'readiness', label: 'I was not ready today' },
  { reason: 'discomfort', label: 'I felt discomfort' },
  { reason: 'equipment', label: 'Equipment changed' },
  { reason: 'other', label: 'Something else' },
];

const notificationProvider = createExpoNotificationProvider();

export default function ActiveWorkoutScreen() {
  const database = useLocalDatabase();
  const { analytics } = useAppServices();
  const { flushNow, state: syncState } = useSyncRuntime();
  const userId = useCurrentUserId();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const [routeAccess, setRouteAccess] = useState<{
    status: 'loading' | 'ready' | 'no-active' | 'unavailable' | 'error';
    userId: string;
    workoutId?: string;
    database: typeof database;
  }>({ status: 'loading', userId, workoutId, database });
  const previewEnabled = __DEV__ && database === null;
  const routeReady =
    previewEnabled ||
    (routeAccess.status === 'ready' &&
      routeAccess.userId === userId &&
      routeAccess.workoutId === workoutId &&
      routeAccess.database === database);
  const [activeCycle, setActiveCycle] = useState<TrainingCycle>(demoCycle);
  const [activeProgram, setActiveProgram] = useState(demoProgram);
  const [activeProgramVersion, setActiveProgramVersion] = useState(demoProgramVersion);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState(demoUser.equipmentIds);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(demoUser.unitSystem);
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
  const [showAllSets, setShowAllSets] = useState(false);
  const [previousSets, setPreviousSets] = useState<CompletedSet[]>([]);
  const [targetReasons, setTargetReasons] = useState<Record<string, string>>({});
  const [showTargetReason, setShowTargetReason] = useState(false);
  const [lastSavedSet, setLastSavedSet] = useState<{ name: string; number: number } | null>(null);
  const [difficultySaving, setDifficultySaving] = useState(false);
  const feedbackWrite = useRef<Promise<void> | null>(null);
  const feedbackGeneration = useRef(0);
  const workoutIsFocused = useRef(false);
  const workoutFocusGeneration = useRef(0);
  const setWrite = useRef<object | null>(null);
  useFocusEffect(
    useCallback(() => {
      workoutIsFocused.current = true;
      workoutFocusGeneration.current++;
      return () => {
        workoutIsFocused.current = false;
        workoutFocusGeneration.current++;
        feedbackGeneration.current++;
      };
    }, []),
  );
  const feedbackContext = useRef({
    database,
    userId,
    sessionId: '',
    versionId: '',
    workoutId: '',
    cycleWeek: 0,
  });
  const [difficulty, setDifficulty] = useState<SetDifficulty | null>(null);
  const [showEffortDetails, setShowEffortDetails] = useState(false);
  const savedActuals = useRef(new Map<string, CompletedSet>());
  const [completedSetKeys, setCompletedSetKeys] = useState<Set<string>>(() => new Set());
  const [editingSetKey, setEditingSetKey] = useState<string | null>(null);
  const [substitutionFor, setSubstitutionFor] = useState<string | null>(null);
  const [revisionSaving, setRevisionSaving] = useState(false);
  const [loadingCycle, setLoadingCycle] = useState(database !== null);
  const [loadingSession, setLoadingSession] = useState(database !== null);
  const [hydratedRoute, setHydratedRoute] = useState<{
    access: typeof routeAccess;
    sessionId: string;
    cycleId: string;
    cycleWeek: number;
    programVersionId: string;
    workoutId: string;
  } | null>(null);
  const [savingSetKey, setSavingSetKey] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [partialFinishing, setPartialFinishing] = useState(false);
  const [earlyStopReasonOpen, setEarlyStopReasonOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>('unknown');
  const [readiness, setReadiness] = useState<WorkoutReadiness | null>(null);
  const [sessionNote, setSessionNote] = useState('');
  const sessionNoteRef = useRef(sessionNote);
  sessionNoteRef.current = sessionNote;
  const [readinessSaving, setReadinessSaving] = useState(false);
  const [restTimerEnabled, setRestTimerEnabled] = useState(false);
  const trackedWorkoutSessionId = useRef<string | null>(null);

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
    setPreviousSets([]);
    setTargetReasons({});
    setShowAllSets(false);
    setLastSavedSet(null);
    setDifficulty(null);
    feedbackGeneration.current++;
    feedbackWrite.current = null;
    setDifficultySaving(false);
    setWrite.current = null;
    setSavingSetKey(null);
    savedActuals.current.clear();
    setCompletedSetKeys(new Set());
    setEditingSetKey(null);
    setSubstitutionFor(null);
    setEarlyStopReasonOpen(false);
    setReadiness(null);
    setSessionNote('');
    setLoadingSession(database !== null);
    setHydratedRoute(null);
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
  feedbackContext.current = {
    database,
    userId,
    sessionId: session.id,
    versionId: activeProgramVersion.id,
    workoutId: activeWorkout.id,
    cycleWeek: activeCycle.currentWeek,
  };
  const captureDraftContextGuard = () => {
    const generation = workoutFocusGeneration.current;
    return () =>
      generation === workoutFocusGeneration.current &&
      workoutIsFocused.current &&
      feedbackContext.current.database === database &&
      feedbackContext.current.userId === userId &&
      feedbackContext.current.sessionId === session.id &&
      feedbackContext.current.versionId === activeProgramVersion.id &&
      feedbackContext.current.workoutId === activeWorkout.id &&
      feedbackContext.current.cycleWeek === activeCycle.currentWeek;
  };
  const canMutate =
    previewEnabled ||
    (routeReady &&
      !loadingCycle &&
      !loadingSession &&
      hydratedRoute?.access === routeAccess &&
      hydratedRoute.sessionId === session.id &&
      hydratedRoute.cycleId === activeCycle.id &&
      hydratedRoute.cycleWeek === activeCycle.currentWeek &&
      hydratedRoute.programVersionId === activeProgramVersion.id &&
      hydratedRoute.workoutId === activeWorkout.id &&
      activeCycle.programVersionId === activeProgramVersion.id &&
      activeWorkout.programVersionId === activeProgramVersion.id);
  const syncStatus =
    connectivity === 'offline'
      ? ('offline' as const)
      : syncState === 'syncing'
        ? ('syncing' as const)
        : syncState === 'conflict'
          ? ('sync-conflict' as const)
          : syncState === 'failed' || syncState === 'partial'
            ? ('sync-failed' as const)
            : null;

  useEffect(() => {
    if (
      !canMutate ||
      loadingCycle ||
      loadingSession ||
      trackedWorkoutSessionId.current === session.id
    )
      return;

    trackedWorkoutSessionId.current = session.id;
    trackAnalyticsEvent(analytics, 'workout_started', {
      workoutId: session.workoutId,
      cycleWeek: session.cycleWeek,
      offline: session.isOffline,
    });
  }, [analytics, canMutate, loadingCycle, loadingSession, session]);

  useEffect(() => {
    return () => {
      void cancelRestTimerCue(notificationProvider, session.id);
    };
  }, [session.id]);

  useEffect(() => {
    if (!database) {
      setRouteAccess({ status: 'unavailable', userId, workoutId, database });
      setLoadingCycle(false);
      return;
    }

    let active = true;
    setError(null);
    setHydratedRoute(null);
    setRouteAccess({ status: 'loading', userId, workoutId, database });
    void getActiveTrainingCycle(database, userId)
      .then(async (cycle) => {
        if (!active) return;
        if (!cycle) {
          setRouteAccess({ status: 'no-active', userId, workoutId, database });
          return;
        }
        const snapshot = await getUserProgramVersion(database, userId, cycle.programVersionId);
        if (!active) return;
        if (
          !snapshot ||
          snapshot.version.id !== cycle.programVersionId ||
          snapshot.version.programId !== snapshot.program.id ||
          !workoutId ||
          !snapshot.version.workouts.some(
            (workout) =>
              workout.id === workoutId && workout.programVersionId === snapshot.version.id,
          )
        ) {
          setRouteAccess({ status: 'unavailable', userId, workoutId, database });
          return;
        }
        setActiveCycle(cycle);
        setActiveProgram(snapshot.program);
        setActiveProgramVersion(snapshot.version);
        setRouteAccess({ status: 'ready', userId, workoutId, database });
      })
      .catch(() => {
        if (active) setRouteAccess({ status: 'error', userId, workoutId, database });
      })
      .finally(() => {
        if (active) setLoadingCycle(false);
      });

    return () => {
      active = false;
    };
  }, [database, userId, workoutId]);

  useEffect(() => {
    if (loadingCycle || !routeReady) return;
    if (!database) {
      setLoadingSession(false);
      return;
    }

    let active = true;
    setLoadingSession(true);
    void getInProgressWorkoutSession(
      database,
      activeCycle.id,
      activeCycle.currentWeek,
      activeWorkout.id,
    )
      .then(async (existingSession) => {
        if (!active) throw new Error('Workout route changed before loading finished.');
        if (existingSession && existingSession.programVersionId !== activeProgramVersion.id) {
          throw new Error('This saved workout no longer matches the active plan version.');
        }
        const sessionToUse = existingSession ?? proposedSession;
        setResumedSession(existingSession);
        await saveWorkoutSession(database, sessionToUse);
        const [completedSets, previousSets, profile, draft, userExercises, preferences] =
          await Promise.all([
            getCompletedSets(database, sessionToUse.id),
            getLatestCompletedWorkoutSets(
              database,
              activeCycle.id,
              activeWorkout.id,
              activeProgramVersion.id,
            ),
            getOnboardingProfile(database, userId),
            getWorkoutDraft(database, sessionToUse.id),
            getUserExercises(database, userId),
            getNotificationPreferences(database, userId),
          ]);
        return {
          sessionId: sessionToUse.id,
          completedSets,
          previousSets,
          unitSystem: profile?.user.unitSystem ?? 'imperial',
          equipmentIds: profile?.user.equipmentIds ?? demoUser.equipmentIds,
          readiness: sessionToUse.readiness,
          note: sessionToUse.note ?? '',
          draft,
          userExercises,
          restTimerEnabled: preferences.restTimer,
        };
      })
      .then(
        ({
          sessionId,
          completedSets,
          previousSets,
          unitSystem,
          equipmentIds,
          readiness,
          note,
          draft,
          userExercises,
          restTimerEnabled,
        }) => {
          if (!active) return;
          setCustomExercises(userExercises);
          setAvailableEquipmentIds(equipmentIds);
          setUnitSystem(unitSystem);
          setRestTimerEnabled(restTimerEnabled);
          setReadiness(readiness ?? null);
          setSessionNote(note);
          savedActuals.current = new Map(completedSets.map((set) => [completedSetKey(set), set]));
          setCompletedSetKeys(new Set(completedSets.map(completedSetKey)));
          setPreviousSets(previousSets);
          const nextTargets =
            previousSets.length > 0
              ? buildNextSessionTargets(
                  activeWorkout,
                  activeProgram.progressionStrategy,
                  previousSets,
                  unitSystem,
                  readinessInputForWorkout(readiness),
                  activeProgramVersion.progressionRuleIds,
                )
              : [];
          const overrides = Object.fromEntries(
            nextTargets.map((target) => [target.workoutExerciseId, target.decision.nextTarget]),
          );
          setTargetOverrides(overrides);
          setTargetReasons(
            Object.fromEntries(
              nextTargets.map((target) => [target.workoutExerciseId, target.decision.reason]),
            ),
          );
          setValues((current) =>
            hydrateWorkoutValues(
              activeWorkout,
              overrides,
              completedSets,
              draft,
              hydratedRoute?.sessionId === sessionId ? current : undefined,
              unitSystem,
            ),
          );
          setHydratedRoute({
            access: routeAccess,
            sessionId,
            cycleId: activeCycle.id,
            cycleWeek: activeCycle.currentWeek,
            programVersionId: activeProgramVersion.id,
            workoutId: activeWorkout.id,
          });
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
  }, [
    activeCycle.currentWeek,
    activeCycle.id,
    activeWorkout,
    activeProgramVersion.id,
    database,
    loadingCycle,
    proposedSession.id,
    routeAccess,
    routeReady,
  ]);

  useEffect(() => {
    if (!database || !canMutate) return;

    const draftGuard = captureDraftContextGuard();
    const timeout = setTimeout(() => {
      void saveWorkoutDraft(
        database,
        session.id,
        values,
        new Date().toISOString(),
        userId,
        draftGuard,
      ).catch(() => {
        setError('We could not save the unfinished workout locally.');
      });
    }, 150);

    return () => clearTimeout(timeout);
  }, [canMutate, database, session.id, userId, values]);

  useEffect(() => {
    if (!database || !canMutate) return;

    const timeout = setTimeout(() => {
      if (feedbackWrite.current) return;
      void updateWorkoutSessionNote(database, session.id, sessionNoteRef.current).catch(() => {
        setError('We could not save the workout note locally.');
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [canMutate, database, session.id, sessionNote]);

  useEffect(() => {
    if (!database || !canMutate) return;

    const draftGuard = captureDraftContextGuard();
    const flushDraft = () => {
      void saveWorkoutDraft(
        database,
        session.id,
        values,
        new Date().toISOString(),
        userId,
        draftGuard,
      ).catch(() => {
        setError('We could not save the unfinished workout locally.');
      });
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'inactive' || nextState === 'background') {
        flushDraft();
        void (async () => {
          await feedbackWrite.current;
          const current = feedbackContext.current;
          if (
            current.database === database &&
            current.userId === userId &&
            current.sessionId === session.id
          )
            await updateWorkoutSessionNote(database, session.id, sessionNoteRef.current);
        })().catch(() => {
          setError('We could not save the workout note locally.');
        });
      }
    });

    return () => subscription.remove();
  }, [canMutate, database, session.id, sessionNote, userId, values]);

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
  const focus = nextWorkoutSet(activeWorkout, completedSetKeys, editingSetKey);
  const previousResult = focus ? previousComparableSet(focus, previousSets) : undefined;

  const updateValue = (key: string, field: keyof SetInputValues, value: string) => {
    if (setWrite.current || !workoutIsFocused.current) return;
    setValues((current) => ({
      ...current,
      [key]: { ...(current[key] ?? emptySetInput()), [field]: value },
    }));
    setError(null);
  };

  const chooseActualLoadUnit = (key: string, unit: LoadUnit) => {
    if (setWrite.current || !canMutate) return;
    const current = values[key];
    if (!current) return;
    const prior = actualLoadUnit(current.loadUnit);
    if (prior === unit) return;
    const measured = parseNumber(current.load);
    const generation = feedbackGeneration.current;
    const apply = () => {
      if (
        setWrite.current ||
        !canMutate ||
        !workoutIsFocused.current ||
        feedbackGeneration.current !== generation ||
        feedbackContext.current.database !== database ||
        feedbackContext.current.userId !== userId ||
        feedbackContext.current.sessionId !== session.id
      )
        return;
      setValues((latest) => {
        const value = latest[key];
        if (!value || value.load !== current.load || value.loadUnit !== current.loadUnit)
          return latest;
        return {
          ...latest,
          [key]: {
            ...value,
            loadUnit: unit,
            load:
              measured !== undefined && prior
                ? String(convertLoad(measured, prior, unit))
                : value.load,
          },
        };
      });
    };
    if (measured === undefined) {
      apply();
      return;
    }
    Alert.alert(
      'Confirm actual load unit',
      prior
        ? `Convert the entered ${current.load} ${prior} to ${unit}? The entered measurement stays equivalent.`
        : `Record the currently entered ${current.load} as ${unit}? Its earlier unit is unknown; this confirms only the current edited result.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: apply },
      ],
    );
  };

  const handleCompleteSet = async (workoutExercise: WorkoutExercise, setNumber: number) => {
    if (setWrite.current || !canMutate || feedbackWrite.current) return;
    const key = setKey(workoutExercise.id, setNumber);
    const alreadyCompleted = completedSetKeys.has(key);
    const editing = editingSetKey === key;
    if ((alreadyCompleted && !editing) || savingSetKey) return;

    const target =
      targetOverrides[workoutExercise.id] ?? workoutExercise.sets[setNumber - 1]?.target;
    const input = values[key] ?? emptySetInput(target);
    const load = parseNumber(input.load);
    if (input.load.trim() && load === undefined) {
      setError('Enter a valid nonnegative load, or clear the field if load was not recorded.');
      return;
    }
    const reps = parseNumber(input.reps);
    const durationSeconds = parseNumber(input.duration);
    const distanceMeters = parseNumber(input.distance);
    const rpe = parseNumber(input.rpe);
    const rir = parseNumber(input.rir);
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
    if (rpe !== undefined && (rpe < 1 || rpe > 10)) {
      setError('RPE must be between 1 and 10.');
      return;
    }
    if (rir !== undefined && (rir < 0 || rir > 10)) {
      setError('RIR must be between 0 and 10.');
      return;
    }

    if (load !== undefined && !actualLoadUnit(input.loadUnit)) {
      setError(
        'The saved load unit is unknown. Confirm kg or lb before saving this actual result.',
      );
      return;
    }
    const expectedSaved = savedActuals.current.get(key);
    const completedSet: CompletedSet = {
      id: alreadyCompleted && expectedSaved ? expectedSaved.id : `completed-${session.id}-${key}`,
      sessionId: session.id,
      workoutExerciseId: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      setNumber,
      load,
      loadUnit: load !== undefined ? actualLoadUnit(input.loadUnit) : undefined,
      reps,
      durationSeconds,
      distanceMeters,
      rpe,
      rir,
      completedAt: new Date().toISOString(),
      idempotencyKey:
        alreadyCompleted && expectedSaved
          ? expectedSaved.idempotencyKey
          : `${session.id}:${workoutExercise.id}:${setNumber}`,
    };

    if (alreadyCompleted && !expectedSaved) {
      setError('Reload the saved set before correcting its actual values.');
      return;
    }
    const generation = feedbackGeneration.current;
    const draftGuard = captureDraftContextGuard();
    const isCurrent = () =>
      workoutIsFocused.current &&
      feedbackGeneration.current === generation &&
      feedbackContext.current.database === database &&
      feedbackContext.current.userId === userId &&
      feedbackContext.current.sessionId === session.id &&
      draftGuard();
    const write = {};
    setWrite.current = write;
    setSavingSetKey(key);
    setError(null);
    try {
      if (database) {
        const result = alreadyCompleted
          ? await updateCompletedSet(database, completedSet, userId, expectedSaved!, isCurrent)
          : await saveCompletedSet(database, completedSet, userId);
        if (alreadyCompleted && result === 'missing') {
          throw new Error('This completed set is no longer available locally.');
        }
        void flushNow();
      }
      if (!isCurrent()) return;
      savedActuals.current.set(key, completedSet);
      setCompletedSetKeys((current) => new Set(current).add(key));
      feedbackGeneration.current++;
      setLastSavedSet({
        name: formatExerciseName(workoutExercise.exerciseId, availableExercises),
        number: setNumber,
      });
      setDifficulty(null);
      if (editing) {
        setEditingSetKey(null);
      } else {
        const restSeconds = workoutExercise.sets[setNumber - 1]?.restSeconds ?? 90;
        setRestEndsAt(Date.now() + restSeconds * 1000);
        void refreshRestTimerCue(notificationProvider, {
          enabled: restTimerEnabled,
          sessionId: session.id,
          workoutId: activeWorkout.id,
          restSeconds,
          now: new Date(),
        }).catch(() => undefined);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'We could not save this set locally.',
      );
    } finally {
      if (setWrite.current === write) {
        setWrite.current = null;
        setSavingSetKey(null);
      }
    }
  };

  const handleDifficulty = (choice: SetDifficulty) => {
    if (setWrite.current || !canMutate || !lastSavedSet || feedbackWrite.current) return;
    const generation = feedbackGeneration.current;
    const context = feedbackContext.current;
    setDifficultySaving(true);
    setError(null);
    const operation = Promise.resolve()
      .then(async () => {
        try {
          const next = appendSetDifficultyNote(
            sessionNoteRef.current,
            lastSavedSet.name,
            lastSavedSet.number,
            choice,
          );
          if (database) await updateWorkoutSessionNote(database, session.id, next);
          const current = feedbackContext.current;
          if (
            generation !== feedbackGeneration.current ||
            current.database !== context.database ||
            current.userId !== context.userId ||
            current.sessionId !== context.sessionId
          )
            return;
          sessionNoteRef.current = next;
          setSessionNote(next);
          setDifficulty(choice);
        } catch (error) {
          if (generation === feedbackGeneration.current)
            setError(error instanceof Error ? error.message : 'Set feedback could not be saved.');
        }
      })
      .finally(() => {
        if (feedbackWrite.current === operation) {
          feedbackWrite.current = null;
          setDifficultySaving(false);
        }
      });
    feedbackWrite.current = operation;
    return operation;
  };

  const handleDiscomfortStop = () => {
    if (setWrite.current || !canMutate || finishing || partialFinishing || allSetsComplete) return;
    Alert.alert(
      'Stop this session for discomfort?',
      'Save only your already completed sets, or record an untouched session as skipped. This does not advance your training week or prescribe work through discomfort.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: completedCount ? 'Save partial and stop' : 'Skip and stop',
          onPress: () =>
            void handleFinishEarly(completedCount ? 'partial' : 'skipped', 'discomfort'),
        },
      ],
    );
  };

  const handlePauseWorkout = async () => {
    if (setWrite.current || !canMutate) return;
    const draftGuard = captureDraftContextGuard();
    if (database) {
      try {
        await feedbackWrite.current;
        await updateWorkoutSessionNote(database, session.id, sessionNoteRef.current);
        await saveWorkoutDraft(
          database,
          session.id,
          values,
          new Date().toISOString(),
          userId,
          draftGuard,
        );
        void flushNow();
      } catch {
        setError('We could not save the unfinished workout locally.');
        return;
      }
    }
    void cancelRestTimerCue(notificationProvider, session.id);
    router.back();
  };

  const handleReadinessChange = async (nextReadiness: WorkoutReadiness) => {
    if (setWrite.current || !canMutate) return;
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
      void flushNow();
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

  const applyActiveWorkoutRevision = async (
    revise: (version: ProgramVersion) => ProgramVersion,
    fallbackMessage: string,
  ): Promise<boolean> => {
    if (setWrite.current || !canMutate || revisionSaving) return false;

    setRevisionSaving(true);
    setError(null);
    try {
      const revisedVersion = revise(activeProgramVersion);
      const createdAt = new Date().toISOString();
      const nextVersion = createProgramVersionRevision(
        revisedVersion,
        `${activeProgramVersion.id}-revision-${Date.now()}`,
        createdAt,
      );
      const nextProgram = { ...activeProgram, currentVersionId: nextVersion.id };
      const nextCycle = { ...activeCycle, programVersionId: nextVersion.id };
      if (database) {
        const updatedSession = await saveActiveWorkoutRevision(
          database,
          userId,
          nextProgram,
          nextVersion,
          nextCycle,
          session.id,
        );
        if (updatedSession) setResumedSession(updatedSession);
        void flushNow();
      }
      setActiveProgram(nextProgram);
      setActiveProgramVersion(nextVersion);
      setActiveCycle(nextCycle);
      return true;
    } catch (revisionError) {
      setError(revisionError instanceof Error ? revisionError.message : fallbackMessage);
      return false;
    } finally {
      setRevisionSaving(false);
    }
  };

  const handleSubstituteExercise = async (
    workoutExercise: WorkoutExercise,
    replacementExerciseId: string,
  ) => {
    if (revisionSaving) return;
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

    const applied = await applyActiveWorkoutRevision(
      (version) =>
        replaceExerciseInWorkout(
          version,
          activeWorkout.id,
          workoutExercise.id,
          replacementExerciseId,
        ),
      'We could not apply this substitution.',
    );
    if (applied) {
      setValues((current) => {
        const next = { ...current };
        for (const set of workoutExercise.sets)
          delete next[setKey(workoutExercise.id, set.setNumber)];
        return next;
      });
      setTargetOverrides((current) => {
        const next = { ...current };
        delete next[workoutExercise.id];
        return next;
      });
      setSubstitutionFor(null);
      trackAnalyticsEvent(analytics, 'exercise_substituted', {
        sourceExerciseId: workoutExercise.exerciseId,
        replacementExerciseId,
      });
    }
  };

  const handleMoveExercise = (workoutExercise: WorkoutExercise, direction: -1 | 1) => {
    if (revisionSaving) return;

    const currentIndex = activeWorkout.exercises.findIndex(
      (candidate) => candidate.id === workoutExercise.id,
    );
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= activeWorkout.exercises.length) {
      return;
    }

    const orderedIds = activeWorkout.exercises.map((candidate) => candidate.id);
    [orderedIds[currentIndex], orderedIds[nextIndex]] = [
      orderedIds[nextIndex]!,
      orderedIds[currentIndex]!,
    ];
    void applyActiveWorkoutRevision(
      (version) => reorderWorkoutExercises(version, activeWorkout.id, orderedIds),
      'We could not reorder this workout locally.',
    );
  };

  const handleAddSet = (workoutExercise: WorkoutExercise) => {
    if (revisionSaving || workoutExercise.sets.length >= 20) return;

    void applyActiveWorkoutRevision(
      (version) =>
        setWorkoutExerciseSetCount(
          version,
          activeWorkout.id,
          workoutExercise.id,
          workoutExercise.sets.length + 1,
        ),
      'We could not add a set to this workout locally.',
    );
  };

  const handleFinishWorkout = async () => {
    if (setWrite.current || !canMutate || !allSetsComplete || editingSetKey !== null || finishing)
      return;

    setFinishing(true);
    setError(null);
    try {
      await feedbackWrite.current;
      if (database) await updateWorkoutSessionNote(database, session.id, sessionNoteRef.current);
      const updatedCycle = database
        ? await completeWorkoutSessionAndAdvanceCycle(
            database,
            session.id,
            new Date().toISOString(),
          )
        : null;
      void flushNow();
      trackAnalyticsEvent(analytics, 'workout_completed', {
        workoutId: session.workoutId,
        cycleWeek: session.cycleWeek,
        offline: session.isOffline,
      });
      if (updatedCycle?.currentWeek === 2) {
        trackAnalyticsEvent(analytics, 'week_2_reached', { cycleId: updatedCycle.id });
      }
      if (updatedCycle?.status === 'complete') {
        const plannedWorkoutCount = updatedCycle.weeks.reduce(
          (total, week) => total + week.plannedWorkoutCount,
          0,
        );
        const completedWorkoutCount = updatedCycle.weeks.reduce(
          (total, week) => total + week.completedWorkoutCount,
          0,
        );
        trackAnalyticsEvent(analytics, 'cycle_completed', {
          cycleId: updatedCycle.id,
          completedWorkoutCount,
          completionRate: plannedWorkoutCount > 0 ? completedWorkoutCount / plannedWorkoutCount : 0,
        });
      }
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

  const handleFinishEarly = async (
    status: Extract<WorkoutSession['status'], 'partial' | 'skipped'>,
    reason: PartialWorkoutReason,
  ) => {
    if (setWrite.current || !canMutate) return;
    const canFinish =
      status === 'partial' ? completedCount > 0 && !allSetsComplete : completedCount === 0;
    if (!canFinish || finishing || partialFinishing) return;

    setPartialFinishing(true);
    setError(null);
    try {
      if (database) {
        await feedbackWrite.current;
        await updateWorkoutSessionNote(database, session.id, sessionNoteRef.current);
        const finishedSession =
          status === 'partial'
            ? await finishWorkoutSessionPartially(
                database,
                session.id,
                new Date().toISOString(),
                reason,
              )
            : await finishWorkoutSessionSkipped(
                database,
                session.id,
                new Date().toISOString(),
                reason,
              );
        if (!finishedSession) {
          throw new Error('This workout session is no longer active locally.');
        }
        void flushNow();
      }
      trackAnalyticsEvent(analytics, status === 'partial' ? 'workout_partial' : 'workout_skipped', {
        workoutId: session.workoutId,
        cycleWeek: session.cycleWeek,
        reason,
        offline: session.isOffline,
      });
      router.replace({
        pathname: '/summary',
        params: {
          sessionId: session.id,
          workoutId: activeWorkout.id,
          completionStatus: status,
          completionReason: reason,
          completedSetCount: String(completedCount),
        },
      });
    } catch (partialError) {
      setError(
        partialError instanceof Error
          ? partialError.message
          : 'We could not save this partial workout locally.',
      );
    } finally {
      setPartialFinishing(false);
    }
  };

  if (
    loadingCycle ||
    (!previewEnabled &&
      (routeAccess.status === 'loading' ||
        routeAccess.userId !== userId ||
        routeAccess.workoutId !== workoutId)) ||
    (routeReady && (loadingSession || (!canMutate && !error)))
  ) {
    return (
      <Screen contentContainerStyle={styles.loadingContent}>
        <LoadingSkeleton width={44} height={44} />
        <LoadingSkeleton height={52} style={styles.loadingTitle} />
        <LoadingSkeleton height={112} style={styles.loadingCard} />
        <LoadingSkeleton height={160} style={styles.loadingCard} />
      </Screen>
    );
  }

  if (!routeReady) {
    const noActive = routeAccess.status === 'no-active';
    return (
      <Screen>
        <Text variant="h1" accessibilityRole="header" style={styles.title}>
          {noActive ? 'No active training plan' : 'Workout unavailable'}
        </Text>
        <ErrorState
          title={noActive ? 'Choose a plan to begin' : 'Your workout could not be opened'}
          message={
            noActive
              ? 'Start a training plan from Home before opening a workout.'
              : routeAccess.status === 'error'
                ? 'We could not read your saved workout. Your local progress has not been changed.'
                : 'This workout is not in your active saved plan. Open a workout from Home.'
          }
        />
        <Button label="Go to Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (!canMutate) {
    return (
      <Screen>
        <Text variant="h1" accessibilityRole="header" style={styles.title}>
          Workout unavailable
        </Text>
        <ErrorState
          title="Your saved workout could not be opened"
          message={
            error ?? 'Your local workout is still on this device. Return Home and try again.'
          }
        />
        <Button label="Go to Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const missingGearNames = missingEquipment(activeWorkout.equipmentIds, availableEquipmentIds).map(
    (id) => equipmentCatalog.find((equipment) => equipment.id === id)?.name ?? id,
  );

  return (
    <Screen
      footer={
        !showAllSets && focus ? (
          <View>
            <Text variant="caption">
              {formatExerciseName(focus.exercise.exerciseId, availableExercises)} · set{' '}
              {focus.set.setNumber} · Confirm the actual values you entered.
            </Text>
            <Button
              label={completedSetKeys.has(focus.key) ? 'Save edited set' : 'Complete set'}
              accessibilityLabel={`${completedSetKeys.has(focus.key) ? 'Save' : 'Complete'} ${formatExerciseName(focus.exercise.exerciseId, availableExercises)} set ${focus.set.setNumber}`}
              disabled={savingSetKey !== null || revisionSaving || difficultySaving}
              loading={savingSetKey === focus.key}
              onPress={() => void handleCompleteSet(focus.exercise, focus.set.setNumber)}
            />
          </View>
        ) : undefined
      }
    >
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

      <Text
        variant={showAllSets ? 'display' : 'h3'}
        accessibilityRole="header"
        style={styles.title}
      >
        {activeWorkout.title}
      </Text>
      <Text variant={showAllSets ? 'body' : 'caption'} tone="muted" style={styles.subtitle}>
        {showAllSets
          ? 'Complete each set when it is done. Your device saves the set before the button changes state.'
          : 'Suggested values are not measurements. Enter your actual result, then tap Complete.'}
      </Text>

      {syncStatus ? <OfflineBanner status={syncStatus} /> : null}
      {!showAllSets && missingGearNames.length ? (
        <Text variant="small" tone="error" accessibilityRole="alert">
          Missing {missingGearNames.join(', ')} in your equipment profile. Review adjustments before
          training if needed.
        </Text>
      ) : null}

      {showAllSets ? (
        <>
          <Text variant="h2" style={styles.sessionNoteTitle}>
            Session note
          </Text>
          <Text variant="small" tone="muted" style={styles.sessionNoteCopy}>
            Capture a cue, how the session felt, or something to remember. This stays with the local
            workout record and is never sent to analytics.
          </Text>
          <TextInput
            accessibilityLabel="Optional session note"
            multiline
            maxLength={500}
            editable={!difficultySaving}
            onChangeText={(text) => {
              if (!feedbackWrite.current) {
                sessionNoteRef.current = text;
                setSessionNote(text);
              }
            }}
            placeholder="Optional note for this workout"
            placeholderTextColor={colors.inkMuted}
            style={styles.sessionNoteInput}
            value={sessionNote}
          />
          <Text variant="caption" tone="muted" style={styles.sessionNoteMeta}>
            {sessionNote.length}/500 · Saved locally while you train
          </Text>

          {activeWorkout.equipmentIds.includes('equipment-barbell') ? (
            <Button
              label="Open plate calculator"
              variant="ghost"
              icon={<Ionicons name="calculator-outline" size={18} color={colors.ink} />}
              onPress={() =>
                router.push({
                  pathname: '/plate-calculator',
                  params: { unitSystem },
                })
              }
              style={styles.plateCalculatorButton}
            />
          ) : null}
        </>
      ) : null}
      {restSecondsRemaining > 0 ? (
        <Card tone="ink" style={styles.timerCard}>
          <View accessible accessibilityLabel={`Rest timer: ${formatTimer(restSecondsRemaining)}`}>
            <Text variant="caption" tone="inverse">
              REST TIMER
            </Text>
            <Text variant="h1" tone="inverse">
              {formatTimer(restSecondsRemaining)}
            </Text>
          </View>
          <Button label="Skip rest" variant="secondary" onPress={() => setRestEndsAt(null)} />
        </Card>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      {activeWorkout.exercises
        .filter((exercise) => showAllSets || exercise.id === focus?.exercise.id)
        .map((workoutExercise) => {
          const exerciseName = formatExerciseName(workoutExercise.exerciseId, availableExercises);
          const sourceExercise = availableExercises.find(
            (candidate) => candidate.id === workoutExercise.exerciseId,
          );
          const substitutions = sourceExercise
            ? findExerciseSubstitutions(
                sourceExercise,
                availableExercises.filter((candidate) =>
                  isExerciseAvailableToUser(candidate, __DEV__),
                ),
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
              {showAllSets ? (
                <View
                  style={styles.exerciseMetaRow}
                  accessibilityLabel={`${formatSection(workoutExercise.section)}${workoutExercise.groupType ? `. ${formatGroupType(workoutExercise.groupType)}` : ''}`}
                >
                  <Chip label={formatSection(workoutExercise.section)} />
                  {workoutExercise.groupType ? (
                    <Chip label={formatGroupType(workoutExercise.groupType)} selected />
                  ) : null}
                </View>
              ) : null}
              {showAllSets ? (
                <View style={styles.exerciseControls}>
                  <Text variant="caption" tone="muted">
                    Adjust this session
                  </Text>
                  <View style={styles.exerciseActionRow}>
                    <IconButton
                      icon={
                        <Ionicons
                          name="chevron-up-outline"
                          size={18}
                          color={
                            revisionSaving || workoutExercise.order === 1
                              ? colors.inkMuted
                              : colors.ink
                          }
                        />
                      }
                      label={`Move ${exerciseName} up`}
                      disabled={revisionSaving || workoutExercise.order === 1}
                      onPress={() => handleMoveExercise(workoutExercise, -1)}
                      style={styles.exerciseAction}
                    />
                    <IconButton
                      icon={
                        <Ionicons
                          name="chevron-down-outline"
                          size={18}
                          color={
                            revisionSaving ||
                            workoutExercise.order === activeWorkout.exercises.length
                              ? colors.inkMuted
                              : colors.ink
                          }
                        />
                      }
                      label={`Move ${exerciseName} down`}
                      disabled={
                        revisionSaving || workoutExercise.order === activeWorkout.exercises.length
                      }
                      onPress={() => handleMoveExercise(workoutExercise, 1)}
                      style={styles.exerciseAction}
                    />
                    <Text
                      variant="caption"
                      accessibilityLabel={`${workoutExercise.sets.length} sets for ${exerciseName}`}
                      style={styles.setCount}
                    >
                      {workoutExercise.sets.length} sets
                    </Text>
                    <IconButton
                      icon={
                        <Ionicons
                          name="add-outline"
                          size={18}
                          color={
                            revisionSaving || workoutExercise.sets.length >= 20
                              ? colors.inkMuted
                              : colors.ink
                          }
                        />
                      }
                      label={`Add a set to ${exerciseName}`}
                      disabled={revisionSaving || workoutExercise.sets.length >= 20}
                      onPress={() => handleAddSet(workoutExercise)}
                      style={styles.exerciseAction}
                    />
                  </View>
                </View>
              ) : null}
              {showAllSets && workoutExercise.notes ? (
                <Card
                  tone="lavender"
                  style={styles.exerciseNote}
                  accessibilityLabel={`Exercise note for ${exerciseName}: ${workoutExercise.notes}`}
                >
                  <Text variant="caption" tone="muted">
                    EXERCISE NOTE
                  </Text>
                  <Text variant="small" style={styles.exerciseNoteCopy}>
                    {workoutExercise.notes}
                  </Text>
                </Card>
              ) : null}
              {substitutionFor === workoutExercise.id ? (
                <Card tone="lavender" style={styles.substitutionCard}>
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
                {workoutExercise.sets
                  .filter(
                    (set) =>
                      showAllSets || setKey(workoutExercise.id, set.setNumber) === focus?.key,
                  )
                  .map((workoutSet) => {
                    const key = setKey(workoutExercise.id, workoutSet.setNumber);
                    const completed = completedSetKeys.has(key);
                    const editing = editingSetKey === key;
                    return (
                      <View key={workoutSet.id} style={styles.setRow}>
                        <View style={styles.setLabel}>
                          <Text variant="smallMedium">Set {workoutSet.setNumber}</Text>
                          <Text variant="caption" tone="muted">
                            {targetSummary(
                              targetOverrides[workoutExercise.id] ?? workoutSet.target,
                            )}
                          </Text>
                        </View>
                        {showsLoad(
                          workoutExercise.exerciseId,
                          workoutSet.target,
                          availableExercises,
                        ) ? (
                          <View>
                            <Text variant="caption">
                              Actual load: {values[key]?.loadUnit ?? 'unknown'}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                              {(['kg', 'lb'] as const).map((unit) => (
                                <Button
                                  key={unit}
                                  label={unit}
                                  variant="ghost"
                                  disabled={savingSetKey !== null || (completed && !editing)}
                                  onPress={() => chooseActualLoadUnit(key, unit)}
                                  accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} actual load unit ${unit}`}
                                />
                              ))}
                            </View>
                            <TextInput
                              accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} load`}
                              accessibilityHint={
                                actualLoadUnit(values[key]?.loadUnit)
                                  ? `Enter actual load in ${values[key]?.loadUnit === 'lb' ? 'pounds' : 'kilograms'}`
                                  : 'The saved unit is unknown. Confirm kg or lb before saving.'
                              }
                              editable={savingSetKey === null && (!completed || editing)}
                              keyboardType="decimal-pad"
                              onChangeText={(value) => updateValue(key, 'load', value)}
                              placeholder={actualLoadUnit(values[key]?.loadUnit) ?? 'Unit unknown'}
                              placeholderTextColor={colors.inkMuted}
                              style={styles.valueInput}
                              value={values[key]?.load ?? ''}
                            />
                          </View>
                        ) : null}
                        {showsReps(
                          workoutExercise.exerciseId,
                          workoutSet.target,
                          availableExercises,
                        ) ? (
                          <TextInput
                            accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} reps`}
                            editable={savingSetKey === null && (!completed || editing)}
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
                            editable={savingSetKey === null && (!completed || editing)}
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
                            editable={savingSetKey === null && (!completed || editing)}
                            keyboardType="decimal-pad"
                            onChangeText={(value) => updateValue(key, 'distance', value)}
                            placeholder="Meters"
                            placeholderTextColor={colors.inkMuted}
                            style={styles.valueInput}
                            value={values[key]?.distance ?? ''}
                          />
                        ) : null}
                        {showEffortDetails || values[key]?.rpe ? (
                          <TextInput
                            accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} RPE from 1 to 10`}
                            editable={savingSetKey === null && (!completed || editing)}
                            keyboardType="decimal-pad"
                            onChangeText={(value) => updateValue(key, 'rpe', value)}
                            placeholder="RPE"
                            placeholderTextColor={colors.inkMuted}
                            style={styles.effortInput}
                            value={values[key]?.rpe ?? ''}
                          />
                        ) : null}
                        {showEffortDetails || values[key]?.rir ? (
                          <TextInput
                            accessibilityLabel={`${formatExerciseName(workoutExercise.exerciseId, availableExercises)} set ${workoutSet.setNumber} RIR from 0 to 10`}
                            editable={savingSetKey === null && (!completed || editing)}
                            keyboardType="number-pad"
                            onChangeText={(value) => updateValue(key, 'rir', value)}
                            placeholder="RIR"
                            placeholderTextColor={colors.inkMuted}
                            style={styles.effortInput}
                            value={values[key]?.rir ?? ''}
                          />
                        ) : null}
                        {showAllSets ? (
                          <Button
                            label={completed ? (editing ? 'Save' : 'Edit') : 'Complete'}
                            accessibilityLabel={`${completed ? (editing ? 'Save' : 'Edit') : 'Complete'} ${exerciseName} set ${workoutSet.setNumber}`}
                            variant={completed && !editing ? 'secondary' : 'primary'}
                            disabled={savingSetKey !== null}
                            loading={savingSetKey === key}
                            onPress={
                              completed && !editing
                                ? () => {
                                    if (!setWrite.current) setEditingSetKey(key);
                                  }
                                : () => handleCompleteSet(workoutExercise, workoutSet.setNumber)
                            }
                            style={styles.completeButton}
                          />
                        ) : null}
                      </View>
                    );
                  })}
              </View>
            </Card>
          );
        })}

      {showAllSets ? (
        <>
          <Card tone="lavender">
            <Text variant="h2" accessibilityRole="header">
              {focus
                ? `${formatExerciseName(focus.exercise.exerciseId, availableExercises)} · set ${focus.set.setNumber} of ${focus.exercise.sets.length}`
                : 'All planned sets saved'}
            </Text>
            <Text variant="small">
              {focus
                ? `Target: ${targetSummary(targetOverrides[focus.exercise.id] ?? focus.set.target)}`
                : 'Finish when ready, or review your saved results.'}
            </Text>
            <Text variant="small" tone="muted">
              Suggested values are not measurements. Edit the fields to match what you actually did,
              then tap Complete to confirm that result.
            </Text>
            {previousResult ? (
              <Text variant="small">
                Previous completed session · set {previousResult.setNumber}:{' '}
                {targetSummary({
                  reps: previousResult.reps,
                  durationSeconds: previousResult.durationSeconds,
                  distanceMeters: previousResult.distanceMeters,
                })}
                {previousResult.load !== undefined
                  ? ` · load ${formatActualLoad(previousResult.load, previousResult.loadUnit)}`
                  : ''}{' '}
                · {new Date(previousResult.completedAt).toLocaleDateString()}
              </Text>
            ) : null}
            {focus && targetReasons[focus.exercise.id] ? (
              <>
                <Button
                  label={showTargetReason ? 'Hide target explanation' : 'Why this target?'}
                  variant="ghost"
                  onPress={() => setShowTargetReason((value) => !value)}
                />
                {showTargetReason ? (
                  <Text variant="small">{targetReasons[focus.exercise.id]}</Text>
                ) : null}
              </>
            ) : null}
          </Card>
        </>
      ) : null}
      <Button
        label={showAllSets ? 'Focus on current set' : 'Review all sets and adjustments'}
        variant="secondary"
        onPress={() => setShowAllSets((value) => !value)}
      />
      {!allSetsComplete ? (
        <Button label="Discomfort — stop session" variant="ghost" onPress={handleDiscomfortStop} />
      ) : null}
      {showAllSets ? (
        <>
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
              <Text variant="smallMedium">{database ? 'Saved on this device' : 'Web preview'}</Text>
            </View>
            <Text variant="small" tone="muted" style={styles.localFirstText}>
              {database
                ? 'Your sets save on this device, even when you are offline.'
                : 'This preview keeps your entries only while this browser session is open.'}
            </Text>
          </Card>
        </>
      ) : null}
      <Button
        label={showEffortDetails ? 'Hide optional effort fields' : 'Show optional effort fields'}
        variant="ghost"
        onPress={() => setShowEffortDetails((current) => !current)}
      />
      {showEffortDetails ? (
        <Text variant="small" tone="muted">
          RIR means how many more reps you could do. RPE rates how hard the set felt, from 1 to 10.
          Leave either field blank if you are unsure.
        </Text>
      ) : null}

      {lastSavedSet ? (
        <Card tone="mint">
          <Text variant="smallMedium">
            How did {lastSavedSet.name} set {lastSavedSet.number} feel?
          </Text>
          <Text variant="caption">
            Optional self-report saved in your local session note. It does not assign an RPE/RIR
            score or change targets.
          </Text>
          <View>
            {setDifficultyChoices.map((choice) => (
              <Button
                key={choice}
                label={choice}
                variant={difficulty === choice ? 'primary' : 'secondary'}
                selected={difficulty === choice}
                disabled={difficultySaving}
                onPress={() => void handleDifficulty(choice)}
              />
            ))}
          </View>
          {difficulty === 'Too hard' ? (
            <Text variant="small">
              One difficult set does not establish a plateau. You can rest, edit your actual result,
              pause, or save partial work.
            </Text>
          ) : null}
        </Card>
      ) : null}
      {!allSetsComplete ? (
        <Card tone="yellow" style={styles.partialCard}>
          <Text variant="smallMedium">
            {completedCount > 0 ? 'Need to stop early?' : 'Need to skip this session?'}
          </Text>
          <Text variant="small" tone="muted" style={styles.partialCopy}>
            {completedCount > 0
              ? 'Save the sets you completed with a reason. This keeps your record honest and does not advance the six-week cycle.'
              : 'Record that you chose not to train today with a reason. The session stays out of cycle advancement.'}
          </Text>
          <Button
            label={
              earlyStopReasonOpen
                ? 'Hide reasons'
                : completedCount > 0
                  ? 'Save partial workout'
                  : 'Skip workout'
            }
            variant="secondary"
            onPress={() => setEarlyStopReasonOpen((current) => !current)}
            style={styles.partialToggle}
          />
          {earlyStopReasonOpen ? (
            <View style={styles.partialOptions}>
              {partialWorkoutReasonOptions.map((option) => (
                <Button
                  key={option.reason}
                  label={option.label}
                  variant="ghost"
                  loading={partialFinishing}
                  onPress={() =>
                    void handleFinishEarly(
                      completedCount > 0 ? 'partial' : 'skipped',
                      option.reason,
                    )
                  }
                  accessibilityHint={
                    completedCount > 0
                      ? 'Ends this session without advancing the current cycle week'
                      : 'Marks this session skipped without advancing the current cycle week'
                  }
                  style={styles.partialOption}
                />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      <Button
        label="Finish workout"
        onPress={handleFinishWorkout}
        disabled={!allSetsComplete || editingSetKey !== null}
        loading={finishing}
        icon={<Ionicons name="checkmark" size={18} color={colors.white} />}
        style={styles.finishButton}
        accessibilityHint={
          editingSetKey !== null
            ? 'Save your edited set first'
            : allSetsComplete
              ? 'Saves the completed workout locally'
              : 'Complete every set first'
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
  const requiredEquipment = equipmentCatalog.filter(
    (equipment) =>
      workout.equipmentIds.includes(equipment.id) && equipment.id !== 'equipment-bodyweight',
  );
  const missingIds = missingEquipment(workout.equipmentIds, availableEquipmentIds);
  const missingGear = requiredEquipment.filter((equipment) => missingIds.includes(equipment.id));
  const readinessOptions: readonly { value: WorkoutReadiness; label: string }[] = [
    { value: 'ready', label: 'Ready to train' },
    { value: 'limited', label: 'Limited today' },
    { value: 'rest', label: 'I need rest' },
  ];

  return (
    <Card tone="lavender" style={styles.preflightCard}>
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
          : missingGear.length === 0
            ? `Ready with ${requiredEquipment.map((equipment) => equipment.name).join(', ')}.`
            : `Missing ${missingGear.map((equipment) => equipment.name).join(', ')}. Use a substitution below if needed.`}
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
            accessibilityRole="radio"
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

function formatSection(section: WorkoutExercise['section']): string {
  return section
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatGroupType(groupType: NonNullable<WorkoutExercise['groupType']>): string {
  return groupType === 'superset' ? 'Superset' : 'Circuit';
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
  sessionNoteTitle: {
    marginTop: spacing.xl,
  },
  sessionNoteCopy: {
    marginTop: spacing.xs,
  },
  sessionNoteInput: {
    minHeight: 96,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sessionNoteMeta: {
    marginTop: spacing.xs,
  },
  plateCalculatorButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
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
  exerciseMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  exerciseControls: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  exerciseActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exerciseAction: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setCount: {
    paddingHorizontal: spacing.xs,
  },
  exerciseNote: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  exerciseNoteCopy: {
    marginTop: spacing.xs,
  },
  substitutionToggle: {
    minHeight: 44,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  setLabel: {
    flex: 1,
    gap: spacing.xxs,
  },
  valueInput: {
    width: 74,
    minHeight: 44,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.canvas,
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontSize: 14,
  },
  effortInput: {
    width: 68,
    minHeight: 44,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.canvas,
    color: colors.ink,
    paddingHorizontal: spacing.xs,
    textAlign: 'center',
    fontSize: 14,
  },
  completeButton: {
    minWidth: 88,
    paddingHorizontal: spacing.sm,
  },
  partialCard: {
    marginTop: spacing.xl,
  },
  partialCopy: {
    marginTop: spacing.xs,
  },
  partialToggle: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  partialOptions: {
    marginTop: spacing.xs,
    gap: spacing.xxs,
  },
  partialOption: {
    justifyContent: 'flex-start',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  finishButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
});
