import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import {
  getWorkoutScheduleOverrides,
  getWorkoutScheduleSessions,
} from '../../src/db/calendarRepository';
import { getActiveTrainingCycle } from '../../src/db/cycleRepository';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { getUserProgramVersion } from '../../src/db/programRepository';
import { getCompletedWorkoutIds } from '../../src/db/progressRepository';
import { buildCurrentCycleWeekSchedule, formatDateKey } from '../../src/domain/calendar';
import { getTodayWorkout } from '../../src/domain/home';
import {
  demoCycle,
  demoProgram,
  demoProgramVersion,
  demoSchedule,
  demoUser,
  demoWorkout,
} from '../../src/domain/fixtures/home';
import { colors, radii, spacing } from '../../src/design/tokens';
import { useCurrentUserId } from '../../src/services/UserIdentityProvider';

export default function HomeScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [currentUser, setCurrentUser] = useState(demoUser);
  const [currentCycle, setCurrentCycle] = useState(demoCycle);
  const [currentProgram, setCurrentProgram] = useState(demoProgram);
  const [currentProgramVersion, setCurrentProgramVersion] = useState(demoProgramVersion);
  const [todayWorkout, setTodayWorkout] = useState(demoWorkout);
  const [schedule, setSchedule] = useState(demoSchedule);
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useFocusEffect(
    useCallback(() => {
      if (!database) return undefined;

      let active = true;
      void Promise.all([
        getOnboardingProfile(database, userId),
        getActiveTrainingCycle(database, userId),
      ])
        .then(async ([profile, cycle]) => {
          if (!active) return;
          if (!profile) {
            router.replace('/onboarding');
            return;
          }
          setCurrentUser(profile.user);
          if (!cycle) return;
          const [snapshot, completedIds, scheduleOverrides, scheduleSessions] = await Promise.all([
            getUserProgramVersion(database, userId, cycle.programVersionId),
            getCompletedWorkoutIds(database, cycle.id, cycle.currentWeek),
            getWorkoutScheduleOverrides(database, userId, cycle.id),
            getWorkoutScheduleSessions(database, cycle.id),
          ]);
          if (!active) return;
          setCurrentCycle(cycle);
          setCompletedWorkoutIds(completedIds);
          if (!snapshot) return;
          setCurrentProgram(snapshot.program);
          setCurrentProgramVersion(snapshot.version);
          const now = new Date();
          const cycleSchedule = buildCurrentCycleWeekSchedule(
            cycle,
            snapshot.version,
            scheduleOverrides,
            scheduleSessions,
            now,
          );
          const scheduledToday = cycleSchedule.find(
            (entry) => entry.date === formatDateKey(now) && entry.workoutId,
          );
          setTodayWorkout(
            snapshot.version.workouts.find((workout) => workout.id === scheduledToday?.workoutId) ??
              getTodayWorkout(snapshot.version, now) ??
              snapshot.version.workouts[0] ??
              demoWorkout,
          );
          setSchedule(cycleSchedule.length > 0 ? cycleSchedule : demoSchedule);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [database, userId]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text variant="h3" accessibilityRole="header">
            SHIFT6
          </Text>
          <Text variant="caption" tone="muted">
            {currentUser.displayName.toUpperCase()}'S TRAINING HOME
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
      <Button
        label="View cycle dashboard"
        variant="ghost"
        icon={<Ionicons name="analytics-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/cycle')}
        style={styles.cycleAction}
      />
      <Button
        label="Open calendar"
        variant="ghost"
        icon={<Ionicons name="calendar-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/calendar')}
        style={styles.calendarAction}
      />
      <Button
        label="View workout history"
        variant="ghost"
        icon={<Ionicons name="book-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/history')}
        style={styles.historyAction}
      />

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
        {schedule.map((entry) => {
          const workout = entry.workoutId
            ? currentProgramVersion.workouts.find(
                (candidate) =>
                  candidate.id === entry.workoutId || candidate.dayOfWeek === dayNumber(entry.day),
              )
            : null;
          const completed = workout ? completedWorkoutIds.has(workout.id) : false;
          const card = (
            <Card
              tone={
                completed
                  ? 'mint'
                  : entry.status === 'current'
                    ? 'ink'
                    : entry.category === 'cardio'
                      ? 'blue'
                      : entry.category === 'rest'
                        ? 'rest'
                        : 'white'
              }
              style={styles.scheduleCard}
            >
              <Text
                variant="caption"
                tone={completed || entry.status !== 'current' ? 'muted' : 'inverse'}
              >
                {entry.day}
              </Text>
              <View style={styles.scheduleIcon}>
                <Ionicons
                  name={
                    completed
                      ? 'checkmark'
                      : entry.category === 'cardio'
                        ? 'heart-outline'
                        : entry.category === 'rest'
                          ? 'moon-outline'
                          : 'barbell-outline'
                  }
                  size={20}
                  color={completed || entry.status !== 'current' ? colors.ink : colors.white}
                />
              </View>
              <Text
                variant="smallMedium"
                tone={completed || entry.status !== 'current' ? 'default' : 'inverse'}
              >
                {completed ? `${entry.title} complete` : entry.title}
              </Text>
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
              style={({ pressed }) => [pressed && styles.schedulePressed]}
            >
              {card}
            </Pressable>
          ) : (
            <View key={entry.id}>{card}</View>
          );
        })}
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
  cycleAction: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  calendarAction: {
    alignSelf: 'flex-start',
  },
  historyAction: {
    alignSelf: 'flex-start',
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
  schedulePressed: {
    opacity: 0.82,
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

function dayNumber(day: string): number {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day) + 1;
}
