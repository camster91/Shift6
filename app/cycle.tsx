import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  IconButton,
  LoadingSkeleton,
  Screen,
  SixWeekIndicator,
  Text,
} from '../src/components/ui';
import { buildCurrentCycleWeekSchedule } from '../src/domain/calendar';
import {
  demoCycle,
  demoCycleWeeks,
  demoProgram,
  demoProgramVersion,
  demoSchedule,
} from '../src/domain/fixtures/home';
import type {
  Program,
  ProgramVersion,
  TrainingCycle,
  WeeklyScheduleEntry,
} from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import {
  getWorkoutScheduleOverrides,
  getWorkoutScheduleSessions,
} from '../src/db/calendarRepository';
import { getActiveTrainingCycle } from '../src/db/cycleRepository';
import { getUserProgramVersion } from '../src/db/programRepository';
import { getCompletedWorkoutIds } from '../src/db/progressRepository';
import { colors, spacing } from '../src/design/tokens';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function CycleDashboardScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [cycle, setCycle] = useState<TrainingCycle>(demoCycle);
  const [program, setProgram] = useState<Program>(demoProgram);
  const [version, setVersion] = useState<ProgramVersion>(demoProgramVersion);
  const [schedule, setSchedule] = useState<WeeklyScheduleEntry[]>(demoSchedule);
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(database !== null);

  useFocusEffect(
    useCallback(() => {
      if (!database) {
        setLoading(false);
        return undefined;
      }

      let active = true;
      setLoading(true);
      void getActiveTrainingCycle(database, userId)
        .then(async (activeCycle) => {
          if (!active || !activeCycle) return;
          const snapshot = await getUserProgramVersion(
            database,
            userId,
            activeCycle.programVersionId,
          );
          const [completedIds, scheduleOverrides, scheduleSessions] = await Promise.all([
            getCompletedWorkoutIds(database, activeCycle.id, activeCycle.currentWeek),
            getWorkoutScheduleOverrides(database, userId, activeCycle.id),
            getWorkoutScheduleSessions(database, activeCycle.id),
          ]);
          if (!active) return;
          setCycle(activeCycle);
          setCompletedWorkoutIds(completedIds);
          if (!snapshot) return;
          setProgram(snapshot.program);
          setVersion(snapshot.version);
          setSchedule(
            buildCurrentCycleWeekSchedule(
              activeCycle,
              snapshot.version,
              scheduleOverrides,
              scheduleSessions,
              new Date(),
            ),
          );
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [database, userId]),
  );

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton height={44} />
        <LoadingSkeleton height={190} style={styles.loadingCard} />
        <LoadingSkeleton height={260} style={styles.loadingCard} />
      </Screen>
    );
  }

  const currentWeek = cycle.weeks[cycle.currentWeek - 1] ?? demoCycleWeeks[0]!;
  const requiredWorkouts = version.workouts.filter((workout) => !workout.isOptional);
  const completedRequired = requiredWorkouts.filter((workout) =>
    completedWorkoutIds.has(workout.id),
  ).length;
  const isComplete = cycle.status === 'complete';

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Home"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          CYCLE DASHBOARD
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Your next six.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        A clear view of the work, the rhythm, and what comes next.
      </Text>

      <Card tone="lavender" style={styles.cycleCard} accessibilityLabel="Current six-week cycle">
        <View style={styles.cycleHeader}>
          <View style={styles.cycleHeaderCopy}>
            <Text variant="caption" tone="muted">
              {program.title.toUpperCase()}
            </Text>
            <Text variant="h1" style={styles.weekTitle}>
              Week {cycle.currentWeek} of 6
            </Text>
            <Text variant="small" tone="muted">
              {currentWeek.phase} ·{' '}
              {cycle.status === 'complete' ? 'Ready for review' : 'In progress'}
            </Text>
          </View>
          <Chip label={`${completedRequired}/${requiredWorkouts.length} done`} selected />
        </View>
        <View style={styles.indicator}>
          <SixWeekIndicator weeks={cycle.weeks} />
        </View>
        <Text variant="small" tone="muted">
          {version.cycleModel.weekSixMeaning === 'evaluation'
            ? 'Week 6 is an evaluation week.'
            : `Week 6 is ${formatWeekSixMeaning(version.cycleModel.weekSixMeaning)}.`}
        </Text>
      </Card>
      <Button
        label="Open calendar"
        variant="ghost"
        icon={<Ionicons name="calendar-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/calendar')}
        style={styles.calendarAction}
      />

      <View style={styles.sectionHeader}>
        <View>
          <Text variant="caption" tone="muted">
            THIS WEEK
          </Text>
          <Text variant="h2">Keep the rhythm visible.</Text>
        </View>
        <Text variant="smallMedium">
          {currentWeek.completedWorkoutCount}/{currentWeek.plannedWorkoutCount}
        </Text>
      </View>

      <View style={styles.scheduleList}>
        {schedule.map((entry) => {
          const workout = entry.workoutId
            ? version.workouts.find((candidate) => candidate.id === entry.workoutId)
            : undefined;
          const completed = workout ? completedWorkoutIds.has(workout.id) : false;
          const tone = completed
            ? 'mint'
            : entry.status === 'current'
              ? 'ink'
              : entry.category === 'cardio'
                ? 'blue'
                : entry.category === 'rest'
                  ? 'rest'
                  : 'white';
          const card = (
            <Card tone={tone} style={styles.scheduleCard}>
              <View style={styles.scheduleIcon}>
                <Ionicons
                  name={
                    completed
                      ? 'checkmark-circle'
                      : entry.category === 'cardio'
                        ? 'heart-outline'
                        : entry.category === 'rest'
                          ? 'moon-outline'
                          : 'barbell-outline'
                  }
                  size={22}
                  color={tone === 'ink' ? colors.white : colors.ink}
                />
              </View>
              <View style={styles.scheduleCopy}>
                <Text variant="caption" tone={tone === 'ink' ? 'inverse' : 'muted'}>
                  {entry.day}
                </Text>
                <Text variant="smallMedium" tone={tone === 'ink' ? 'inverse' : 'default'}>
                  {completed ? `${entry.title} complete` : entry.title}
                </Text>
              </View>
              {workout ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={tone === 'ink' ? colors.white : colors.inkMuted}
                />
              ) : null}
            </Card>
          );

          return workout ? (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`${entry.day}, ${entry.title}${completed ? ', complete' : ''}. Open workout.`}
              onPress={() =>
                router.push({ pathname: '/workout', params: { workoutId: workout.id } })
              }
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              {card}
            </Pressable>
          ) : (
            <View key={entry.id}>{card}</View>
          );
        })}
      </View>

      <Card tone="white" style={styles.insightCard}>
        <Ionicons name="analytics-outline" size={24} color={colors.ink} />
        <Text variant="h3" style={styles.insightTitle}>
          Progress is more than one number.
        </Text>
        <Text variant="small" tone="muted" style={styles.insightCopy}>
          SHIFT6 keeps adherence, strength, cardio, effort, and your own feedback together for the
          six-week review.
        </Text>
      </Card>

      <Button
        label={isComplete ? 'Open cycle review' : 'Open progress'}
        variant="secondary"
        icon={<Ionicons name="arrow-forward" size={18} color={colors.ink} />}
        onPress={() => router.push(isComplete ? '/review' : '/progress')}
        style={styles.action}
      />
    </Screen>
  );
}

function formatWeekSixMeaning(meaning: ProgramVersion['cycleModel']['weekSixMeaning']): string {
  switch (meaning) {
    case 'consolidation':
      return 'a consolidation week';
    case 'reduced-volume':
      return 'a reduced-volume week';
    case 'rep-pr':
      return 'a rep PR week';
    case 'technique':
      return 'a technique week';
    case 'normal-training':
      return 'normal training';
    case 'evaluation':
      return 'an evaluation week';
  }
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
  cycleCard: {
    marginTop: spacing.xl,
  },
  calendarAction: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  cycleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cycleHeaderCopy: {
    flex: 1,
  },
  weekTitle: {
    marginTop: spacing.xs,
  },
  indicator: {
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
  scheduleList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  scheduleCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  scheduleIcon: {
    width: 36,
    alignItems: 'center',
  },
  scheduleCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  pressed: {
    opacity: 0.78,
  },
  insightCard: {
    marginTop: spacing.xl,
  },
  insightTitle: {
    marginTop: spacing.md,
  },
  insightCopy: {
    marginTop: spacing.xs,
  },
  action: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
});
