import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  Text,
} from '../src/components/ui';
import { findExerciseSubstitutions } from '../src/domain/equipment';
import { foundationalExercises } from '../src/domain/fixtures/exercises';
import { demoProgram, demoProgramVersion, demoUser } from '../src/domain/fixtures/home';
import { createTrainingCycle } from '../src/domain/cycle';
import { defaultTargetForTrackingType, resolveTrackingType } from '../src/domain/exerciseTracking';
import { searchExercises } from '../src/domain/exerciseCatalog';
import {
  addExerciseToWorkout,
  addWorkoutToProgram,
  createBlankProgram,
  createCustomExercise,
  createProgramCopy,
  removeExerciseFromWorkout,
  replaceExerciseInWorkout,
  reorderWorkoutExercises,
  renameProgram,
  setWorkoutExerciseSetCount,
  setWorkoutExerciseTarget,
  setWorkoutExerciseNotes,
  setWorkoutExerciseRestSeconds,
  updateWorkoutMetadata,
} from '../src/domain/programBuilder';
import type { Exercise, SetTarget, TrackingType, UnitSystem, Workout } from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { saveTrainingCycle } from '../src/db/cycleRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import {
  getUserExercises,
  getUserProgramVersion,
  saveCustomExercise,
  saveProgramVersion,
} from '../src/db/programRepository';
import { colors, radii, spacing } from '../src/design/tokens';

