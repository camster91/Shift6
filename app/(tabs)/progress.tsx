import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  ErrorState,
  LoadingSkeleton,
  ProgressIndicator,
  Screen,
  SixWeekIndicator,
  Text,
} from '../../src/components/ui';
import { demoCycle, demoProgram } from '../../src/domain/fixtures/home';
import { buildCycleProgressSummary, type CycleProgressSummary } from '../../src/domain/progression';
import { useLocalDatabase } from '../../src/db/context';
import { getActiveTrainingCycle } from '../../src/db/cycleRepository';
import { getCycleProgressSummary } from '../../src/db/progressRepository';
import { colors, spacing } from '../../src/design/tokens';

export default function ProgressScreen() {
  const database = useLocalDatabase();
  const [currentCycle, setCurrentCycle] = useState(demoCycle);
  const [summary, setSummary] = useState<CycleProgressSummary>(() =>
    buildCycleProgressSummary(getPlannedWorkoutCount(demoCycle), []),
  );
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
        const storedCycle = await getActiveTrainingCycle(database, 'guest-user');
        const cycle = storedCycle ?? demoCycle;
        const nextSummary = await getCycleProgressSummary(
          database,
          cycle.id,
          getPlannedWorkoutCount(cycle),
        );

        if (!active) return;
        setCurrentCycle(cycle);
        setSummary(nextSummary);
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
              {demoProgram.title.toUpperCase()}
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
});
