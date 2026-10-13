import { ShiftArtwork } from '../../src/components/artwork/ShiftArtwork';
import { shiftArtwork } from '../../src/design/artwork';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
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
import { buildCurrentCycleWeekSchedule } from '../../src/domain/calendar';
import { daysSinceLastTraining } from '../../src/domain/home';
import { selectTrainingWorkout } from '../../src/domain/trainingSelection';
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
  const previewEnabled = __DEV__ && database === null;
  const [currentUser, setCurrentUser] = useState(demoUser);
  const [currentCycle, setCurrentCycle] = useState<typeof demoCycle | null>(
    previewEnabled ? demoCycle : null,
  );
  const [currentProgram, setCurrentProgram] = useState<typeof demoProgram | null>(
    previewEnabled ? demoProgram : null,
  );
  const [currentProgramVersion, setCurrentProgramVersion] = useState<
    typeof demoProgramVersion | null
  >(previewEnabled ? demoProgramVersion : null);
  const [todayWorkout, setTodayWorkout] = useState<typeof demoWorkout | null>(
    previewEnabled ? demoWorkout : null,
  );
  const [schedule, setSchedule] = useState(previewEnabled ? demoSchedule : []);
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(!previewEnabled);
  const [loadedContext, setLoadedContext] = useState<{
    database: NonNullable<typeof database>;
    userId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [daysAway, setDaysAway] = useState<number | null>(null);
  const [hasUnfinishedWorkout, setHasUnfinishedWorkout] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!database) return undefined;

      let active = true;
      setLoading(true);
      setError(null);
      setCurrentCycle(null);
      setCurrentProgram(null);
      setCurrentProgramVersion(null);
      setTodayWorkout(null);
      setSchedule([]);
      setCompletedWorkoutIds(new Set());
      setDaysAway(null);
      setHasUnfinishedWorkout(false);
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
          if (!snapshot || snapshot.version.workouts.length === 0) {
            throw new Error('The active cycle snapshot is not available locally.');
          }
          setCurrentCycle(cycle);
          setCompletedWorkoutIds(completedIds);
          setCurrentProgram(snapshot.program);
          setCurrentProgramVersion(snapshot.version);
          const now = new Date();
          setDaysAway(daysSinceLastTraining(cycle.startedAt, scheduleSessions, now));
          const selection = selectTrainingWorkout(
            cycle,
            snapshot.version,
            scheduleOverrides,
            scheduleSessions,
            now,
          );
          setHasUnfinishedWorkout(selection?.basis === 'resumable');
          const cycleSchedule = buildCurrentCycleWeekSchedule(
            cycle,
            snapshot.version,
            scheduleOverrides,
            scheduleSessions,
            now,
          );
          setTodayWorkout(selection?.workout ?? null);
          setSchedule(cycleSchedule);
        })
        .catch((loadError) => {
          if (!active) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'We could not load your training home.',
          );
        })
        .finally(() => {
          if (active) {
            setLoadedContext({ database, userId });
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [database, reloadToken, userId]),
  );

  if (!database && !previewEnabled) {
    return (
      <Screen>
        <Text variant="h3" accessibilityRole="header">
          SHIFT6
        </Text>
        <ErrorState
          title="Local storage unavailable"
          message="SHIFT6 could not access on-device training storage. Reopen the app or use the storage recovery screen before continuing."
        />
      </Screen>
    );
  }

  if (
    loading ||
    (database && (loadedContext?.database !== database || loadedContext.userId !== userId))
  ) {
    return (
      <Screen>
        <LoadingSkeleton width="34%" height={14} />
        <LoadingSkeleton width="76%" height={44} style={styles.loadingTitle} />
        <LoadingSkeleton height={220} style={styles.loadingCard} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text variant="h3" accessibilityRole="header">
          SHIFT6
        </Text>
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
            setReloadToken((current) => current + 1);
          }}
        />
      </Screen>
    );
  }

  if (!currentCycle || !currentProgram || !currentProgramVersion) {
    return (
      <Screen>
        <Text variant="h3" accessibilityRole="header">
          SHIFT6
        </Text>
        <ShiftArtwork {...shiftArtwork.journey} />
        <EmptyState
          title="Your next Shift starts with one goal"
          message="Choose a goal and a six-week plan. Your sessions and training history will appear here when you start."
          icon={<Ionicons name="compass-outline" size={32} color={colors.ink} />}
          actionLabel="Explore programs"
          onAction={() => router.push('/programs')}
        />
        <Button
          label="Open saved cycle"
          variant="secondary"
          onPress={() => router.push('/cycle')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="h3" accessibilityRole="header">
            SHIFT6
          </Text>
          <Text variant="caption" tone="muted">
            {currentUser.displayName === 'You'
              ? 'YOUR TRAINING HOME'
              : `${currentUser.displayName.toUpperCase()}'S TRAINING HOME`}
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

      {todayWorkout ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <Text variant="caption" tone="muted">
                TODAY'S WORKOUT
              </Text>
              <Text variant="h2">
                {hasUnfinishedWorkout ? 'Continue where you left off.' : 'Ready when you are.'}
              </Text>
            </View>
            <Chip label={`${todayWorkout.estimatedDurationMinutes} min`} selected />
          </View>

          <WorkoutCard
            workout={todayWorkout}
            actionLabel={hasUnfinishedWorkout ? 'Resume workout' : 'Start workout'}
            onPress={() =>
              router.push({ pathname: '/workout', params: { workoutId: todayWorkout.id } })
            }
          />
          <Button
            label={hasUnfinishedWorkout ? 'Resume workout' : 'Start workout'}
            icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
            onPress={() =>
              router.push({ pathname: '/workout', params: { workoutId: todayWorkout.id } })
            }
            style={styles.primaryAction}
          />
        </>
      ) : (
        <Card>
          <Text variant="h3" accessibilityRole="header">
            No workout scheduled now
          </Text>
          <Text variant="body" tone="muted">
            Your saved cycle and history are still here. Check your calendar for the next training
            day.
          </Text>
          <Button
            label="Check training calendar"
            variant="secondary"
            onPress={() => router.push('/calendar')}
          />
        </Card>
      )}

      <ShiftArtwork {...shiftArtwork.journey} />

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
      </Card>
      <Button
        label="Personal goal"
        variant="secondary"
        onPress={() => router.push('/goal')}
        style={styles.cycleAction}
      />
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

      {daysAway !== null && daysAway >= 7 ? (
        <Card tone="mint">
          <ShiftArtwork {...shiftArtwork.return} />
          <Text variant="h3" accessibilityRole="header">
            Your plan is still here.
          </Text>
          <Text variant="body" tone="muted">
            You do not need to catch up on missed sessions. Choose a day that works for you, check
            how you feel before training, and take the next session at your own pace.
          </Text>
          <Button
            label="Choose a training day"
            variant="secondary"
            onPress={() => router.push('/calendar')}
          />
        </Card>
      ) : null}

      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
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
            ? currentProgramVersion.workouts.find((candidate) => candidate.id === entry.workoutId)
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
  loadingTitle: {
    marginTop: spacing.lg,
  },
  loadingCard: {
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
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
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionCopy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    minWidth: 0,
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