export default function ProgramBuilderScreen() {
  const database = useLocalDatabase();
  const { mode, sourceVersionId } = useLocalSearchParams<{
    mode?: string;
    sourceVersionId?: string;
  }>();
  const isBlankBuilder = mode === 'blank';
  const shouldLoadSource = Boolean(database && sourceVersionId && !isBlankBuilder);
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState(demoUser.equipmentIds);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(demoUser.unitSystem);
  const [draft, setDraft] = useState(() => createInitialBuilderDraft(isBlankBuilder));
  const [customName, setCustomName] = useState('');
  const [newWorkoutTitle, setNewWorkoutTitle] = useState('');
  const [newWorkoutSequence, setNewWorkoutSequence] = useState(0);
  const [customExercises, setCustomExercises] = useState<Record<string, Exercise>>({});
  const [exercisePickerWorkoutId, setExercisePickerWorkoutId] = useState<string | null>(null);
  const [exercisePickerQuery, setExercisePickerQuery] = useState('');
  const [substitutionExerciseId, setSubstitutionExerciseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(shouldLoadSource);
  const [sourceLoadError, setSourceLoadError] = useState(false);
  const [sourceRetryKey, setSourceRetryKey] = useState(0);

  useEffect(() => {
    if (!database) return;

    let active = true;
    void getOnboardingProfile(database, 'guest-user')
      .then((profile) => {
        if (!active || !profile) return;
        setAvailableEquipmentIds(profile.user.equipmentIds);
        setUnitSystem(profile.user.unitSystem);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [database]);

  useEffect(() => {
    if (!database || !sourceVersionId || isBlankBuilder) {
      setSourceLoading(false);
      return;
    }

    let active = true;
    setSourceLoading(true);
    setSourceLoadError(false);
    setError(null);
    void Promise.all([
      getUserProgramVersion(database, 'guest-user', sourceVersionId),
      getUserExercises(database, 'guest-user'),
    ])
      .then(([snapshot, userExercises]) => {
        if (!active) return;
        if (!snapshot) {
          setSourceLoadError(true);
          setError('We could not find the saved program version for this cycle.');
          return;
        }

        setDraft(() => createProgramDraftFromSource(snapshot.program, snapshot.version));
        const referencedExerciseIds = new Set(
          snapshot.version.workouts.flatMap((workout) =>
            workout.exercises.map((exercise) => exercise.exerciseId),
          ),
        );
        setCustomExercises(
          Object.fromEntries(
            userExercises
              .filter((exercise) => referencedExerciseIds.has(exercise.id))
              .map((exercise) => [exercise.id, exercise]),
          ),
        );
      })
      .catch(() => {
        if (active) {
          setSourceLoadError(true);
          setError('We could not load the saved program for a private adjustment.');
        }
      })
      .finally(() => {
        if (active) setSourceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database, isBlankBuilder, sourceRetryKey, sourceVersionId]);

  const firstWorkout = draft.version.workouts[0];
  const exerciseNameById = useMemo(
    () =>
      new Map(
        [...foundationalExercises, ...Object.values(customExercises)].map((exercise) => [
          exercise.id,
          exercise.name,
        ]),
      ),
    [customExercises],
  );
  const exerciseById = useMemo(
    () =>
      new Map(
        [...foundationalExercises, ...Object.values(customExercises)].map((exercise) => [
          exercise.id,
          exercise,
        ]),
      ),
    [customExercises],
  );
  const pickerExercises = useMemo(
    () =>
      searchExercises(foundationalExercises, {
        query: exercisePickerQuery,
        limit: 8,
      }),
    [exercisePickerQuery],
  );

  const updateDraftVersion = (update: (version: typeof draft.version) => typeof draft.version) => {
    setDraft((current) => ({ ...current, version: update(current.version) }));
    setSaved(false);
    setError(null);
  };

  const handleAddPlank = (workoutId: string | undefined = firstWorkout?.id) => {
    if (!workoutId) return;
    setDraft((current) => ({
      ...current,
      version: addExerciseToWorkout(current.version, workoutId, {
        exerciseId: 'exercise-plank',
        setCount: 2,
        target: { durationSeconds: 30 },
      }),
    }));
    setSaved(false);
    setError(null);
  };

  const handleAddCatalogueExercise = (workoutId: string, exercise: Exercise) => {
    updateDraftVersion((version) =>
      addExerciseToWorkout(version, workoutId, {
        exerciseId: exercise.id,
        target: defaultTargetForTrackingType(exercise.trackingType),
      }),
    );
    setExercisePickerWorkoutId(null);
    setExercisePickerQuery('');
  };

  const handleAddWorkout = () => {
    const nextSequence = newWorkoutSequence + 1;
    try {
      const version = addWorkoutToProgram(draft.version, {
        id: `${draft.version.id}-workout-extra-${nextSequence}`,
        title: newWorkoutTitle,
        dayOfWeek: getNextAvailableWorkoutDay(draft.version.workouts),
        focus: 'mixed',
        estimatedDurationMinutes: 20,
        equipmentIds: ['equipment-bodyweight'],
        isOptional: !isBlankBuilder,
      });
      setDraft((current) => ({ ...current, version }));
      setNewWorkoutSequence(nextSequence);
      setNewWorkoutTitle('');
      setSaved(false);
      setError(null);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'Name your workout first.');
    }
  };

  const handleAddCustomExercise = () => {
    if (!firstWorkout) {
      setError('Add a workout before adding a custom movement.');
      return;
    }
    try {
      const exercise = createCustomExercise({
        id: `${draft.program.id}-custom-exercise-${Object.keys(customExercises).length + 1}`,
        name: customName,
        movementPattern: 'carry',
        primaryMuscles: ['grip', 'core'],
        equipmentIds: ['equipment-bodyweight'],
        trackingType: 'time',
      });
      setCustomExercises((current) => ({ ...current, [exercise.id]: exercise }));
      updateDraftVersion((version) =>
        addExerciseToWorkout(version, firstWorkout.id, {
          exerciseId: exercise.id,
          setCount: 2,
          target: { durationSeconds: 30 },
        }),
      );
      setCustomName('');
      setSaved(false);
      setError(null);
    } catch (creationError) {
      setError(
        creationError instanceof Error ? creationError.message : 'Name your movement first.',
      );
    }
  };

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const program = renameProgram(draft.program, draft.program.title);
      if (database) {
        for (const exercise of Object.values(customExercises)) {
          await saveCustomExercise(database, 'guest-user', exercise, new Date().toISOString());
        }
        await saveProgramVersion(database, 'guest-user', program, draft.version);
      }
      setDraft((current) => ({ ...current, program }));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'We could not save this program.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartCycle = async () => {
    if (starting || saving) return;

    if (!draft.version.workouts.some((workout) => !workout.isOptional)) {
      setError('Add at least one required workout before starting a six-week cycle.');
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const program = renameProgram(draft.program, draft.program.title);
      const startedAt = new Date().toISOString();
      const cycle = createTrainingCycle({
        id: `cycle-guest-user-${draft.program.id}-${Date.now()}`,
        userId: 'guest-user',
        programVersion: draft.version,
        startedAt,
      });
      if (database) {
        for (const exercise of Object.values(customExercises)) {
          await saveCustomExercise(database, 'guest-user', exercise, startedAt);
        }
        await saveProgramVersion(database, 'guest-user', program, draft.version);
        await saveTrainingCycle(database, cycle);
      }
      setDraft((current) => ({ ...current, program }));
      router.replace('/');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'We could not start this cycle.');
    } finally {
      setStarting(false);
    }
  };

  if (sourceLoading) {
    return (
      <Screen>
        <LoadingSkeleton width={44} height={44} />
        <LoadingSkeleton width="76%" height={52} style={styles.loadingTitle} />
        <LoadingSkeleton height={180} style={styles.loadingCard} />
      </Screen>
    );
  }

  if (sourceLoadError) {
    return (
      <Screen>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to cycle review"
          onPress={() => router.back()}
        />
        <ErrorState
          message={error ?? 'The saved program version is unavailable.'}
          onRetry={() => setSourceRetryKey((current) => current + 1)}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Programs"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          CUSTOM BUILDER
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {isBlankBuilder ? 'Build from first principles.' : 'Make it yours.'}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {isBlankBuilder
          ? 'Start with an empty six-week plan, add the sessions you need, and keep the whole draft private.'
          : 'This is a private copy of the selected program. Your edits leave the public template and completed history unchanged.'}
      </Text>

      <Text variant="smallMedium" style={styles.fieldLabel}>
        Program name
      </Text>
      <TextInput
        accessibilityLabel="Program name"
        onChangeText={(value) => {
          setDraft((current) => ({ ...current, program: { ...current.program, title: value } }));
          setSaved(false);
        }}
        placeholder="Name your program"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
        value={draft.program.title}
      />

      <Card tone="lavender" style={styles.versionCard}>
        <Text variant="caption" tone="muted">
          DRAFT VERSION 1
        </Text>
        <Text variant="h3" style={styles.versionTitle}>
          {draft.version.workouts.length} workouts · six-week model retained
        </Text>
        <Text variant="small" tone="muted">
          {isBlankBuilder
            ? 'This draft starts empty and remains private until you choose to save or start it.'
            : 'The source version is copied before editing, so future template changes cannot rewrite this draft or its history.'}
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Workout structure
      </Text>
      {draft.version.workouts.map((workout) => (
        <Card key={workout.id} tone="white" style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <Text variant="h3">{workout.title}</Text>
            <Text variant="small" tone="muted">
              Day {workout.dayOfWeek}
            </Text>
          </View>
          <WorkoutMetadataEditor
            workout={workout}
            onChange={(metadata) => {
              updateDraftVersion((version) => updateWorkoutMetadata(version, workout.id, metadata));
            }}
          />
          {workout.exercises.length === 0 ? (
            <View style={styles.emptyWorkout}>
              <Text variant="small" tone="muted">
                No exercises yet. Add a starter movement, then configure its target below.
              </Text>
              <Button
                label="Add starter plank"
                variant="ghost"
                icon={<Ionicons name="add-outline" size={18} color={colors.ink} />}
                onPress={() => handleAddPlank(workout.id)}
                style={styles.emptyWorkoutButton}
              />
            </View>
          ) : (
            workout.exercises.map((exercise, exerciseIndex) => {
              const exerciseName = exerciseNameById.get(exercise.exerciseId) ?? 'Custom movement';
              const trackingType = resolveTrackingType(
                exercise.exerciseId,
                exercise.sets[0]?.target,
                [...exerciseById.values()],
              );
              const sourceExercise = foundationalExercises.find(
                (candidate) => candidate.id === exercise.exerciseId,
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
                <View key={exercise.id}>
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseCopy}>
                      <Text variant="smallMedium">{exerciseName}</Text>
                      <Text variant="caption" tone="muted">
                        {exercise.sets.length} sets · {exercise.section}
                      </Text>
                    </View>
                    <View style={styles.exerciseActions}>
                      <IconButton
                        icon={
                          <Ionicons name="swap-horizontal-outline" size={18} color={colors.ink} />
                        }
                        label={`Choose substitute for ${exerciseName}`}
                        disabled={substitutions.length === 0}
                        onPress={() => setSubstitutionExerciseId(exercise.id)}
                        style={styles.iconAction}
                      />
                      <IconButton
                        icon={<Ionicons name="chevron-up-outline" size={18} color={colors.ink} />}
                        label={`Move ${exerciseName} up`}
                        disabled={exerciseIndex === 0}
                        onPress={() => {
                          const orderedIds = workout.exercises.map((candidate) => candidate.id);
                          [orderedIds[exerciseIndex - 1]!, orderedIds[exerciseIndex]!] = [
                            orderedIds[exerciseIndex]!,
                            orderedIds[exerciseIndex - 1]!,
                          ];
                          updateDraftVersion((version) =>
                            reorderWorkoutExercises(version, workout.id, orderedIds),
                          );
                        }}
                        style={styles.iconAction}
                      />
                      <IconButton
                        icon={<Ionicons name="chevron-down-outline" size={18} color={colors.ink} />}
                        label={`Move ${exerciseName} down`}
                        disabled={exerciseIndex === workout.exercises.length - 1}
                        onPress={() => {
                          const orderedIds = workout.exercises.map((candidate) => candidate.id);
                          [orderedIds[exerciseIndex]!, orderedIds[exerciseIndex + 1]!] = [
                            orderedIds[exerciseIndex + 1]!,
                            orderedIds[exerciseIndex]!,
                          ];
                          updateDraftVersion((version) =>
                            reorderWorkoutExercises(version, workout.id, orderedIds),
                          );
                        }}
                        style={styles.iconAction}
                      />
                      <IconButton
                        icon={<Ionicons name="remove-outline" size={18} color={colors.ink} />}
                        label={`Decrease sets for ${exerciseName}`}
                        disabled={exercise.sets.length <= 1}
                        onPress={() =>
                          updateDraftVersion((version) =>
                            setWorkoutExerciseSetCount(
                              version,
                              workout.id,
                              exercise.id,
                              exercise.sets.length - 1,
                            ),
                          )
                        }
                        style={styles.iconAction}
                      />
                      <Text
                        variant="caption"
                        accessibilityLabel={`${exercise.sets.length} sets`}
                        style={styles.setCount}
                      >
                        {exercise.sets.length}
                      </Text>
                      <IconButton
                        icon={<Ionicons name="add-outline" size={18} color={colors.ink} />}
                        label={`Increase sets for ${exerciseName}`}
                        disabled={exercise.sets.length >= 20}
                        onPress={() =>
                          updateDraftVersion((version) =>
                            setWorkoutExerciseSetCount(
                              version,
                              workout.id,
                              exercise.id,
                              exercise.sets.length + 1,
                            ),
                          )
                        }
                        style={styles.iconAction}
                      />
                      <IconButton
                        icon={<Ionicons name="trash-outline" size={17} color={colors.error} />}
                        label={`Remove ${exerciseName}`}
                        onPress={() =>
                          updateDraftVersion((version) =>
                            removeExerciseFromWorkout(version, workout.id, exercise.id),
                          )
                        }
                        style={styles.iconAction}
                      />
                    </View>
                  </View>
                  <TargetEditor
                    exerciseName={exerciseName}
                    setCount={exercise.sets.length}
                    target={exercise.sets[0]?.target ?? {}}
                    restSeconds={exercise.sets[0]?.restSeconds}
                    notes={exercise.notes}
                    trackingType={trackingType}
                    unitSystem={unitSystem}
                    onChange={(target) => {
                      updateDraftVersion((version) =>
                        setWorkoutExerciseTarget(version, workout.id, exercise.id, target),
                      );
                    }}
                    onRestChange={(restSeconds) => {
                      updateDraftVersion((version) =>
                        setWorkoutExerciseRestSeconds(
                          version,
                          workout.id,
                          exercise.id,
                          restSeconds,
                        ),
                      );
                    }}
                    onNotesChange={(notes) => {
                      updateDraftVersion((version) =>
                        setWorkoutExerciseNotes(version, workout.id, exercise.id, notes),
                      );
                    }}
                  />
                  {substitutionExerciseId === exercise.id && substitutions.length > 0 ? (
                    <Card
                      tone="lavender"
                      style={styles.substitutionPanel}
                      accessibilityLabel={`${exerciseName} substitution options`}
                    >
                      <Text variant="smallMedium">Equipment-compatible options</Text>
                      <Text variant="caption" tone="muted">
                        Keep the movement intent while changing the exercise in this private copy.
                      </Text>
                      {substitutions.map((candidate) => (
                        <Button
                          key={candidate.id}
                          label={`Use ${candidate.name}`}
                          variant="ghost"
                          onPress={() => {
                            updateDraftVersion((version) =>
                              replaceExerciseInWorkout(
                                version,
                                workout.id,
                                exercise.id,
                                candidate.id,
                              ),
                            );
                            setSubstitutionExerciseId(null);
                          }}
                          style={styles.substitutionButton}
                        />
                      ))}
                    </Card>
                  ) : null}
                </View>
              );
            })
          )}
          <Button
            label={
              exercisePickerWorkoutId === workout.id ? 'Close exercise picker' : 'Add exercise'
            }
            variant="ghost"
            icon={
              <Ionicons
                name={exercisePickerWorkoutId === workout.id ? 'close-outline' : 'add-outline'}
                size={18}
                color={colors.ink}
              />
            }
            onPress={() => {
              setExercisePickerWorkoutId((current) => (current === workout.id ? null : workout.id));
              setExercisePickerQuery('');
            }}
            style={styles.addExerciseButton}
          />
          {exercisePickerWorkoutId === workout.id ? (
            <Card
              tone="lavender"
              style={styles.exercisePicker}
              accessibilityLabel={`Choose an exercise for ${workout.title}`}
            >
              <Text variant="smallMedium">Choose from the foundational catalogue</Text>
              <Text variant="caption" tone="muted" style={styles.pickerHint}>
                Targets start conservatively and can be edited after adding.
              </Text>
              <TextInput
                accessibilityLabel={`Search exercises for ${workout.title}`}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setExercisePickerQuery}
                placeholder="Search movements"
                placeholderTextColor={colors.inkMuted}
                style={styles.pickerInput}
                value={exercisePickerQuery}
              />
              {pickerExercises.length === 0 ? (
                <Text variant="small" tone="muted" style={styles.pickerEmpty}>
                  No foundational movement matches that search.
                </Text>
              ) : (
                pickerExercises.map((exercise) => (
                  <Button
                    key={exercise.id}
                    label={`Add ${exercise.name}`}
                    variant="ghost"
                    onPress={() => handleAddCatalogueExercise(workout.id, exercise)}
                    style={styles.pickerButton}
                  />
                ))
              )}
            </Card>
          ) : null}
        </Card>
      ))}

      {!isBlankBuilder ? (
        <Button
          label={`Add plank to ${firstWorkout?.title ?? 'first workout'}`}
          variant="secondary"
          icon={<Ionicons name="add-outline" size={18} color={colors.ink} />}
          onPress={handleAddPlank}
          disabled={!firstWorkout}
          style={styles.addButton}
        />
      ) : null}

      <Text variant="smallMedium" style={styles.fieldLabel}>
        {isBlankBuilder ? 'Add a required workout' : 'Add an optional workout'}
      </Text>
      <TextInput
        accessibilityLabel={isBlankBuilder ? 'Required workout name' : 'Optional workout name'}
        onChangeText={setNewWorkoutTitle}
        placeholder="e.g. Saturday mobility"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
        value={newWorkoutTitle}
      />
      <Button
        label={isBlankBuilder ? 'Add required workout' : 'Add optional workout'}
        variant="ghost"
        icon={<Ionicons name="calendar-outline" size={18} color={colors.ink} />}
        onPress={handleAddWorkout}
        style={styles.customButton}
      />
      <Text variant="caption" tone="muted" style={styles.optionalWorkoutNote}>
        {isBlankBuilder
          ? 'Blank plans use required sessions for cycle advancement. Add at least one before starting.'
          : 'Optional sessions add flexibility without changing the required weekly completion count.'}
      </Text>

      <Text variant="smallMedium" style={styles.fieldLabel}>
        Add a custom movement
      </Text>
      <TextInput
        accessibilityLabel="Custom exercise name"
        onChangeText={setCustomName}
        placeholder="e.g. Carry variation"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
        value={customName}
      />
      <Button
        label="Add custom movement"
        variant="ghost"
        icon={<Ionicons name="construct-outline" size={18} color={colors.ink} />}
        onPress={handleAddCustomExercise}
        style={styles.customButton}
      />

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {saved ? (
        <Card tone="mint" style={styles.savedCard} accessibilityLabel="Program saved">
          <Text variant="smallMedium">Draft saved locally.</Text>
          <Text variant="small" tone="muted">
            {database
              ? 'The program version and any custom movement are queued for sync.'
              : Platform.OS === 'web'
                ? 'Web preview: local persistence is not active in this surface.'
                : 'The program will be stored locally before sync.'}
          </Text>
        </Card>
      ) : null}

      <Button
        label="Save draft program"
        onPress={handleSave}
        loading={saving}
        icon={<Ionicons name="checkmark" size={18} color={colors.white} />}
        style={styles.saveButton}
      />
      <Button
        label="Start this six-week cycle"
        variant="secondary"
        onPress={() => void handleStartCycle()}
        loading={starting}
        icon={<Ionicons name="arrow-forward" size={18} color={colors.ink} />}
        style={styles.startButton}
      />
      <Text variant="caption" tone="muted" style={styles.startNote}>
        Starting snapshots this private version. The public template and completed history stay
        unchanged.
      </Text>
    </Screen>
  );
}

function createInitialBuilderDraft(isBlankBuilder: boolean) {
  if (isBlankBuilder) {
    const programId = `program-blank-guest-user-${Date.now()}`;
    return createBlankProgram({
      userId: 'guest-user',
      newProgramId: programId,
      newVersionId: `${programId}-version-1`,
      createdAt: new Date().toISOString(),
    });
  }

  return createProgramDraftFromSource(demoProgram, demoProgramVersion);
}

function createProgramDraftFromSource(
  sourceProgram: typeof demoProgram,
  sourceVersion: typeof demoProgramVersion,
) {
  const copyId = `program-custom-${sourceProgram.slug}-guest-${Date.now()}`;
  return createProgramCopy({
    sourceProgram,
    sourceVersion,
    userId: 'guest-user',
    newProgramId: copyId,
    newVersionId: `${copyId}-version-1`,
    createdAt: new Date().toISOString(),
  });
}

function getNextAvailableWorkoutDay(workouts: readonly Workout[]): number {
  const usedDays = new Set(workouts.map((workout) => workout.dayOfWeek));
  return Array.from({ length: 7 }, (_, index) => index + 1).find((day) => !usedDays.has(day)) ?? 7;
}

interface WorkoutMetadataEditorProps {
  workout: Workout;
  onChange: (
    metadata: Partial<
      Pick<Workout, 'title' | 'dayOfWeek' | 'focus' | 'estimatedDurationMinutes' | 'equipmentIds'>
    >,
  ) => void;
}

function WorkoutMetadataEditor({ workout, onChange }: WorkoutMetadataEditorProps) {
  const [title, setTitle] = useState(workout.title);
  const [dayOfWeek, setDayOfWeek] = useState(String(workout.dayOfWeek));
  const [duration, setDuration] = useState(String(workout.estimatedDurationMinutes));

  useEffect(() => {
    setTitle(workout.title);
    setDayOfWeek(String(workout.dayOfWeek));
    setDuration(String(workout.estimatedDurationMinutes));
  }, [workout.dayOfWeek, workout.estimatedDurationMinutes, workout.id, workout.title]);

  const commitTitle = () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setTitle(workout.title);
      return;
    }
    if (nextTitle !== workout.title) onChange({ title: nextTitle });
  };

  const commitDay = () => {
    const nextDay = Number(dayOfWeek.trim());
    if (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 7) {
      setDayOfWeek(String(workout.dayOfWeek));
      return;
    }
    if (nextDay !== workout.dayOfWeek) onChange({ dayOfWeek: nextDay });
  };

  const commitDuration = () => {
    const nextDuration = Number(duration.trim());
    if (!Number.isInteger(nextDuration) || nextDuration < 1) {
      setDuration(String(workout.estimatedDurationMinutes));
      return;
    }
    if (nextDuration !== workout.estimatedDurationMinutes) {
      onChange({ estimatedDurationMinutes: nextDuration });
    }
  };

  const focusOptions: readonly Workout['focus'][] = [
    'strength',
    'cardio',
    'mobility',
    'conditioning',
    'recovery',
    'mixed',
  ];

  return (
    <View style={styles.metadataEditor} accessibilityLabel={`Edit details for ${workout.title}`}>
      <Text variant="caption" tone="muted">
        WORKOUT DETAILS
      </Text>
      <View style={styles.metadataFields}>
        <View style={styles.metadataTitleField}>
          <Text variant="caption" tone="muted">
            Name
          </Text>
          <TextInput
            accessibilityLabel={`Name for ${workout.title}`}
            onBlur={commitTitle}
            onChangeText={setTitle}
            placeholder="Workout name"
            placeholderTextColor={colors.inkMuted}
            style={styles.metadataInput}
            value={title}
          />
        </View>
        <View style={styles.metadataNumberField}>
          <Text variant="caption" tone="muted">
            Day
          </Text>
          <TextInput
            accessibilityLabel={`Day of week for ${workout.title}`}
            keyboardType="number-pad"
            onBlur={commitDay}
            onChangeText={setDayOfWeek}
            placeholder="1–7"
            placeholderTextColor={colors.inkMuted}
            style={styles.metadataInput}
            value={dayOfWeek}
          />
        </View>
        <View style={styles.metadataNumberField}>
          <Text variant="caption" tone="muted">
            Minutes
          </Text>
          <TextInput
            accessibilityLabel={`Duration in minutes for ${workout.title}`}
            keyboardType="number-pad"
            onBlur={commitDuration}
            onChangeText={setDuration}
            placeholder="30"
            placeholderTextColor={colors.inkMuted}
            style={styles.metadataInput}
            value={duration}
          />
        </View>
      </View>
      <Text variant="caption" tone="muted" style={styles.focusLabel}>
        FOCUS
      </Text>
      <View style={styles.focusOptions} accessibilityRole="radiogroup">
        {focusOptions.map((focus) => (
          <Chip
            key={focus}
            label={formatFocusLabel(focus)}
            selected={workout.focus === focus}
            onPress={() => onChange({ focus })}
          />
        ))}
      </View>
    </View>
  );
}

