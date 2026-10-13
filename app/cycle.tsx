import { selectDashboardCycle } from '../src/db/cycleHistoryRepository';
import {
  getCycleLifecycleEvents,
  appendCycleLifecycleEvent,
} from '../src/db/cycleLifecycleRepository';
import { lifecycleDate, summarizeLifecycle } from '../src/domain/cycleLifecycle';
import type { CycleLifecycleEvent } from '../src/domain/localPersistence';
import { useNotificationRuntime } from '../src/services/NotificationRuntimeProvider';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  SixWeekIndicator,
  Text,
} from '../src/components/ui';
import { buildCurrentCycleWeekSchedule } from '../src/domain/calendar';
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
  const params = useLocalSearchParams<{ cycleId?: string | string[] }>();
  const requestedSelection =
    params.cycleId === undefined || typeof params.cycleId === 'string'
      ? params.cycleId
      : '\u0000invalid-cycle';
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const { refreshNow } = useNotificationRuntime();
  const [otherActive, setOtherActive] = useState<TrainingCycle | null>(null);
  const [events, setEvents] = useState<CycleLifecycleEvent[]>([]);
  const [reviewDate, setReviewDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const context = useRef({ database, userId, requestedSelection });
  context.current = { database, userId, requestedSelection };
  const focusGeneration = useRef(0);
  const [cycle, setCycle] = useState<TrainingCycle | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [version, setVersion] = useState<ProgramVersion | null>(null);
  const [schedule, setSchedule] = useState<WeeklyScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<{
    database: typeof database;
    userId: string;
    requestedSelection: typeof requestedSelection;
  } | null>(null);
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

      const generation = ++focusGeneration.current;
      let active = true;
      setBusy(false);
      setEvents([]);
      setLoading(true);
      setError(null);
      setCycle(null);
      setProgram(null);
      setVersion(null);
      setLoadedFor(null);
      void selectDashboardCycle(database, userId, requestedSelection)
        .then(async (activeCycle) => {
          if (!active || !activeCycle) return;
          const currentActive = await getActiveTrainingCycle(database, userId);
          if (!active) return;
          setOtherActive(
            currentActive && currentActive.id !== activeCycle.id ? currentActive : null,
          );
          const snapshot = await getUserProgramVersion(
            database,
            userId,
            activeCycle.programVersionId,
          );
          if (!snapshot) return;
          const [completedIds, scheduleOverrides, scheduleSessions, journal] = await Promise.all([
            getCompletedWorkoutIds(database, activeCycle.id, activeCycle.currentWeek),
            getWorkoutScheduleOverrides(database, userId, activeCycle.id),
            getWorkoutScheduleSessions(database, activeCycle.id),
            getCycleLifecycleEvents(database, userId, activeCycle.id),
          ]);
          if (!active) return;
          setEvents(journal);
          setReviewDate(summarizeLifecycle(journal).reviewDate ?? '');
          setCycle(activeCycle);
          setCompletedWorkoutIds(completedIds);
          setProgram(snapshot.program);
          setVersion(snapshot.version);
          setLoadedFor({ database, userId, requestedSelection });
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
        .catch(() => {
          if (active) setError('We could not load your local cycle.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
        if (focusGeneration.current === generation) focusGeneration.current++;
      };
    }, [database, userId, reload, requestedSelection]),
  );

  const confirmAction = (kind: CycleLifecycleEvent['kind']) => {
    if (
      !database ||
      !cycle ||
      busy ||
      loadedFor?.userId !== userId ||
      loadedFor.database !== database ||
      loadedFor.requestedSelection !== requestedSelection
    )
      return;
    const summary = summarizeLifecycle(events);
    const timeZone = summary.latest?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const effectiveDate =
      kind === 'review-date' ? reviewDate : lifecycleDate(new Date().toISOString(), timeZone);
    const generation = focusGeneration.current;
    const operationId = `cycle-${kind}-${cycle.id}-${Date.now()}`;
    const message =
      kind === 'pause'
        ? `Pause this cycle today (${effectiveDate})? Saved sets and week ${cycle.currentWeek} stay intact.`
        : kind === 'resume'
          ? `Resume this cycle today (${effectiveDate}) at week ${cycle.currentWeek}? Targets stay unchanged. Choose an appropriate return to training; the app does not prescribe one.`
          : `Use ${effectiveDate} as your planned review date? This does not complete or advance any workout.`;
    const matches = () =>
      focusGeneration.current === generation &&
      context.current.database === database &&
      context.current.userId === userId &&
      context.current.requestedSelection === requestedSelection;
    let submitted = false;
    Alert.alert(
      kind === 'review-date'
        ? 'Confirm review date'
        : kind === 'pause'
          ? 'Pause cycle?'
          : 'Resume cycle?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            if (!matches() || submitted) return;
            submitted = true;
            setBusy(true);
            setNotice(null);
            const event: CycleLifecycleEvent = {
              id: operationId,
              userId,
              cycleId: cycle.id,
              kind,
              effectiveDate,
              timeZone,
              previousEventId: summary.latest?.id ?? null,
              operationId,
              recordedAt: new Date().toISOString(),
            };
            void appendCycleLifecycleEvent(database, event)
              .then(async () => {
                if (!matches()) return;
                let reminderMessage = '';
                try {
                  const result = await refreshNow();
                  if (result.status === 'failed')
                    reminderMessage = ' Reminders could not refresh; reopen reminder settings.';
                } catch {
                  reminderMessage = ' Reminders could not refresh; reopen reminder settings.';
                }
                if (!matches()) return;
                setNotice(`Saved on this device.${reminderMessage}`);
                setReload((value) => value + 1);
              })
              .catch((failure: unknown) => {
                if (matches())
                  setNotice(
                    failure instanceof Error ? failure.message : 'This action could not be saved.',
                  );
              })
              .finally(() => {
                if (matches()) setBusy(false);
              });
          },
        },
      ],
    );
  };

  if (
    loading ||
    (database &&
      cycle &&
      (loadedFor?.database !== database || loadedFor.requestedSelection !== requestedSelection))
  ) {
    return (
      <Screen>
        <LoadingSkeleton height={44} />
        <LoadingSkeleton height={190} style={styles.loadingCard} />
        <LoadingSkeleton height={260} style={styles.loadingCard} />
      </Screen>
    );
  }

  if (!database || !cycle || !program || !version || loadedFor?.userId !== userId) {
    return (
      <Screen>
        <ErrorState
          title="Cycle unavailable"
          message={
            error ??
            'No active cycle and its saved program are available on this device. Return Home to choose or recover your plan.'
          }
        />
        <Button label="Return Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const currentWeek = cycle.weeks[cycle.currentWeek - 1];
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
          onPress={() => router.replace('/')}
        />
        <Text variant="caption" tone="muted">
          CYCLE DASHBOARD
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Button label="All saved cycles" variant="ghost" onPress={() => router.push('/cycles')} />
      <Button
        label="Read saved reflection"
        variant="ghost"
        onPress={() =>
          router.push({ pathname: '/cycle-reflection', params: { cycleId: cycle.id } })
        }
      />
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
              {currentWeek?.phase ?? 'In progress'} ·{' '}
              {cycle.status === 'complete'
                ? 'Ready for review'
                : cycle.status === 'paused'
                  ? 'Paused'
                  : 'In progress'}
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
      <Card style={styles.cycleCard}>
        <Text variant="h3">Your cycle, your timing.</Text>
        <Text variant="small" tone="muted">
          Pausing keeps saved results and prescribed targets. Return-to-training prescriptions need
          qualified review; this app does not invent them.
        </Text>
        {cycle.status === 'paused' && !events.some((event) => event.kind === 'pause') ? (
          <Text variant="small" tone="muted">
            The earlier pause start is unknown. Resuming records today�s return without guessing a
            pause duration.
          </Text>
        ) : null}
        {summarizeLifecycle(events).unknownPriorPause ? (
          <Text variant="small" tone="muted">
            An earlier pause interval remains unknown.
          </Text>
        ) : null}
        {cycle.status === 'active' || cycle.status === 'paused' ? (
          <Button
            label={cycle.status === 'paused' ? 'Resume cycle' : 'Pause cycle'}
            disabled={busy || (cycle.status === 'paused' && otherActive !== null)}
            onPress={() => confirmAction(cycle.status === 'paused' ? 'resume' : 'pause')}
          />
        ) : null}
        {cycle.status === 'paused' && otherActive ? (
          <>
            <Text variant="small">
              Another cycle is active. Open and pause it explicitly before resuming this cycle.
            </Text>
            <Button
              label="Open active cycle"
              onPress={() =>
                router.push({ pathname: '/cycle', params: { cycleId: otherActive.id } })
              }
            />
          </>
        ) : null}
        <Text variant="smallMedium">Planned review date (YYYY-MM-DD)</Text>
        <TextInput
          accessibilityLabel="Planned review date"
          value={reviewDate}
          onChangeText={setReviewDate}
          editable={!busy}
          maxLength={10}
          placeholder="YYYY-MM-DD"
          style={{ padding: 12, borderWidth: 1, borderColor: colors.ink, borderRadius: 8 }}
        />
        <Button
          label="Confirm review date"
          variant="secondary"
          disabled={busy || !reviewDate}
          onPress={() => confirmAction('review-date')}
        />
        {notice ? (
          <View>
            <Text variant="small" accessibilityRole="alert">
              {notice}
            </Text>
            <Button
              label="Refresh cycle"
              variant="ghost"
              disabled={busy}
              onPress={() => setReload((value) => value + 1)}
            />
          </View>
        ) : null}
        {summarizeLifecycle(events).ordered.map((event) => (
          <Text variant="small" key={event.id}>
            {event.kind === 'review-date'
              ? 'Review planned'
              : event.kind === 'pause'
                ? 'Paused'
                : 'Resumed'}
            : {event.effectiveDate} ({event.timeZone})
          </Text>
        ))}
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
          {currentWeek?.completedWorkoutCount ?? 0}/{currentWeek?.plannedWorkoutCount ?? 0}
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
              disabled={cycle.status !== 'active'}
              accessibilityState={{ disabled: cycle.status !== 'active' }}
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
        label={
          requestedSelection !== undefined
            ? 'Read saved reflection'
            : isComplete
              ? 'Open cycle review'
              : 'Open progress'
        }
        variant="secondary"
        icon={<Ionicons name="arrow-forward" size={18} color={colors.ink} />}
        onPress={() =>
          router.push(
            requestedSelection !== undefined
              ? { pathname: '/cycle-reflection', params: { cycleId: cycle.id } }
              : isComplete
                ? '/review'
                : '/progress',
          )
        }
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
