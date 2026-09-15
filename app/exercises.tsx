import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card, Chip, EmptyState, IconButton, Screen, Text } from '../src/components/ui';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { getUserExercises } from '../src/db/programRepository';
import { useLocalDatabase } from '../src/db/context';
import { foundationalExercises } from '../src/domain/fixtures/exercises';
import { searchExercises, type ExerciseCategoryFilter } from '../src/domain/exerciseCatalog';
import { demoUser } from '../src/domain/fixtures/home';
import type { Difficulty, Exercise, ExerciseClassification } from '../src/domain/types';
import { colors, radii, spacing } from '../src/design/tokens';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function ExerciseLibraryScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [query, setQuery] = useState('');
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategoryFilter | undefined>();
  const [classificationFilter, setClassificationFilter] = useState<
    ExerciseClassification | undefined
  >();
  const [unilateralFilter, setUnilateralFilter] = useState<boolean | undefined>();
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState(demoUser.equipmentIds);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!database) {
        setCustomExercises([]);
        return undefined;
      }

      let active = true;
      void Promise.all([getOnboardingProfile(database, userId), getUserExercises(database, userId)])
        .then(([profile, exercises]) => {
          if (!active) return;
          if (profile) setAvailableEquipmentIds(profile.user.equipmentIds);
          setCustomExercises(exercises);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [database, userId]),
  );

  const availableExercises = useMemo(
    () => [...foundationalExercises, ...customExercises],
    [customExercises],
  );

  const visibleExercises = useMemo(
    () =>
      searchExercises(availableExercises, {
        query,
        availableEquipmentIds,
        compatibleOnly,
        difficulty: difficultyFilter,
        category: categoryFilter,
        classification: classificationFilter,
        unilateral: unilateralFilter,
      }),
    [
      availableEquipmentIds,
      availableExercises,
      categoryFilter,
      classificationFilter,
      compatibleOnly,
      difficultyFilter,
      query,
      unilateralFilter,
    ],
  );
  const hasActiveFilters = Boolean(
    query.trim() ||
    compatibleOnly ||
    difficultyFilter ||
    categoryFilter ||
    classificationFilter ||
    unilateralFilter !== undefined,
  );

  const clearFilters = () => {
    setQuery('');
    setCompatibleOnly(false);
    setDifficultyFilter(undefined);
    setCategoryFilter(undefined);
    setClassificationFilter(undefined);
    setUnilateralFilter(undefined);
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
          EXERCISE LIBRARY
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Find your next movement.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Search by movement, muscle, or training tag. Equipment fit stays visible as you browse.
      </Text>

      <TextInput
        accessibilityLabel="Search exercises"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder="Search exercises"
        placeholderTextColor={colors.inkMuted}
        returnKeyType="search"
        style={styles.searchInput}
        value={query}
      />

      <View style={styles.filterRow}>
        <Chip
          label={compatibleOnly ? 'My equipment' : 'All exercises'}
          selected={compatibleOnly}
          onPress={() => setCompatibleOnly((value) => !value)}
        />
        <Chip
          label={`${foundationalExercises.length} foundational${customExercises.length > 0 ? ` + ${customExercises.length} private` : ''}`}
        />
      </View>

      <View style={styles.filterGroup}>
        <Text variant="caption" tone="muted">
          DIFFICULTY
        </Text>
        <View style={styles.filterRow}>
          {difficultyFilters.map((filter) => (
            <Chip
              key={filter.value ?? 'any-difficulty'}
              label={filter.label}
              selected={difficultyFilter === filter.value}
              onPress={() => setDifficultyFilter(filter.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text variant="caption" tone="muted">
          TRAINING FOCUS
        </Text>
        <View style={styles.filterRow}>
          {categoryFilters.map((filter) => (
            <Chip
              key={filter.value ?? 'all-focus'}
              label={filter.label}
              selected={categoryFilter === filter.value}
              onPress={() => setCategoryFilter(filter.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text variant="caption" tone="muted">
          MOVEMENT TYPE
        </Text>
        <View style={styles.filterRow}>
          {classificationFilters.map((filter) => (
            <Chip
              key={filter.value ?? 'all-movement-types'}
              label={filter.label}
              selected={classificationFilter === filter.value}
              onPress={() => setClassificationFilter(filter.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text variant="caption" tone="muted">
          STANCE
        </Text>
        <View style={styles.filterRow}>
          {stanceFilters.map((filter) => (
            <Chip
              key={filter.label}
              label={filter.label}
              selected={unilateralFilter === filter.value}
              onPress={() => setUnilateralFilter(filter.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.resultHeader}>
        <Text variant="h2">{visibleExercises.length} movements</Text>
        <Text variant="small" tone="muted">
          {compatibleOnly ? 'Compatible with your setup' : 'Catalogue preview'}
        </Text>
      </View>

      {visibleExercises.length === 0 ? (
        <EmptyState
          title="No movement found"
          message="Try a different search or browse the full foundational catalogue."
          actionLabel={hasActiveFilters ? 'Clear filters' : 'Browse all'}
          onAction={clearFilters}
          icon={<Ionicons name="search-outline" size={28} color={colors.ink} />}
        />
      ) : (
        visibleExercises.map((exercise) => {
          const accessibilityLabel = `${exercise.name}. ${exercise.movementPattern}. ${exercise.isCustom ? 'Private custom movement.' : exercise.contentStatus === 'draft' ? 'Technique review pending.' : 'Reviewed.'}`;
          return (
            <Pressable
              key={exercise.id}
              accessibilityLabel={`${accessibilityLabel} Open exercise details.`}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })
              }
              style={({ pressed }) => [pressed && styles.exercisePressed]}
            >
              <Card
                tone={exercise.contentStatus === 'reviewed' ? 'white' : 'lavender'}
                style={styles.exerciseCard}
              >
                <View style={styles.exerciseHeader}>
                  <Text variant="h3" style={styles.exerciseName}>
                    {exercise.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
                </View>
                <Text variant="small" tone="muted" style={styles.exerciseMeta}>
                  {formatLabel(exercise.movementPattern)} · {exercise.primaryMuscles.join(', ')}
                </Text>
                <Text
                  variant="caption"
                  tone={exercise.isCustom ? 'muted' : 'warning'}
                  style={styles.reviewStatus}
                >
                  {exercise.isCustom
                    ? 'Private custom movement'
                    : exercise.contentStatus === 'draft'
                      ? 'Technique and media review pending'
                      : 'Reviewed catalogue record'}
                </Text>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

function formatLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const difficultyFilters: readonly { label: string; value: Difficulty | undefined }[] = [
  { label: 'Any level', value: undefined },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const categoryFilters: readonly {
  label: string;
  value: ExerciseCategoryFilter | undefined;
}[] = [
  { label: 'All focus', value: undefined },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Power', value: 'power' },
  { label: 'Cardio', value: 'cardio' },
];

const classificationFilters: readonly {
  label: string;
  value: ExerciseClassification | undefined;
}[] = [
  { label: 'All types', value: undefined },
  { label: 'Compound', value: 'compound' },
  { label: 'Isolation', value: 'isolation' },
];

const stanceFilters: readonly { label: string; value: boolean | undefined }[] = [
  { label: 'Both', value: undefined },
  { label: 'Unilateral', value: true },
  { label: 'Bilateral', value: false },
];

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
  searchInput: {
    minHeight: 52,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  filterGroup: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  resultHeader: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  exerciseCard: {
    marginBottom: spacing.sm,
  },
  exercisePressed: {
    opacity: 0.82,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  exerciseName: {
    flex: 1,
  },
  exerciseMeta: {
    marginTop: spacing.sm,
  },
  reviewStatus: {
    marginTop: spacing.md,
  },
});