interface TargetEditorProps {
  exerciseName: string;
  setCount: number;
  target: SetTarget;
  restSeconds?: number;
  notes?: string;
  trackingType: TrackingType;
  unitSystem: UnitSystem;
  onChange: (target: SetTarget) => void;
  onRestChange: (restSeconds: number | undefined) => void;
  onNotesChange: (notes: string) => void;
}

function TargetEditor({
  exerciseName,
  setCount,
  target,
  restSeconds,
  notes,
  trackingType,
  unitSystem,
  onChange,
  onRestChange,
  onNotesChange,
}: TargetEditorProps) {
  const commit = (field: NumericTargetField, rawValue: string): boolean => {
    const nextTarget = updateNumericTarget(target, field, rawValue, unitSystem);
    if (!hasTargetValue(nextTarget)) return false;
    onChange(nextTarget);
    return true;
  };
  const showsReps = trackingType === 'reps' || trackingType === 'custom';
  const showsLoad = trackingType === 'reps' || trackingType === 'custom';
  const showsTime = trackingType === 'time' || trackingType === 'duration-and-distance';
  const showsDistance = trackingType === 'distance' || trackingType === 'duration-and-distance';
  const showsEffort = trackingType === 'reps' || trackingType === 'custom';

  return (
    <View accessibilityLabel={`Target editor for ${exerciseName}`} style={styles.targetEditor}>
      <Text variant="caption" tone="muted">
        TARGET FOR ALL {setCount} SETS
      </Text>
      <Text variant="small" tone="muted" style={styles.targetHint}>
        Editing this prescription applies it to every set in this exercise.
      </Text>
      <View style={styles.targetFields}>
        {showsReps ? (
          <TargetField
            label="Reps"
            accessibilityLabel={`Reps target for ${exerciseName}`}
            value={formatRepsTarget(target.reps)}
            placeholder="8"
            onCommit={(value) => commit('reps', value)}
          />
        ) : null}
        {showsLoad ? (
          <TargetField
            label={`Load (${unitSystem === 'metric' ? 'kg' : 'lb'})`}
            accessibilityLabel={`Load target for ${exerciseName}`}
            value={target.load?.value === undefined ? '' : String(target.load.value)}
            placeholder="Optional"
            onCommit={(value) => commit('load', value)}
          />
        ) : null}
        {showsTime ? (
          <TargetField
            label="Time (sec)"
            accessibilityLabel={`Time target for ${exerciseName}`}
            value={target.durationSeconds === undefined ? '' : String(target.durationSeconds)}
            placeholder="30"
            onCommit={(value) => commit('durationSeconds', value)}
          />
        ) : null}
        {showsDistance ? (
          <TargetField
            label="Distance (m)"
            accessibilityLabel={`Distance target for ${exerciseName}`}
            value={target.distanceMeters === undefined ? '' : String(target.distanceMeters)}
            placeholder="500"
            onCommit={(value) => commit('distanceMeters', value)}
          />
        ) : null}
        <TargetField
          label="Rest (sec)"
          accessibilityLabel={`Rest target for ${exerciseName}`}
          value={restSeconds === undefined ? '' : String(restSeconds)}
          placeholder="90"
          onCommit={(value) => {
            const trimmedValue = value.trim();
            if (!trimmedValue) {
              onRestChange(undefined);
              return true;
            }
            const parsedValue = Number(trimmedValue);
            if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 3600) {
              return false;
            }
            onRestChange(parsedValue);
            return true;
          }}
        />
        {showsEffort ? (
          <>
            <TargetField
              label="RPE"
              accessibilityLabel={`RPE target for ${exerciseName}`}
              value={target.rpe === undefined ? '' : String(target.rpe)}
              placeholder="Optional"
              onCommit={(value) => commit('rpe', value)}
            />
            <TargetField
              label="RIR"
              accessibilityLabel={`RIR target for ${exerciseName}`}
              value={target.rir === undefined ? '' : String(target.rir)}
              placeholder="Optional"
              onCommit={(value) => commit('rir', value)}
            />
          </>
        ) : null}
      </View>
      <Text variant="caption" tone="muted" style={styles.notesLabel}>
        EXERCISE NOTE
      </Text>
      <TextInput
        accessibilityLabel={`Notes for ${exerciseName}`}
        maxLength={500}
        multiline
        onChangeText={onNotesChange}
        placeholder="Add a cue, setup note, or reminder"
        placeholderTextColor={colors.inkMuted}
        style={styles.notesInput}
        textAlignVertical="top"
        value={notes ?? ''}
      />
    </View>
  );
}

