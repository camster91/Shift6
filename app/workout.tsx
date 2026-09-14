import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, IconButton, Screen, Text } from '../src/components/ui';
import { demoWorkout } from '../src/domain/fixtures/home';
import { colors, spacing } from '../src/design/tokens';

export default function WorkoutFoundationScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Home"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          WORKOUT PREVIEW
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {demoWorkout.title}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        The active workout surface is the next vertical-slice increment. This preview is already
        driven by typed program data.
      </Text>

      <Card tone="lavender" style={styles.nextCard}>
        <Text variant="caption" tone="muted">
          NEXT INCREMENT
        </Text>
        <Text variant="h3" style={styles.nextTitle}>
          Local-first set logging
        </Text>
        <Text variant="body" tone="muted">
          Each completed set will be written to SQLite and an idempotent outbox before the success
          state appears.
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Today’s movements
      </Text>
      {demoWorkout.exercises.map((workoutExercise) => (
        <Card key={workoutExercise.id} tone="white" style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Text variant="h3">{workoutExercise.order}</Text>
            <View style={styles.exerciseCopy}>
              <Text variant="bodyMedium">{formatExerciseName(workoutExercise.exerciseId)}</Text>
              <Text variant="small" tone="muted">
                {workoutExercise.sets.length} working sets
              </Text>
            </View>
            <Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />
          </View>
        </Card>
      ))}

      <Button
        label="Back to Home"
        variant="secondary"
        onPress={() => router.back()}
        style={styles.backButton}
      />
    </Screen>
  );
}

function formatExerciseName(exerciseId: string) {
  return exerciseId
    .replace('exercise-', '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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
  nextCard: {
    marginTop: spacing.xl,
  },
  nextTitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  exerciseCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  exerciseCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  backButton: {
    marginTop: spacing.xl,
  },
});
