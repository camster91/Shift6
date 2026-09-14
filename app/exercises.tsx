import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card, Chip, EmptyState, IconButton, Screen, Text } from '../src/components/ui';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { useLocalDatabase } from '../src/db/context';
import { foundationalExercises } from '../src/domain/fixtures/exercises';
import { searchExercises } from '../src/domain/exerciseCatalog';
import { demoUser } from '../src/domain/fixtures/home';
import { colors, radii, spacing } from '../src/design/tokens';

export default function ExerciseLibraryScreen() {
  const database = useLocalDatabase();
  const [query, setQuery] = useState('');
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState(demoUser.equipmentIds);

  useEffect(() => {
    if (!database) return;

    let active = true;
    void getOnboardingProfile(database, 'guest-user')
      .then((profile) => {
        if (active && profile) setAvailableEquipmentIds(profile.user.equipmentIds);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [database]);

  const visibleExercises = useMemo(
    () =>
      searchExercises(foundationalExercises, {
        query,
        availableEquipmentIds,
        compatibleOnly,
      }),
    [availableEquipmentIds, compatibleOnly, query],
  );

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
        <Chip label="50 foundational records" />
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
          actionLabel="Browse all"
          onAction={() => {
            setQuery('');
            setCompatibleOnly(false);
          }}
          icon={<Ionicons name="search-outline" size={28} color={colors.ink} />}
        />
      ) : (
        visibleExercises.map((exercise) => {
          const accessibilityLabel = `${exercise.name}. ${exercise.movementPattern}. ${exercise.contentStatus === 'draft' ? 'Technique review pending.' : 'Reviewed.'}`;
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
                <Text variant="caption" tone="warning" style={styles.reviewStatus}>
                  {exercise.contentStatus === 'draft'
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
