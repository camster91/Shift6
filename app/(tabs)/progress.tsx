import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  LoadingSkeleton,
  ProgressIndicator,
  Screen,
  SixWeekIndicator,
  Text,
} from '../../src/components/ui';
import { demoCycle, demoProgram, demoWorkout } from '../../src/domain/fixtures/home';
import { foundationalExercises } from '../../src/domain/fixtures/exercises';
import { buildNextSessionTargets, type NextSessionTarget } from '../../src/domain/nextSession';
import { buildCycleProgressSummary, type CycleProgressSummary } from '../../src/domain/progression';
import { useLocalDatabase } from '../../src/db/context';
import { getLatestTrainingCycle } from '../../src/db/cycleRepository';
import { getOnboardingProfile } from '../../src/db/profileRepository';
import { getUserProgramVersion } from '../../src/db/programRepository';
import {
  getCycleProgressSummary,
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
        const workout = snapshot?.version.workouts[0] ?? demoWorkout;
        const nextSummary = await getCycleProgressSummary(
          database,
          cycle.id,
          getPlannedWorkoutCount(cycle),
        );
        const latestSets = await getLatestCompletedWorkoutSets(database, cycle.id, workout.id);
        const profile = await getOnboardingProfile(database, 'guest-user');
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
  reviewButton: {
    marginTop: spacing.xl,
  },
});
