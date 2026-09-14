import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  IconButton,
  ProgressIndicator,
  Screen,
  SixWeekIndicator,
  Text,
  WorkoutCard,
} from '../../src/components/ui';
import { useLocalDatabase } from '../../src/db/context';
import { getActiveTrainingCycle } from '../../src/db/cycleRepository';
import { getUserProgramVersion } from '../../src/db/programRepository';
import {
  demoCycle,
  demoProgram,
  demoSchedule,
  demoUser,
  demoWorkout,
} from '../../src/domain/fixtures/home';
import { colors, radii, spacing } from '../../src/design/tokens';

export default function HomeScreen() {
  const database = useLocalDatabase();
  const [currentCycle, setCurrentCycle] = useState(demoCycle);
  const [currentProgram, setCurrentProgram] = useState(demoProgram);
  const [todayWorkout, setTodayWorkout] = useState(demoWorkout);

  useEffect(() => {
    if (!database) return;

    let active = true;
    void getActiveTrainingCycle(database, 'guest-user')
      .then(async (cycle) => {
        if (!active || !cycle) return;
        setCurrentCycle(cycle);
        const snapshot = await getUserProgramVersion(
          database,
          'guest-user',
          cycle.programVersionId,
        );
        if (!active || !snapshot) return;
        setCurrentProgram(snapshot.program);
        setTodayWorkout(snapshot.version.workouts[0] ?? demoWorkout);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [database]);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text variant="h3" accessibilityRole="header">
            SHIFT6
          </Text>
          <Text variant="caption" tone="muted">
            {demoUser.displayName.toUpperCase()}'S TRAINING HOME
          </Text>
        </View>
        <IconButton
          icon={<Ionicons name="person-outline" size={20} color={colors.ink} />}
          label="Open profile"
          onPress={() => router.navigate('/profile')}
        />
      </View>

      <View style={styles.intro}>
        <Text variant="caption" tone="muted">
          YOUR NEXT SIX
        </Text>
        <Text variant="display" accessibilityRole="header" style={styles.displayTitle}>
          Progress, six weeks at a time.
        </Text>
      </View>

      <Card tone="lavender" style={styles.cycleCard}>
        <View style={styles.cycleTopRow}>
          <View>
            <Text variant="caption" tone="muted">
              CURRENT CYCLE
            </Text>
            <Text variant="h2" style={styles.cycleTitle}>
              Week {currentCycle.currentWeek} of 6
            </Text>
            <Text variant="small" tone="muted">
              {currentProgram.title} · {currentCycle.weeks[currentCycle.currentWeek - 1]?.phase}
            </Text>
          </View>
          <View style={styles.cycleBadge}>
            <Text variant="h3">6</Text>
            <Text variant="caption" tone="muted">
              WEEKS
            </Text>
          </View>
        </View>
        <View style={styles.cycleIndicator}>
          <SixWeekIndicator weeks={currentCycle.weeks} />
        </View>
        <ProgressIndicator label="Cycle progress" value={currentCycle.currentWeek / 6} />
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="caption" tone="muted">
            TODAY'S WORKOUT
          </Text>
          <Text variant="h2">Ready when you are.</Text>
        </View>
        <Chip label={`${todayWorkout.estimatedDurationMinutes} min`} selected />
      </View>

      <WorkoutCard
        workout={todayWorkout}
        onPress={() =>
          router.push({ pathname: '/workout', params: { workoutId: todayWorkout.id } })
        }
      />
      <Button
        label="Start workout"
        icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
        onPress={() =>
          router.push({ pathname: '/workout', params: { workoutId: todayWorkout.id } })
        }
        style={styles.primaryAction}
      />

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="caption" tone="muted">
            THIS WEEK
          </Text>
          <Text variant="h2">A steady rhythm.</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scheduleList}
      >
        {demoSchedule.map((entry) => (
          <Card
            key={entry.id}
            tone={
              entry.status === 'current'
                ? 'ink'
                : entry.category === 'cardio'
                  ? 'blue'
                  : entry.category === 'rest'
                    ? 'rest'
                    : 'white'
            }
            style={styles.scheduleCard}
            accessibilityLabel={`${entry.day}, ${entry.title}, ${entry.status}`}
          >
            <Text variant="caption" tone={entry.status === 'current' ? 'inverse' : 'muted'}>
              {entry.day}
            </Text>
            <View style={styles.scheduleIcon}>
              <Ionicons
                name={
                  entry.category === 'cardio'
                    ? 'heart-outline'
                    : entry.category === 'rest'
                      ? 'moon-outline'
                      : 'barbell-outline'
                }
                size={20}
                color={entry.status === 'current' ? colors.white : colors.ink}
              />
            </View>
            <Text variant="smallMedium" tone={entry.status === 'current' ? 'inverse' : 'default'}>
              {entry.title}
            </Text>
          </Card>
        ))}
      </ScrollView>

      <Card tone="white" style={styles.attentionCard}>
        <View style={styles.attentionIcon}>
          <Ionicons name="sparkles-outline" size={20} color={colors.ink} />
        </View>
        <View style={styles.attentionCopy}>
          <Text variant="smallMedium">Your first week is for repeatability.</Text>
          <Text variant="small" tone="muted">
            Start conservatively, log what happened, and let the next session learn from it.
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intro: {
    marginTop: spacing.xxxl,
    gap: spacing.xs,
  },
  displayTitle: {
    maxWidth: 560,
  },
  cycleCard: {
    marginTop: spacing.xl,
  },
  cycleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cycleTitle: {
    marginTop: spacing.xs,
  },
  cycleBadge: {
    width: 68,
    height: 68,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleIndicator: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginTop: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  primaryAction: {
    marginTop: spacing.md,
  },
  scheduleList: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
  },
  scheduleCard: {
    width: 112,
    minHeight: 140,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  attentionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