interface TargetFieldProps {
  label: string;
  accessibilityLabel: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => boolean;
}

function TargetField({
  label,
  accessibilityLabel,
  value,
  placeholder,
  onCommit,
}: TargetFieldProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <View style={styles.targetField}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        keyboardType="decimal-pad"
        onBlur={() => {
          if (!onCommit(draftValue)) setDraftValue(value);
        }}
        onChangeText={setDraftValue}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        selectTextOnFocus
        style={styles.targetInput}
        value={draftValue}
      />
    </View>
  );
}

type NumericTargetField = 'reps' | 'load' | 'durationSeconds' | 'distanceMeters' | 'rpe' | 'rir';

function updateNumericTarget(
  target: SetTarget,
  field: NumericTargetField,
  rawValue: string,
  unitSystem: UnitSystem,
): SetTarget {
  const nextTarget: SetTarget = {
    ...target,
    reps: typeof target.reps === 'object' ? { ...target.reps } : target.reps,
    load: target.load ? { ...target.load } : undefined,
  };
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    if (field === 'load') {
      nextTarget.load = undefined;
    } else {
      delete nextTarget[field];
    }
    return nextTarget;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) return target;

  switch (field) {
    case 'reps':
      nextTarget.reps = Math.max(1, Math.round(parsedValue));
      break;
    case 'load':
      nextTarget.load = {
        ...nextTarget.load,
        value: Math.max(0, parsedValue),
        unit: nextTarget.load?.unit ?? unitSystem,
      };
      break;
    case 'durationSeconds':
      nextTarget.durationSeconds = Math.max(0, Math.round(parsedValue));
      break;
    case 'distanceMeters':
      nextTarget.distanceMeters = Math.max(0, parsedValue);
      break;
    case 'rpe':
      nextTarget.rpe = Math.min(10, Math.max(0, parsedValue));
      break;
    case 'rir':
      nextTarget.rir = Math.min(10, Math.max(0, parsedValue));
      break;
  }

  return nextTarget;
}

