import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, ErrorState, IconButton, Screen, Text } from '../src/components/ui';
import { findExerciseSubstitutions } from '../src/domain/equipment';
import { foundationalExercises } from '../src/domain/fixtures/exercises';
import { demoProgram, demoProgramVersion, demoUser } from '../src/domain/fixtures/home';
import { createTrainingCycle } from '../src/domain/cycle';
import {
  addExerciseToWorkout,
  createCustomExercise,
  createProgramCopy,
  removeExerciseFromWorkout,
  replaceExerciseInWorkout,
  reorderWorkoutExercises,
  renameProgram,
  setWorkoutExerciseSetCount,
} from '../src/domain/programBuilder';
import type { Exercise } from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { saveTrainingCycle } from '../src/db/cycleRepository';
import { saveCustomExercise, saveProgramVersion } from '../src/db/programRepository';
import { colors, radii, spacing } from '../src/design/tokens';

const copyId = 'program-custom-barbell-30-guest';
const copyVersionId = `${copyId}-version-1`;

export default function ProgramBuilderScreen() {
  const database = useLocalDatabase();
  const [draft, setDraft] = useState(() =>
    createProgramCopy({
      sourceProgram: demoProgram,
      sourceVersion: demoProgramVersion,
      userId: 'guest-user',
      newProgramId: copyId,
      newVersionId: copyVersionId,
      createdAt: new Date().toISOString(),
    }),
  );
  const [customName, setCustomName] = useState('');
  const [customExercises, setCustomExercises] = useState<Record<string, Exercise>>({});
  const [substitutionExerciseId, setSubstitutionExerciseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const updateDraftVersion = (update: (version: typeof draft.version) => typeof draft.version) => {
    setDraft((current) => ({ ...current, version: update(current.version) }));
    setSaved(false);
    setError(null);
  };

  const handleAddPlank = () => {
    if (!firstWorkout) return;
    setDraft((current) => ({
      ...current,
      version: addExerciseToWorkout(current.version, firstWorkout.id, {
        exerciseId: 'exercise-front-plank',
        setCount: 2,
        target: { durationSeconds: 30 },
      }),
    }));
    setSaved(false);
    setError(null);
  };

  const handleAddCustomExercise = () => {
    if (!firstWorkout) return;
    try {
      const exercise = createCustomExercise({
        id: `${copyId}-custom-exercise-${Object.keys(customExercises).length + 1}`,
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

    setStarting(true);
    setError(null);
    try {
      const program = renameProgram(draft.program, draft.program.title);
      const startedAt = new Date().toISOString();
      const cycle = createTrainingCycle({
        id: `cycle-guest-user-${draft.program.id}`,
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
        Make it yours.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        This is a private copy of Barbell 30. Your edits create a user-owned version and leave the
        public template and completed history unchanged.
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
          The source version is copied before editing, so future template changes cannot rewrite
          this draft or its history.
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
          {workout.exercises.map((exercise, exerciseIndex) => {
            const exerciseName = exerciseNameById.get(exercise.exerciseId) ?? 'Custom movement';
            const sourceExercise = foundationalExercises.find(
              (candidate) => candidate.id === exercise.exerciseId,
            );
            const substitutions = sourceExercise
              ? findExerciseSubstitutions(
                  sourceExercise,
                  foundationalExercises,
                  demoUser.equipmentIds,
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
          })}
        </Card>
      ))}

      <Button
        label="Add plank accessory"
        variant="secondary"
        icon={<Ionicons name="add-outline" size={18} color={colors.ink} />}
        onPress={handleAddPlank}
        style={styles.addButton}
      />

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
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  customButton: {
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
