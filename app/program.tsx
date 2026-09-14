import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  IconButton,
  ProgramCard,
  Screen,
  SixWeekIndicator,
  Text,
} from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { saveTrainingCycle } from '../src/db/cycleRepository';
import { createTrainingCycle } from '../src/domain/cycle';
import { demoProgram, demoProgramVersion } from '../src/domain/fixtures/home';
import { saveProgramVersion } from '../src/db/programRepository';
import { colors, spacing } from '../src/design/tokens';

export default function ProgramDetailScreen() {
  const database = useLocalDatabase();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartCycle = async () => {
    if (starting) return;

    setStarting(true);
    setError(null);
    try {
      const startedAt = new Date().toISOString();
      const cycle = createTrainingCycle({
        id: `cycle-guest-user-${demoProgram.id}-${Date.now()}`,
        userId: 'guest-user',
        programVersion: demoProgramVersion,
        startedAt,
      });
      if (database) {
        await saveProgramVersion(database, 'guest-user', demoProgram, demoProgramVersion);
        await saveTrainingCycle(database, cycle);
      }
      router.replace('/');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'We could not start this cycle.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Programs"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          PROGRAM DETAIL
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Barbell 30
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Strength + conditioning for life. Efficient gym sessions organized into a six-week block.
      </Text>

      <ProgramCard program={demoProgram} />

      <Card tone="lavender" style={styles.cycleCard}>
        <View style={styles.cardHeader}>
          <Text variant="h3">Six-week shape</Text>
          <Text variant="smallMedium">30 min</Text>
        </View>
        <SixWeekIndicator
          weeks={demoProgramVersion.cycleModel.lengthWeeks === 6 ? demoWeeks : []}
        />
        <Text variant="small" tone="muted" style={styles.cardText}>
          Establish → repeat → build → challenge → consolidate and review. Week 6 is not a forced
          deload.
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Weekly structure
      </Text>
      {demoProgramVersion.workouts.map((workout) => (
        <Card key={workout.id} tone="white" style={styles.workoutCard}>
          <View style={styles.workoutHeader}>
            <Text variant="smallMedium">Day {workout.dayOfWeek}</Text>
            <Text variant="small" tone="muted">
              {workout.estimatedDurationMinutes} min
            </Text>
          </View>
          <Text variant="h3" style={styles.workoutTitle}>
            {workout.title}
          </Text>
          <Text variant="small" tone="muted">
            {workout.exercises.length} movements · {workout.equipmentIds.length} equipment types
            {workout.isOptional ? ' · optional' : ''}
          </Text>
          <Button
            label={`Open ${workout.title}`}
            variant="ghost"
            icon={<Ionicons name="arrow-forward" size={18} color={colors.ink} />}
            onPress={() => router.push({ pathname: '/workout', params: { workoutId: workout.id } })}
            style={styles.openWorkoutButton}
          />
        </Card>
      ))}

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      <Button
        label="Start six-week cycle"
        onPress={handleStartCycle}
        loading={starting}
        icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
        style={styles.startButton}
      />
      <Text variant="caption" tone="muted" style={styles.persistenceNote}>
        {database
          ? 'Your selected program version will be snapshotted on this device.'
          : Platform.OS === 'web'
            ? 'Web preview: cycle persistence is not active in this surface.'
            : 'This program version will be snapshotted locally before future sync.'}
      </Text>
    </Screen>
  );
}

const demoWeeks = Array.from({ length: 6 }, (_, index) => ({
  weekNumber: index + 1,
  label: `Week ${index + 1}`,
  phase: demoProgramVersion.cycleModel.phases[index + 1] ?? 'Training',
  status: index === 0 ? ('current' as const) : ('upcoming' as const),
  completedWorkoutCount: 0,
  plannedWorkoutCount: demoProgramVersion.workouts.filter((workout) => !workout.isOptional).length,
}));

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
  cycleCard: {
    marginTop: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cardText: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  workoutCard: {
    marginBottom: spacing.sm,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  openWorkoutButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 0,
  },
  startButton: {
    marginTop: spacing.xl,
  },
  persistenceNote: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
