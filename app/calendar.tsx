import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

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
} from '../src/components/ui';
import {
  addDaysToDateKey,
  buildCycleSchedule,
  formatDateKey,
  getCycleStartDateKey,
  getScheduleDateLabel,
  type PlannedWorkoutOccurrence,
} from '../src/domain/calendar';
import { demoCycle, demoProgram, demoProgramVersion } from '../src/domain/fixtures/home';
import type {
  Program,
  ProgramVersion,
  TrainingCycle,
  WorkoutScheduleOverride,
  WorkoutScheduleStatus,
  WorkoutScheduleSession,
} from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import {
  getWorkoutScheduleOverrides,
  getWorkoutScheduleSessions,
} from '../src/db/calendarRepository';
import {
  previewLocalScheduleMove,
  confirmLocalScheduleMove,
  getConfirmedScheduleTimeZone,
  type ScheduleMovePreview,
} from '../src/db/scheduleRevisionRepository';
import { getActiveTrainingCycle } from '../src/db/cycleRepository';
import { getUserProgramVersion } from '../src/db/programRepository';
import { colors, spacing } from '../src/design/tokens';
import { useNotificationRuntime } from '../src/services/NotificationRuntimeProvider';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

const calendarStatusLabels: Record<WorkoutScheduleStatus, string> = {
  complete: 'Complete',
  partial: 'Partial',
  skipped: 'Skipped',
  'in-progress': 'In progress',
  missed: 'Missed',
  current: 'Today',
  upcoming: 'Upcoming',
};

