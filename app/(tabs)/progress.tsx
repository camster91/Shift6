import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingSkeleton,
  ProgressIndicator,
  Screen,
  SixWeekIndicator,
  Text,
} from '../../src/components/ui';
import {
  demoCycle,
  demoProgram,
  demoProgramVersion,
  demoWorkout,
} from '../../src/domain/fixtures/home';
import { foundationalExercises } from '../../src/domain/fixtures/exercises';
import { buildNextSessionTargets, type NextSessionTarget } from '../../src/domain/nextSession';
import type { ExerciseProgress } from '../../src/domain/progress';
import { buildCycleProgressSummary, type CycleProgressSummary } from '../../src/domain/progression';
import { useLocalDatabase } from '../../src/db/context';
import { getLatestTrainingCycle } from '../../src/db/cycleRepository';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { getUserExercises, getUserProgramVersion } from '../../src/db/programRepository';
import {
  getCycleProgressSummary,
  getExerciseProgress,
  getLatestCompletedWorkoutSets,
} from '../../src/db/progressRepository';
import type { SetTarget } from '../../src/domain/types';
import { colors, spacing } from '../../src/design/tokens';

export default function ProgressScreen() {
  const database = useLocalDatabase();
  const [currentCycle, setCurrentCycle] = useState(demoCycle);
  const [currentProgram, setCurrentProgram] = useState(demoProgram);
  const [summary, setSummary] = useState<CycleProgressSummary>(() =>
    buildCycleProgressSummary(getPlannedWorkoutCount(demoCycle), []),
  );
  const [nextTargets, setNextTargets] = useState<NextSessionTarget[]>([]);
  const [exerciseChoices, setExerciseChoices] = useState<ProgressExerciseChoice[]>(() =>
    getProgressExerciseChoices(demoProgramVersion),
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    demoWorkout.exercises[0]?.exerciseId ?? null,
  );
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress | null>(null);
  const [exerciseProgressLoading, setExerciseProgressLoading] = useState(false);
  const [loading, setLoading] = useState(database !== null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const storedCycle = await getLatestTrainingCycle(database, 'guest-user');
        const cycle = storedCycle ?? demoCycle;
        const snapshot = storedCycle
          ? await getUserProgramVersion(database, 'guest-user', cycle.programVersionId)
          : null;
        const program = snapshot?.program ?? demoProgram;
        const programVersion = snapshot?.version ?? demoProgramVersion;
        const workout = programVersion.workouts[0] ?? demoWorkout;
        const [nextSummary, latestSets, profile, userExercises] = await Promise.all([
          getCycleProgressSummary(database, cycle.id, getPlannedWorkoutCount(cycle)),
          getLatestCompletedWorkoutSets(database, cycle.id, workout.id, programVersion.id),
          getOnboardingProfile(database, 'guest-user'),
          getUserExercises(database, 'guest-user'),
        ]);
        const nextExerciseChoices = getProgressExerciseChoices(programVersion, userExercises);
        const nextSelectedExerciseId = nextExerciseChoices.some(
          (choice) => choice.exerciseId === selectedExerciseId,
        )
          ? selectedExerciseId
          : (nextExerciseChoices[0]?.exerciseId ?? null);
        const selectedExerciseProgress = nextSelectedExerciseId
          ? await getExerciseProgress(database, cycle.id, nextSelectedExerciseId)
          : null;
        const nextSessionTargets = buildNextSessionTargets(
          workout,
          program.progressionStrategy,
          latestSets,
          profile?.user.unitSystem ?? 'imperial',
        );

        if (!active) return;
        setCurrentCycle(cycle);
        setCurrentProgram(program);
        setSummary(nextSummary);
        setNextTargets(latestSets.length > 0 ? nextSessionTargets : []);
        setExerciseChoices(nextExerciseChoices);
        setSelectedExerciseId(nextSelectedExerciseId);
        setExerciseProgress(selectedExerciseProgress);
      } catch {
        if (active) setError('We could not load local cycle progress.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [database, reloadKey]);

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton width="34%" height={14} />
        <LoadingSkeleton width="80%" height={44} style={styles.loadingTitle} />
        <LoadingSkeleton height={220} style={styles.loadingCard} />
      </Screen>
    );
  }

  const { facts } = summary;

  const handleSelectExercise = async (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    if (!database) {
      setExerciseProgress(null);
      return;
    }

    setExerciseProgressLoading(true);
    setError(null);
    try {
      const nextProgress = await getExerciseProgress(database, currentCycle.id, exerciseId);
      setExerciseProgress(nextProgress);
    } catch {
      setError('We could not load this movement trend.');
    } finally {
      setExerciseProgressLoading(false);
    }
  };

  return (
    <Screen>
      <Text variant="caption" tone="muted">
        CYCLE PROGRESS
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        See what changed.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Progress starts with a trustworthy baseline, not a perfect streak.
      </Text>

      <Card tone="white" style={styles.cycleCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="caption" tone="muted">
              {currentProgram.title.toUpperCase()}
            </Text>
            <Text variant="h2">Week {currentCycle.currentWeek} of 6</Text>
          </View>
          <Ionicons name="trending-up-outline" size={28} color={colors.success} />
        </View>
        <View style={styles.indicator}>
          <SixWeekIndicator weeks={currentCycle.weeks} />
        </View>
        <ProgressIndicator label="Adherence" value={facts.completionRate} />
        <Text variant="small" tone="muted" style={styles.helper}>
          {facts.completedWorkoutCount > 0
            ? `${facts.completedWorkoutCount} completed workout${facts.completedWorkoutCount === 1 ? '' : 's'} are reflected from local records.`
            : 'Your first completed sessions will populate this cycle scorecard.'}
        </Text>
      </Card>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="barbell-outline"
          label="Workouts"
          value={String(facts.completedWorkoutCount)}
          detail="this cycle"
          tone="lavender"
        />
        <MetricCard
          icon="checkmark-circle-outline"
          label="Logged sets"
          value={String(summary.loggedSetCount)}
          detail="saved locally"
          tone="mint"
        />
        <MetricCard
          icon="stats-chart-outline"
          label="Volume"
          value={facts.totalTrainingVolume > 0 ? formatVolume(facts.totalTrainingVolume) : '—'}
          detail={facts.totalTrainingVolume > 0 ? 'load × reps' : 'not enough data'}
          tone="yellow"
        />
        <MetricCard
          icon="timer-outline"
          label="Cardio"
          value={`${Math.round(facts.cardioMinutes)} min`}
          detail="this cycle"
          tone="blue"
        />
        <MetricCard
          icon="ribbon-outline"
          label="Records"
          value={String(facts.personalRecordIds.length)}
          detail="this cycle"
          tone="coral"
        />
      </View>

      {exerciseChoices.length > 0 ? (
        <View style={styles.exerciseSelector} accessibilityLabel="Movement trend selector">
          <Text variant="h3">Movement trends</Text>
          <Text variant="small" tone="muted" style={styles.selectorCopy}>
            Compare rep-based movements from the active program. Values come from completed local
            sets.
          </Text>
          <View style={styles.selectorChips}>
            {exerciseChoices.map((choice) => (
              <Chip
                key={choice.exerciseId}
                label={choice.label}
                selected={choice.exerciseId === selectedExerciseId}
                onPress={() => void handleSelectExercise(choice.exerciseId)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {nextTargets.length > 0 ? (
        <Card tone="ink" style={styles.nextTargetsCard}>
          <Text variant="caption" tone="inverse">
            NEXT SESSION TARGETS
          </Text>
          <Text variant="h3" tone="inverse" style={styles.nextTargetsTitle}>
            Built from your last completed workout.
          </Text>
          <View style={styles.nextTargetList}>
            {nextTargets.slice(0, 4).map((target) => (
              <View key={target.workoutExerciseId} style={styles.nextTargetRow}>
                <View style={styles.nextTargetCopy}>
                  <Text variant="smallMedium" tone="inverse">
                    {formatExerciseName(target.exerciseId)}
                  </Text>
                  <Text variant="caption" tone="inverse">
                    {formatTarget(target.decision.nextTarget)}
                  </Text>
                </View>
                <Text variant="caption" tone="inverse" style={styles.nextTargetAction}>
                  {formatAction(target.decision.action)}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" tone="inverse" style={styles.nextTargetsNote}>
            Targets are deterministic and remain under the program rules. Coach can explain them,
            but cannot change them silently.
          </Text>
        </Card>
      ) : null}

      {exerciseProgressLoading ? (
        <LoadingSkeleton height={180} style={styles.historyLoading} />
      ) : exerciseProgress ? (
        <ProgressHistoryCard progress={exerciseProgress} />
      ) : null}

      {currentCycle.status === 'complete' ? (
        <Button
          label="Open six-week review"
          variant="secondary"
          onPress={() => router.push('/review')}
          icon={<Ionicons name="document-text-outline" size={18} color={colors.ink} />}
          style={styles.reviewButton}
        />
      ) : null}

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}
    </Screen>
  );
}

function getPlannedWorkoutCount(cycle: typeof demoCycle): number {
  return cycle.weeks.reduce((total, week) => total + week.plannedWorkoutCount, 0);
}

function formatVolume(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatExerciseName(exerciseId: string): string {
  const exercise = foundationalExercises.find((candidate) => candidate.id === exerciseId);
  if (exercise) return exercise.name;

  return exerciseId
    .replace(/^exercise-/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface ProgressExerciseChoice {
  exerciseId: string;
  label: string;
}

function getProgressExerciseChoices(
  version: typeof demoProgramVersion,
  userExercises: readonly ExerciseLike[] = [],
): ProgressExerciseChoice[] {
  const exerciseNames = new Map<string, { name: string; trackingType: string }>([
    ...foundationalExercises.map((exercise) => [exercise.id, exercise] as const),
    ...userExercises.map((exercise) => [exercise.id, exercise] as const),
  ]);
  const seen = new Set<string>();

  return version.workouts.flatMap((workout) =>
    workout.exercises.flatMap((workoutExercise) => {
      if (seen.has(workoutExercise.exerciseId)) return [];
      seen.add(workoutExercise.exerciseId);
      const exercise = exerciseNames.get(workoutExercise.exerciseId);
      if (exercise && exercise.trackingType !== 'reps' && exercise.trackingType !== 'custom') {
        return [];
      }

      return [
        {
          exerciseId: workoutExercise.exerciseId,
          label: exercise?.name ?? formatExerciseName(workoutExercise.exerciseId),
        },
      ];
    }),
  );
}

interface ExerciseLike {
  id: string;
  name: string;
  trackingType: string;
}

function formatTarget(target: SetTarget): string {
  const reps =
    typeof target.reps === 'object'
      ? `${target.reps.min}-${target.reps.max} reps`
      : target.reps !== undefined
        ? `${target.reps} reps`
        : null;
  const loadUnit =
    target.load?.unit === 'imperial' ? 'lb' : target.load?.unit === 'metric' ? 'kg' : null;
  const load =
    target.load?.value !== undefined && loadUnit ? `${target.load.value} ${loadUnit}` : null;
  const duration = target.durationSeconds !== undefined ? `${target.durationSeconds}s` : null;
  return [load, reps, duration].filter(Boolean).join(' · ') || 'Keep current target';
}

function formatAction(action: NextSessionTarget['decision']['action']): string {
  return action === 'hold' ? 'KEEP' : action.replaceAll('-', ' ').toUpperCase();
}

function ProgressHistoryCard({ progress }: { progress: ExerciseProgress }) {
  const exercise = foundationalExercises.find((candidate) => candidate.id === progress.exerciseId);
  const label = exercise?.name ?? formatExerciseName(progress.exerciseId);
  const values = progress.points.map(
    (point) => point.estimatedOneRepMax ?? point.bestLoad ?? point.bestReps ?? 0,
  );
  const maximum = Math.max(...values, 1);
  const latest = progress.points.at(-1);
  const recordCount = progress.personalRecords.length;
  const chartSummary = progress.points
    .map((point, index) => {
      const value = point.estimatedOneRepMax ?? point.bestLoad ?? point.bestReps;
      return `Session ${index + 1}: ${value === undefined ? 'not measured' : Math.round(value)}`;
    })
    .join('; ');

  return (
    <Card
      tone="blue"
      style={styles.historyCard}
      accessibilityLabel={`${label} strength trend. ${chartSummary || 'No completed sessions yet.'}`}
    >
      <Text variant="caption" tone="muted">
        MOVEMENT TREND
      </Text>
      <View style={styles.historyHeader}>
        <View style={styles.historyCopy}>
          <Text variant="h3">{label}</Text>
          <Text variant="small" tone="muted">
            {progress.points.length > 0
              ? `${recordCount} recorded best${recordCount === 1 ? '' : 's'} · estimated 1RM where load and reps are available`
              : 'Complete this movement to start a local trend.'}
          </Text>
        </View>
        <Ionicons name="trending-up-outline" size={24} color={colors.ink} />
      </View>
      {progress.points.length > 0 ? (
        <>
          <View style={styles.chart} accessible={false}>
            {progress.points.map((point, index) => {
              const value = values[index] ?? 0;
              return (
                <View key={point.sessionId} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[styles.bar, { height: `${Math.max(10, (value / maximum) * 100)}%` }]}
                    />
                  </View>
                  <Text variant="caption" tone="muted">
                    {index + 1}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text variant="smallMedium" style={styles.historyValue}>
            Latest:{' '}
            {latest?.estimatedOneRepMax
              ? `${Math.round(latest.estimatedOneRepMax)} estimated`
              : latest?.bestLoad
                ? `${latest.bestLoad} load`
                : 'Rep trend'}
          </Text>
        </>
      ) : null}
    </Card>
  );
}

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  tone: 'lavender' | 'blue' | 'mint' | 'yellow' | 'coral';
}

function MetricCard({ icon, label, value, detail, tone }: MetricCardProps) {
  return (
    <Card tone={tone} style={styles.metricCard}>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text variant="caption" tone="muted" style={styles.metricLabel}>
        {label}
      </Text>
      <Text variant="h2">{value}</Text>
      <Text variant="caption" tone="muted">
        {detail}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xs,
  },
  loadingTitle: {
    marginTop: spacing.md,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  cycleCard: {
    marginTop: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  indicator: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  helper: {
    marginTop: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  metricLabel: {
    marginTop: spacing.xs,
  },
  nextTargetsCard: {
    marginTop: spacing.xl,
  },
  nextTargetsTitle: {
    marginTop: spacing.sm,
  },
  nextTargetList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  nextTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  nextTargetCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  nextTargetAction: {
    textAlign: 'right',
  },
  nextTargetsNote: {
    marginTop: spacing.xl,
    opacity: 0.76,
  },
  historyCard: {
    marginTop: spacing.xl,
  },
  exerciseSelector: {
    marginTop: spacing.xl,
  },
  selectorCopy: {
    marginTop: spacing.xs,
  },
  selectorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  historyLoading: {
    marginTop: spacing.xl,
  },
  historyHeader: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  historyCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  chart: {
    height: 132,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13,16,27,0.16)',
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  barTrack: {
    width: '70%',
    height: '86%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.58)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: colors.ink,
  },
  historyValue: {
    marginTop: spacing.md,
  },
  reviewButton: {
    marginTop: spacing.xl,
  },
});
