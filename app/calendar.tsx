import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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
  buildWorkoutScheduleOverrideId,
  canMoveScheduleOccurrence,
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
  saveWorkoutScheduleOverride,
} from '../src/db/calendarRepository';
import { getActiveTrainingCycle } from '../src/db/cycleRepository';
import { getUserProgramVersion } from '../src/db/programRepository';
import { colors, spacing } from '../src/design/tokens';
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
  const userId = useCurrentUserId();
  const [cycle, setCycle] = useState<TrainingCycle | null>(database ? null : demoCycle);
  const [program, setProgram] = useState<Program | null>(database ? null : demoProgram);
  const [programVersion, setProgramVersion] = useState<ProgramVersion | null>(
    database ? null : demoProgramVersion,
  );
  const [overrides, setOverrides] = useState<WorkoutScheduleOverride[]>([]);
  const [sessions, setSessions] = useState<WorkoutScheduleSession[]>([]);
  const [loading, setLoading] = useState(database !== null);
  const [movingOccurrenceId, setMovingOccurrenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  useFocusEffect(
    useCallback(() => {
      if (!database) {
        setLoading(false);
        return undefined;
      }

      let active = true;
      setLoading(true);
      setError(null);
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

          const [snapshot, nextOverrides, nextSessions] = await Promise.all([
            getUserProgramVersion(database, userId, activeCycle.programVersionId),
            getWorkoutScheduleOverrides(database, userId, activeCycle.id),
            getWorkoutScheduleSessions(database, activeCycle.id),
          ]);
          if (!active) return;
          if (!snapshot) throw new Error('The active cycle snapshot is not available locally.');
          setCycle(activeCycle);
          setProgram(snapshot.program);
          setProgramVersion(snapshot.version);
          setOverrides(nextOverrides);
          setSessions(nextSessions);
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
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [database, reloadToken, userId]),
  );

  const schedule = useMemo(
    () =>
      cycle && programVersion
        ? buildCycleSchedule(cycle, programVersion, overrides, sessions, new Date())
        : [],
    [cycle, overrides, programVersion, sessions],
  );

  if (loading) {
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

  if (!cycle || !program || !programVersion) {
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

  const groupedSchedule = cycle.weeks.map((week) => ({
    week,
    occurrences: schedule.filter((occurrence) => occurrence.cycleWeek === week.weekNumber),
  }));

  const handleMove = async (occurrence: PlannedWorkoutOccurrence, dayDelta: number) => {
    if (movingOccurrenceId || !canMoveScheduleOccurrence(occurrence, todayKey, dayDelta)) return;

    const scheduledDate = addDaysToDateKey(occurrence.scheduledDate, dayDelta);
    const now = new Date().toISOString();
    const nextOverride: WorkoutScheduleOverride = {
      id: buildWorkoutScheduleOverrideId(
        occurrence.cycleId,
        occurrence.cycleWeek,
        occurrence.workout.id,
      ),
      userId: cycle.userId,
      cycleId: occurrence.cycleId,
      cycleWeek: occurrence.cycleWeek,
      workoutId: occurrence.workout.id,
      originalDate: occurrence.originalDate,
      scheduledDate,
      createdAt: now,
      updatedAt: now,
    };
    const previousOverrides = overrides;
    setOverrides((current) => [
      ...current.filter(
        (override) =>
          !(
            override.cycleId === nextOverride.cycleId &&
            override.cycleWeek === nextOverride.cycleWeek &&
            override.workoutId === nextOverride.workoutId
          ),
      ),
      nextOverride,
    ]);
    setMovingOccurrenceId(occurrence.id);
    setError(null);

    if (!database) {
      setMovingOccurrenceId(null);
      return;
    }

    try {
      await saveWorkoutScheduleOverride(database, nextOverride);
    } catch (saveError) {
      setOverrides(previousOverrides);
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'We could not save this schedule change locally.',
      );
    } finally {
      setMovingOccurrenceId(null);
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
              {program.title.toUpperCase()}
            </Text>
            <Text variant="h2" style={styles.summaryTitle}>
              Week {cycle.currentWeek} of 6
            </Text>
            <Text variant="small" tone="muted">
              Starts {getScheduleDateLabel(getCycleStartDateKey(cycle))} · local plan
            </Text>
          </View>
          <Chip
            label={`${schedule.filter((item) => item.status === 'complete').length} complete`}
            selected
          />
        </View>
        <View style={styles.indicator}>
          <SixWeekIndicator weeks={cycle.weeks} />
        </View>
        <Text variant="small" tone="muted">
          Tap the arrow controls on an eligible session to move it one day earlier or later. Moved
          sessions retain their original cycle week.
        </Text>
      </Card>

      {!database && Platform.OS === 'web' ? (
        <Card tone="yellow" style={styles.previewNote} accessibilityLabel="Web calendar preview">
          <Text variant="caption" tone="muted">
            WEB PREVIEW
          </Text>
          <Text variant="small" tone="muted" style={styles.previewCopy}>
            Rescheduling works in this preview, but durable SQLite persistence is available in the
            native app build.
          </Text>
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
                        !canMoveScheduleOccurrence(occurrence, todayKey, -1)
                      }
                      onPress={() => void handleMove(occurrence, -1)}
                    />
                    <IconButton
                      icon={<Ionicons name="chevron-forward" size={18} color={colors.ink} />}
                      label={`Move ${occurrence.workout.title} later`}
                      disabled={
                        Boolean(movingOccurrenceId) ||
                        !canMoveScheduleOccurrence(occurrence, todayKey, 1)
                      }
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