export default function CalendarScreen() {
  const database = useLocalDatabase();
  const notificationRuntime = useNotificationRuntime();
  const userId = useCurrentUserId();
  const currentContext = useRef({ database, userId });
  currentContext.current = { database, userId };
  const previewEnabled = __DEV__ && database === null;
  const [cycle, setCycle] = useState<TrainingCycle | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [programVersion, setProgramVersion] = useState<ProgramVersion | null>(null);
  const [overrides, setOverrides] = useState<WorkoutScheduleOverride[]>([]);
  const [previewUserId, setPreviewUserId] = useState(userId);
  const [sessions, setSessions] = useState<WorkoutScheduleSession[]>([]);
  const [anchorTimeZone, setAnchorTimeZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(database !== null);
  const [loadedFor, setLoadedFor] = useState<{ database: typeof database; userId: string } | null>(
    null,
  );
  const [movingOccurrenceId, setMovingOccurrenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const todayKey = formatDateKey(new Date());
  const focusGeneration = useRef(0),
    movePending = useRef(false);
  const [moveDraft, setMoveDraft] = useState<{
    occurrence: PlannedWorkoutOccurrence;
    date: string;
    originalTimeZone: string;
  } | null>(null);
  const [movePreview, setMovePreview] = useState<ScheduleMovePreview | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const generation = ++focusGeneration.current;
      setMoveDraft(null);
      setAnchorTimeZone(null);
      setMovePreview(null);
      setMoveError(null);
      if (!database) {
        setLoading(false);
        setCycle(null);
        setProgram(null);
        setProgramVersion(null);
        setOverrides([]);
        setPreviewUserId(userId);
        setSessions([]);
        setMovingOccurrenceId(null);
        setLoadedFor(null);
        setError(null);
        return undefined;
      }

      let active = true;
      setLoading(true);
      setError(null);
      setCycle(null);
      setProgram(null);
      setProgramVersion(null);
      setOverrides([]);
      setSessions([]);
      setMovingOccurrenceId(null);
      setLoadedFor(null);
      void getActiveTrainingCycle(database, userId)
        .then(async (activeCycle) => {
          if (!active || !activeCycle) {
            if (active) {
              setCycle(null);
              setProgram(null);
              setProgramVersion(null);
              setOverrides([]);
              setSessions([]);
            }
            return;
          }

          const [snapshot, nextOverrides, nextSessions, nextAnchorTimeZone] = await Promise.all([
            getUserProgramVersion(database, userId, activeCycle.programVersionId),
            getWorkoutScheduleOverrides(database, userId, activeCycle.id),
            getWorkoutScheduleSessions(database, activeCycle.id),
            getConfirmedScheduleTimeZone(database, userId, activeCycle.id),
          ]);
          if (!active) return;
          if (!snapshot) throw new Error('The active cycle snapshot is not available locally.');
          setCycle(activeCycle);
          setProgram(snapshot.program);
          setProgramVersion(snapshot.version);
          setOverrides(nextOverrides);
          setSessions(nextSessions);
          setAnchorTimeZone(nextAnchorTimeZone);
        })
        .catch((loadError) => {
          if (!active) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'We could not load the local training calendar.',
          );
        })
        .finally(() => {
          if (active) {
            setLoadedFor({ database, userId });
            setLoading(false);
          }
        });

      return () => {
        active = false;
        if (focusGeneration.current === generation) focusGeneration.current++;
      };
    }, [database, reloadToken, userId]),
  );

  const displayedCycle = previewEnabled ? demoCycle : cycle;
  const displayedProgram = previewEnabled ? demoProgram : program;
  const displayedVersion = previewEnabled ? demoProgramVersion : programVersion;
  const displayedOverrides = previewEnabled && previewUserId !== userId ? [] : overrides;
  const displayedSessions = previewEnabled ? [] : sessions;
  const schedule = useMemo(
    () =>
      displayedCycle && displayedVersion
        ? buildCycleSchedule(
            displayedCycle,
            displayedVersion,
            displayedOverrides,
            displayedSessions,
            new Date(),
          )
        : [],
    [displayedCycle, displayedOverrides, displayedVersion, displayedSessions],
  );

  if (!database && !previewEnabled) {
    return (
      <Screen>
        <Header />
        <ErrorState
          title="Calendar unavailable"
          message="Local training storage is unavailable. Reopen the app to restore your saved calendar."
        />
        <Button label="Return Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  if (database && (loading || loadedFor?.database !== database || loadedFor.userId !== userId)) {
    return (
      <Screen>
        <LoadingSkeleton width="34%" height={14} />
        <LoadingSkeleton width="76%" height={44} style={styles.loadingTitle} />
        <LoadingSkeleton height={220} style={styles.loadingCard} />
        <LoadingSkeleton height={380} style={styles.loadingCard} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Header />
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

  if (!displayedCycle || !displayedProgram || !displayedVersion) {
    return (
      <Screen>
        <Header />
        <EmptyState
          title="Your calendar starts with a cycle"
          message="Choose a program and start a six-week cycle to see the plan, history, and reschedule controls here."
          icon={<Ionicons name="calendar-outline" size={32} color={colors.ink} />}
          actionLabel="Browse programs"
          onAction={() => router.replace('/programs')}
        />
      </Screen>
    );
  }

  const groupedSchedule = displayedCycle.weeks.map((week) => ({
    week,
    occurrences: schedule.filter((occurrence) => occurrence.cycleWeek === week.weekNumber),
  }));
  const originalFirst = schedule.find((entry) => entry.cycleWeek === 1);
  const pinnedStart = originalFirst
    ? addDaysToDateKey(originalFirst.originalDate, -(originalFirst.workout.dayOfWeek - 1))
    : getCycleStartDateKey(displayedCycle);

  const eligible = (occurrence: PlannedWorkoutOccurrence) =>
    displayedCycle.status === 'active' &&
    occurrence.cycleWeek === displayedCycle.currentWeek &&
    !['complete', 'partial', 'skipped', 'in-progress'].includes(occurrence.status);
  const handleMove = (occurrence: PlannedWorkoutOccurrence, dayDelta: number) => {
    if (movingOccurrenceId || !eligible(occurrence)) return;
    const proposed = addDaysToDateKey(occurrence.scheduledDate, dayDelta);
    setMoveDraft({
      occurrence,
      date: proposed < todayKey ? todayKey : proposed,
      originalTimeZone: anchorTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setMovePreview(null);
    setMoveError(null);
    setReminderNotice(null);
  };
  const previewMove = async () => {
    if (!moveDraft || !database || movePending.current) return;
    const generation = focusGeneration.current;
    movePending.current = true;
    setMovingOccurrenceId(moveDraft.occurrence.id);
    setMoveError(null);
    try {
      const next = await previewLocalScheduleMove(
        database,
        {
          userId,
          cycleId: displayedCycle.id,
          programVersionId: displayedVersion.id,
          cycleWeek: moveDraft.occurrence.cycleWeek,
          workoutId: moveDraft.occurrence.workout.id,
          operationId: `schedule-move-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fromDate: moveDraft.occurrence.scheduledDate,
          toDate: moveDraft.date,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          originalTimeZone: moveDraft.originalTimeZone,
        },
        new Date().toISOString(),
      );
      if (
        focusGeneration.current === generation &&
        currentContext.current.database === database &&
        currentContext.current.userId === userId
      )
        setMovePreview(next);
    } catch (failure) {
      if (focusGeneration.current === generation)
        setMoveError(failure instanceof Error ? failure.message : 'Review the date again.');
    } finally {
      movePending.current = false;
      if (focusGeneration.current === generation) setMovingOccurrenceId(null);
    }
  };
  const confirmMove = async () => {
    if (!movePreview || !database || movePending.current) return;
    const generation = focusGeneration.current;
    const isCurrent = () =>
      focusGeneration.current === generation &&
      currentContext.current.database === database &&
      currentContext.current.userId === userId;
    movePending.current = true;
    setMovingOccurrenceId(moveDraft?.occurrence.id ?? 'pending');
    setMoveError(null);
    try {
      await confirmLocalScheduleMove(database, movePreview, new Date().toISOString(), isCurrent);
      if (!isCurrent()) return;
      const nextOverrides = await getWorkoutScheduleOverrides(database, userId, displayedCycle.id);
      if (!isCurrent()) return;
      setOverrides(nextOverrides);
      if (movePreview.baseline) setAnchorTimeZone(movePreview.baseline.timeZone);
      setMoveDraft(null);
      setMovePreview(null);
      setReminderNotice('Session date saved on this device.');
      try {
        const refreshed = await notificationRuntime.refreshNow();
        if (isCurrent() && refreshed.status === 'failed')
          setReminderNotice(
            'Date saved. Device reminders could not be refreshed; check notification settings.',
          );
      } catch {
        if (isCurrent())
          setReminderNotice(
            'Date saved. Device reminders could not be refreshed; check notification settings.',
          );
      }
    } catch (failure) {
      if (isCurrent()) {
        setMovePreview(null);
        setMoveError(
          failure instanceof Error ? failure.message : 'Your date was not saved. Review it again.',
        );
      }
    } finally {
      movePending.current = false;
      if (isCurrent()) setMovingOccurrenceId(null);
    }
  };

  return (
    <Screen>
      <Header />

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Plan the full six.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Move a session when life changes. Your workout history stays attached to the session you
        actually completed.
      </Text>

      <Card
        tone="lavender"
        style={styles.summaryCard}
        accessibilityLabel="Six-week calendar summary"
      >
        <View style={styles.summaryHeader}>
          <View style={styles.summaryCopy}>
            <Text variant="caption" tone="muted">
              {displayedProgram.title.toUpperCase()}
            </Text>
            <Text variant="h2" style={styles.summaryTitle}>
              Week {displayedCycle.currentWeek} of 6
            </Text>
            <Text variant="small" tone="muted">
              Starts {getScheduleDateLabel(pinnedStart)} · local plan
            </Text>
          </View>
          <Chip
            label={`${schedule.filter((item) => item.status === 'complete').length} complete`}
            selected
          />
        </View>
        <View style={styles.indicator}>
          <SixWeekIndicator weeks={displayedCycle.weeks} />
        </View>
        <Text variant="small" tone="muted">
          Tap the arrow controls on an eligible session to move it one day earlier or later. Moved
          sessions retain their original cycle week.
        </Text>
      </Card>

      {previewEnabled && Platform.OS === 'web' ? (
        <Card tone="yellow" style={styles.previewNote} accessibilityLabel="Web calendar preview">
          <Text variant="caption" tone="muted">
            WEB PREVIEW
          </Text>
          <Text variant="small" tone="muted" style={styles.previewCopy}>
            This development preview uses sample data. Schedule changes here are temporary; saved
            training is available in the native app build.
          </Text>
        </Card>
      ) : null}

      {moveDraft ? (
        <Card tone="white" accessibilityLabel="Review session date">
          <Text variant="h2">Move {moveDraft.occurrence.workout.title}</Text>
          <Text variant="small">
            Only an unstarted session in the current training week can move. Recorded workouts and
            targets stay unchanged.
          </Text>
          <TextInput
            accessibilityLabel="New session date YYYY-MM-DD"
            value={moveDraft.date}
            placeholder="YYYY-MM-DD"
            onChangeText={(date) => {
              setMoveDraft({ ...moveDraft, date });
              setMovePreview(null);
            }}
            editable={!movingOccurrenceId}
            style={{ borderWidth: 1, padding: spacing.md, marginVertical: spacing.sm }}
          />
          {!anchorTimeZone ? (
            <>
              <Text variant="small">
                Time zone when your cycle started. Check it if you have travelled.
              </Text>
              <TextInput
                accessibilityLabel="Original cycle timezone"
                value={moveDraft.originalTimeZone}
                onChangeText={(originalTimeZone) => {
                  setMoveDraft({ ...moveDraft, originalTimeZone });
                  setMovePreview(null);
                }}
                editable={!movingOccurrenceId}
                autoCapitalize="none"
                style={{ borderWidth: 1, padding: spacing.md, marginVertical: spacing.sm }}
              />
            </>
          ) : (
            <Text variant="small">Your original cycle dates are kept in {anchorTimeZone}.</Text>
          )}
          {movePreview ? (
            <View>
              <Text variant="smallMedium">
                {movePreview.move.fromDate} to {movePreview.move.toDate} ·{' '}
                {movePreview.move.timeZone}
              </Text>
              {movePreview.baseline ? (
                <View>
                  <Text variant="small">
                    Confirm the original six-week dates below in {movePreview.baseline.timeZone}.
                    Future travel preserves these dates.
                  </Text>
                  {displayedCycle.weeks.map((week) => (
                    <Text key={week.weekNumber} variant="small">
                      Week {week.weekNumber}:{' '}
                      {movePreview.dates
                        .filter((date) => date.cycleWeek === week.weekNumber)
                        .map(
                          (date) =>
                            `${date.scheduledDate} ${displayedVersion.workouts.find((workout) => workout.id === date.workoutId)?.title}`,
                        )
                        .join('; ')}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Button
                label="Confirm session date"
                onPress={() => void confirmMove()}
                loading={Boolean(movingOccurrenceId)}
              />
            </View>
          ) : (
            <Button
              label="Review date change"
              onPress={() => void previewMove()}
              loading={Boolean(movingOccurrenceId)}
            />
          )}
          {moveError ? (
            <Text variant="small" accessibilityLiveRegion="polite">
              {moveError}
            </Text>
          ) : null}
          <Button
            label="Cancel date change"
            variant="secondary"
            disabled={Boolean(movingOccurrenceId)}
            onPress={() => {
              setMoveDraft(null);
              setMovePreview(null);
              setMoveError(null);
            }}
          />
        </Card>
      ) : null}

      <View style={styles.legend} accessible={false}>
        <Chip label="Complete" selected />
        <Chip label="Moved" />
        <Chip label="Today" />
      </View>

      <View style={styles.weekList}>
        {groupedSchedule.map(({ week, occurrences }) => (
          <View key={week.weekNumber} style={styles.weekSection}>
            <View style={styles.weekHeader}>
              <View>
                <Text variant="caption" tone="muted">
                  WEEK {week.weekNumber}
                </Text>
                <Text variant="h2">{week.phase}</Text>
              </View>
              <Chip
                label={`${week.completedWorkoutCount}/${week.plannedWorkoutCount}`}
                selected={week.status === 'current'}
              />
            </View>
            <Card
              tone="white"
              style={styles.weekCard}
              accessibilityLabel={`Week ${week.weekNumber} schedule`}
            >
              {occurrences.map((occurrence, index) => (
                <View
                  key={occurrence.id}
                  style={[styles.occurrence, index > 0 && styles.occurrenceBorder]}
                >
                  <View style={styles.dateColumn}>
                    <Text variant="caption" tone="muted">
                      {getScheduleDateLabel(occurrence.scheduledDate)}
                    </Text>
                    {occurrence.isMoved ? (
                      <Text variant="caption" style={styles.movedLabel}>
                        MOVED
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.occurrenceCopy}>
                    <Text variant="smallMedium">{occurrence.workout.title}</Text>
                    <Text variant="small" tone="muted">
                      {formatWorkoutMeta(occurrence)}
                    </Text>
                    <Text variant="caption" tone={statusTone(occurrence.status)}>
                      {calendarStatusLabels[occurrence.status]}
                    </Text>
                  </View>
                  <View style={styles.controls}>
                    <IconButton
                      icon={<Ionicons name="chevron-back" size={18} color={colors.ink} />}
                      label={`Move ${occurrence.workout.title} earlier`}
                      disabled={
                        Boolean(movingOccurrenceId) ||
                        !eligible(occurrence) ||
                        occurrence.scheduledDate <= todayKey
                      }
                      onPress={() => void handleMove(occurrence, -1)}
                    />
                    <IconButton
                      icon={<Ionicons name="chevron-forward" size={18} color={colors.ink} />}
                      label={`Move ${occurrence.workout.title} later`}
                      disabled={Boolean(movingOccurrenceId) || !eligible(occurrence)}
                      onPress={() => void handleMove(occurrence, 1)}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </View>

      {error ? <ErrorState message={error} /> : null}
      {reminderNotice ? (
        <Text accessibilityLiveRegion="polite" variant="small">
          {reminderNotice}
        </Text>
      ) : null}

      <Button
        label="Back to cycle dashboard"
        variant="secondary"
        icon={<Ionicons name="arrow-back" size={18} color={colors.ink} />}
        onPress={() => router.replace('/cycle')}
        style={styles.backButton}
      />
    </Screen>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <IconButton
        icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
        label="Back to Home"
        onPress={() => router.back()}
      />
      <Text variant="caption" tone="muted">
        TRAINING CALENDAR
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function formatWorkoutMeta(occurrence: PlannedWorkoutOccurrence): string {
  const focus = occurrence.workout.focus[0]?.toUpperCase() + occurrence.workout.focus.slice(1);
  return `${focus} · ${occurrence.workout.estimatedDurationMinutes} min${occurrence.workout.isOptional ? ' · optional' : ''}`;
}

function statusTone(
  status: WorkoutScheduleStatus,
): 'default' | 'muted' | 'inverse' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'complete':
      return 'success';
    case 'partial':
    case 'current':
      return 'warning';
    case 'skipped':
    case 'missed':
      return 'error';
    default:
      return 'muted';
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
  summaryCard: {
    marginTop: spacing.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    marginTop: spacing.xs,
  },
  indicator: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  previewNote: {
    marginTop: spacing.md,
  },
  previewCopy: {
    marginTop: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  weekList: {
    marginTop: spacing.xxxl,
    gap: spacing.xl,
  },
  weekSection: {
    gap: spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  weekCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  occurrence: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  occurrenceBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateColumn: {
    width: 72,
    gap: spacing.xxs,
  },
  movedLabel: {
    color: colors.info,
  },
  occurrenceCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  backButton: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
});
