import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  SixWeekIndicator,
  Text,
} from '../src/components/ui';
import { getLatestTrainingCycle, saveTrainingCycle } from '../src/db/cycleRepository';
import { useLocalDatabase } from '../src/db/context';
import { getCycleProgressSummary } from '../src/db/progressRepository';
import { getUserProgramVersion, saveProgramVersion } from '../src/db/programRepository';
import { demoCycle, demoProgramVersion } from '../src/domain/fixtures/home';
import { demoProgram } from '../src/domain/fixtures/home';
import { buildCycleProgressSummary, getWeekSixGuidance } from '../src/domain/progression';
import { createTrainingCycle } from '../src/domain/cycle';
import type { CycleProgressSummary } from '../src/domain/progression';
import type { TrainingCycle } from '../src/domain/types';
import { colors, spacing } from '../src/design/tokens';

export default function CycleReviewScreen() {
  const database = useLocalDatabase();
  const [cycle, setCycle] = useState<TrainingCycle>(demoCycle);
  const [program, setProgram] = useState(demoProgram);
  const [programVersion, setProgramVersion] = useState(demoProgramVersion);
  const [summary, setSummary] = useState<CycleProgressSummary>(() =>
    buildCycleProgressSummary(getPlannedWorkoutCount(demoCycle), []),
  );
  const [loading, setLoading] = useState(database !== null);
  const [repeating, setRepeating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const latestCycle = (await getLatestTrainingCycle(database, 'guest-user')) ?? demoCycle;
        const snapshot = await getUserProgramVersion(
          database,
          'guest-user',
          latestCycle.programVersionId,
        );
        const nextSummary = await getCycleProgressSummary(
          database,
          latestCycle.id,
          getPlannedWorkoutCount(latestCycle),
        );
        if (!active) return;
        setCycle(latestCycle);
        if (snapshot) {
          setProgram(snapshot.program);
          setProgramVersion(snapshot.version);
        }
        setSummary(nextSummary);
      } catch {
        if (active) setError('We could not load the local cycle review.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [database]);

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton width="34%" height={14} />
        <LoadingSkeleton width="80%" height={44} style={styles.loadingTitle} />
        <LoadingSkeleton height={260} style={styles.loadingCard} />
      </Screen>
    );
  }

  const guidance = getWeekSixGuidance(programVersion.cycleModel.weekSixMeaning);
  const isComplete = cycle.status === 'complete';

  const handleRepeatCycle = async () => {
    if (repeating) return;

    setRepeating(true);
    setError(null);
    try {
      const nextCycle = createTrainingCycle({
        id: `cycle-guest-user-${demoCycle.id}-${Date.now()}`,
        userId: 'guest-user',
        programVersion,
        startedAt: new Date().toISOString(),
      });
      if (database) {
        await saveProgramVersion(database, 'guest-user', program, programVersion);
        await saveTrainingCycle(database, nextCycle);
      }
      router.replace('/');
    } catch (repeatError) {
      setError(
        repeatError instanceof Error ? repeatError.message : 'We could not start the next cycle.',
      );
    } finally {
      setRepeating(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Progress"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          SIX-WEEK REVIEW
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {isComplete ? 'Six weeks, reviewed.' : 'Your next review is taking shape.'}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {isComplete
          ? 'Use the record you created to decide what the next block should ask of you.'
          : 'Complete the six-week block and SHIFT6 will summarize the record before you choose what comes next.'}
      </Text>

      <Card tone={isComplete ? 'mint' : 'lavender'} style={styles.cycleCard}>
        <Text variant="caption" tone="muted">
          {isComplete ? 'CYCLE COMPLETE' : 'CYCLE IN PROGRESS'}
        </Text>
        <Text variant="h2" style={styles.cycleTitle}>
          Week {cycle.currentWeek} of 6
        </Text>
        <View style={styles.indicator}>
          <SixWeekIndicator weeks={cycle.weeks} />
        </View>
        <Text variant="small" tone="muted">
          Week 6: {guidance.label}. {guidance.description}
        </Text>
      </Card>

      <View style={styles.factsCard}>
        <Fact label="Workouts" value={String(summary.facts.completedWorkoutCount)} />
        <Fact label="Adherence" value={`${Math.round(summary.facts.completionRate * 100)}%`} />
        <Fact label="Logged sets" value={String(summary.loggedSetCount)} />
        <Fact label="Volume" value={summary.facts.totalTrainingVolume.toLocaleString()} />
        <Fact label="Training days" value={String(summary.facts.completedTrainingDays)} />
      </View>

      <Card tone="blue" style={styles.signalCard} accessibilityLabel={formatReviewSignals(summary)}>
        <Text variant="caption" tone="muted">
          WHAT THE RECORD SAYS
        </Text>
        <Text variant="small" tone="muted" style={styles.signalCopy}>
          {formatReviewSignals(summary)}
        </Text>
      </Card>

      <Card
        tone="white"
        style={styles.readinessCard}
        accessibilityLabel={formatReadinessAccessibilityLabel(summary)}
      >
        <Text variant="caption" tone="muted">
          READINESS CONTEXT
        </Text>
        <Text variant="h3" style={styles.readinessTitle}>
          Training context, not a score.
        </Text>
        <Text variant="small" tone="muted" style={styles.readinessCopy}>
          {formatReadinessSummary(summary)}
        </Text>
      </Card>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}

      {isComplete ? (
        <>
          <Text variant="h2" style={styles.sectionTitle}>
            Choose what comes next
          </Text>
          <Text variant="small" tone="muted" style={styles.sectionCopy}>
            These are user-approved paths. Coach may explain the record later, but it cannot apply a
            plan change without your confirmation.
          </Text>
          <Button
            label="Repeat this cycle"
            onPress={handleRepeatCycle}
            loading={repeating}
            icon={<Ionicons name="refresh-outline" size={18} color={colors.white} />}
            style={styles.actionButton}
          />
          <Button
            label="Adjust a private copy"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/builder', params: { sourceVersionId: programVersion.id } })
            }
            icon={<Ionicons name="create-outline" size={18} color={colors.ink} />}
            style={styles.actionButton}
          />
          <Button
            label="Choose another program"
            variant="ghost"
            onPress={() => router.push('/programs')}
            icon={<Ionicons name="library-outline" size={18} color={colors.ink} />}
            style={styles.actionButton}
          />
          <Text variant="caption" tone="muted" style={styles.persistenceNote}>
            {database
              ? 'Repeating creates a new local cycle snapshot; the completed cycle remains immutable.'
              : Platform.OS === 'web'
                ? 'Web preview: cycle persistence is not active in this surface.'
                : 'The next cycle will be snapshotted locally before sync.'}
          </Text>
        </>
      ) : (
        <Card tone="white" style={styles.pendingCard}>
          <Text variant="smallMedium">Review unlocks after Week 6.</Text>
          <Text variant="small" tone="muted" style={styles.pendingCopy}>
            Keep logging the work that happened. A partial week is information, not a reason to
            fabricate a completed cycle.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="h2">{value}</Text>
    </View>
  );
}

function getPlannedWorkoutCount(currentCycle: TrainingCycle): number {
  return currentCycle.weeks.reduce((total, week) => total + week.plannedWorkoutCount, 0);
}

function formatReviewSignals(summary: CycleProgressSummary): string {
  const { facts } = summary;
  const effort =
    facts.averageReportedEffort === undefined
      ? 'effort not reported'
      : `average effort ${facts.averageReportedEffort.toFixed(1)} of 5`;
  const cardio = `${Math.round(facts.cardioMinutes)} cardio minutes`;
  const discomfort =
    facts.discomfortFlags === 0
      ? 'no discomfort flags'
      : `${facts.discomfortFlags} discomfort flag${facts.discomfortFlags === 1 ? '' : 's'}`;
  return `${facts.progressionEvents} progression events, ${effort}, ${cardio}, and ${discomfort}.`;
}

function formatReadinessSummary(summary: CycleProgressSummary): string {
  const { readinessCounts } = summary.facts;
  const logged = readinessCounts.ready + readinessCounts.limited + readinessCounts.rest;
  if (logged === 0) {
    return 'No readiness context has been logged yet. You can choose a simple pre-workout context without changing your plan automatically.';
  }

  const parts = [
    `${readinessCounts.ready} ready`,
    `${readinessCounts.limited} limited`,
    `${readinessCounts.rest} rest`,
  ];
  return `${logged} session${logged === 1 ? '' : 's'} reported context: ${parts.join(', ')}. These labels inform conservative targets; they are not a medical assessment.`;
}

function formatReadinessAccessibilityLabel(summary: CycleProgressSummary): string {
  return `Readiness context. ${formatReadinessSummary(summary)}`;
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
  loadingTitle: {
    marginTop: spacing.md,
  },
  loadingCard: {
    marginTop: spacing.xl,
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
  cycleTitle: {
    marginTop: spacing.xs,
  },
  indicator: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  factsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  signalCard: {
    marginTop: spacing.xl,
  },
  signalCopy: {
    marginTop: spacing.sm,
  },
  readinessCard: {
    marginTop: spacing.md,
  },
  readinessTitle: {
    marginTop: spacing.sm,
  },
  readinessCopy: {
    marginTop: spacing.xs,
  },
  fact: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
  },
  sectionCopy: {
    marginTop: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.md,
  },
  persistenceNote: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  pendingCard: {
    marginTop: spacing.xl,
  },
  pendingCopy: {
    marginTop: spacing.sm,
  },
});
