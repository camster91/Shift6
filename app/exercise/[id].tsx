import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, EmptyState, IconButton, Screen, Text } from '../../src/components/ui';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { getUserExercises } from '../../src/db/programRepository';
import { useLocalDatabase } from '../../src/db/context';
import {
  assessExerciseContent,
  isExerciseAvailableToUser,
} from '../../src/domain/contentReadiness';
import {
  equipmentCatalog,
  explainExerciseSubstitution,
  findExerciseSubstitutions,
} from '../../src/domain/equipment';
import { foundationalExercises } from '../../src/domain/fixtures/exercises';
import { demoUser } from '../../src/domain/fixtures/home';
import type { Exercise } from '../../src/domain/types';
import { colors, spacing } from '../../src/design/tokens';
import { useCurrentUserId } from '../../src/services/UserIdentityProvider';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [availableEquipmentIds, setAvailableEquipmentIds] = useState(demoUser.equipmentIds);
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const catalogueExercises = useMemo(
    () => foundationalExercises.filter((exercise) => isExerciseAvailableToUser(exercise, __DEV__)),
    [],
  );
  const availableExercises = useMemo(
    () => [...catalogueExercises, ...customExercises],
    [catalogueExercises, customExercises],
  );
  const exercise = availableExercises.find((candidate) => candidate.id === id);

  useEffect(() => {
    if (!database) return;

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
  }, [database, userId]);

  if (!exercise) {
    return (
      <Screen>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />
          label="Back to Exercise Library"
          onPress={() => router.back()}
        />
        <EmptyState
          title="Movement not found"
          message="This exercise is not available in the current catalogue."
        />
      </Screen>
    );
  }

  const contentReadiness = assessExerciseContent(exercise);
  const publicationReady = contentReadiness.readyForPublication;
  const substitutions = findExerciseSubstitutions(
    exercise,
    availableExercises,
    availableEquipmentIds,
    4,
  );
  const equipmentNames = exercise.equipmentIds.map(
    (equipmentId) =>
      equipmentCatalog.find((equipment) => equipment.id === equipmentId)?.name ?? equipmentId,
  );

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />
          label="Back to Exercise Library"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          EXERCISE DETAIL
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {exercise.name}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {formatLabel(exercise.movementPattern)} · {exercise.trackingType} ·{' '}
        {exercise.unilateral ? 'unilateral' : 'bilateral'}
      </Text>

      <Card
        tone={exercise.isCustom ? 'blue' : publicationReady ? 'white' : 'lavender'}
        style={styles.statusCard}
      >
        <Text
          variant="caption"
          tone={exercise.isCustom ? 'muted' : publicationReady ? 'success' : 'warning'}
        >
          {exercise.isCustom
            ? 'PRIVATE CUSTOM MOVEMENT'
            : publicationReady
              ? 'REVIEWED CATALOGUE RECORD'
              : 'DEVELOPMENT PREVIEW · CONTENT REVIEW PENDING'}
        </Text>
        <Text variant="small" tone="muted" style={styles.statusCopy}>
          {exercise.isCustom
            ? 'This movement is private user-authored content and is not represented as a reviewed public catalogue record.'
            : publicationReady
              ? 'This catalogue record has the content-review provenance required for public exercise instruction.'
              : 'This draft record is visible only for development QA. It is not a substitute for human-reviewed exercise instruction.'}
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Equipment
      </Text>
      <View style={styles.chips}>
        {equipmentNames.map((name) => (
          <Chip key={name} label={name} selected />
        ))}
      </View>

      <Card tone="white" style={styles.contentCard}>
        <Text variant="h3">Setup</Text>
        <Text variant="body" tone="muted" style={styles.bodyCopy}>
          {exercise.setup}
        </Text>
        <Text variant="h3" style={styles.subsectionTitle}>
          Instructions
        </Text>
        <View style={styles.list}>
          {exercise.instructions.map((instruction, index) => (
            <Text key={instruction} variant="body" tone="muted">
              {index + 1}. {instruction}
            </Text>
          ))}
        </View>
        <Text variant="h3" style={styles.subsectionTitle}>
          Technique cues
        </Text>
        <View style={styles.list}>
          {exercise.techniqueCues.map((cue) => (
            <Text key={cue} variant="body" tone="muted">
              • {cue}
            </Text>
          ))}
        </View>
      </Card>

      {exercise.notes ? (
        <Card tone="blue" style={styles.notesCard} accessibilityLabel="Private exercise notes">
          <Text variant="h3">Private notes</Text>
          <Text variant="body" tone="muted" style={styles.bodyCopy}>
            {exercise.notes}
          </Text>
        </Card>
      ) : null}

      <Card tone="yellow" style={styles.safetyCard} accessibilityLabel="Safety notes">
        <Text variant="h3">Safety notes</Text>
        <View style={styles.list}>
          {exercise.safetyNotes.map((note) => (
            <Text key={note} variant="small" tone="muted">
              • {note}
            </Text>
          ))}
        </View>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Compatible substitutions
      </Text>
      {substitutions.length > 0 ? (
        substitutions.map((candidate) => {
          const candidatePublicationReady = assessExerciseContent(candidate).readyForPublication;
          return (
            <Card key={candidate.id} tone="white" style={styles.substitutionCard}>
              <Text variant="smallMedium">{candidate.name}</Text>
              <Text variant="small" tone="muted">
                {formatLabel(candidate.movementPattern)} · {candidate.primaryMuscles.join(', ')}
              </Text>
              <Text
                variant="caption"
                tone={candidate.isCustom ? 'muted' : candidatePublicationReady ? 'success' : 'warning'}
              >
                {candidate.isCustom
                  ? 'Private custom movement'
                  : candidatePublicationReady
                    ? 'Reviewed catalogue record'
                    : 'Draft preview'}
              </Text>
              <Text variant="small" tone="muted">
                {explainExerciseSubstitution(exercise, candidate)}
              </Text>
            </Card>
          );
        })
      ) : (
        <EmptyState
          title="No compatible substitution yet"
          message="Add more equipment or review the available catalogue to find another movement."
        />
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
  statusCard: {
    marginTop: spacing.xl,
  },
  statusCopy: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  contentCard: {
    marginTop: spacing.xl,
  },
  bodyCopy: {
    marginTop: spacing.sm,
  },
  subsectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  safetyCard: {
    marginTop: spacing.xl,
  },
  notesCard: {
    marginTop: spacing.xl,
  },
  substitutionCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
});