function formatRepsTarget(reps: SetTarget['reps']): string {
  if (reps === undefined) return '';
  if (typeof reps === 'number') return String(reps);
  return `${reps.min}-${reps.max}`;
}

function hasTargetValue(target: SetTarget): boolean {
  return Boolean(
    target.reps !== undefined ||
    target.durationSeconds !== undefined ||
    target.distanceMeters !== undefined ||
    target.load?.value !== undefined ||
    target.load?.percentOfEstimatedOneRepMax !== undefined ||
    target.rpe !== undefined ||
    target.rir !== undefined ||
    target.tempo,
  );
}

function formatFocusLabel(focus: Workout['focus']): string {
  return focus.charAt(0).toUpperCase() + focus.slice(1);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    marginTop: spacing.xxxl,
  },
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  fieldLabel: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 16,
  },
  versionCard: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  versionTitle: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  workoutCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyWorkout: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  emptyWorkoutButton: {
    alignSelf: 'flex-start',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metadataEditor: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  metadataFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metadataTitleField: {
    flexGrow: 1,
    flexBasis: 150,
    gap: spacing.xxs,
  },
  metadataNumberField: {
    width: 78,
    gap: spacing.xxs,
  },
  metadataInput: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontSize: 15,
  },
  focusLabel: {
    marginTop: spacing.xs,
  },
  focusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  targetEditor: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  targetHint: {
    marginTop: spacing.xxs,
  },
  targetFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  targetField: {
    width: 86,
    gap: spacing.xxs,
  },
  notesLabel: {
    marginTop: spacing.sm,
  },
  notesInput: {
    minHeight: 64,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontSize: 15,
  },
  targetInput: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontSize: 15,
  },
  exerciseCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  exerciseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: 180,
    gap: spacing.xxs,
  },
  iconAction: {
    backgroundColor: colors.canvas,
  },
  setCount: {
    minWidth: 18,
    textAlign: 'center',
  },
  substitutionPanel: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  substitutionButton: {
    alignSelf: 'stretch',
    marginTop: spacing.xxs,
  },
  addButton: {
    marginTop: spacing.md,
  },
  addExerciseButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: 0,
  },
  exercisePicker: {
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  pickerHint: {
    marginTop: spacing.xs,
  },
  pickerInput: {
    minHeight: 44,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    fontSize: 16,
  },
  pickerEmpty: {
    marginTop: spacing.md,
  },
  pickerButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: 0,
  },
  customButton: {
    marginTop: spacing.xs,
  },
  optionalWorkoutNote: {
    marginTop: spacing.xs,
  },
  savedCard: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.xl,
  },
  startButton: {
    marginTop: spacing.md,
  },
  startNote: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
