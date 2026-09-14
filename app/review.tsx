import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

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
import { getCycleReview, saveCycleReview } from '../src/db/cycleReviewRepository';
import { getLatestTrainingCycle, saveTrainingCycle } from '../src/db/cycleRepository';
import { useLocalDatabase } from '../src/db/context';
import { getCycleProgressSummary } from '../src/db/progressRepository';
import { getUserProgramVersion, saveProgramVersion } from '../src/db/programRepository';
import { demoCycle, demoProgramVersion } from '../src/domain/fixtures/home';
import { demoProgram } from '../src/domain/fixtures/home';
import { buildCycleProgressSummary, getWeekSixGuidance } from '../src/domain/progression';
import { createTrainingCycle } from '../src/domain/cycle';
import type { CycleProgressSummary } from '../src/domain/progression';
import type {
  CheckInRating,
  CycleReview,
  CycleReviewAction,
  CycleReviewFocus,
  TrainingCycle,
} from '../src/domain/types';
import { colors, spacing } from '../src/design/tokens';
import { useAppServices } from '../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';

export default function CycleReviewScreen() {
  const database = useLocalDatabase();
  const { analytics } = useAppServices();
  const [cycle, setCycle] = useState<TrainingCycle>(demoCycle);
  const [program, setProgram] = useState(demoProgram);
  const [programVersion, setProgramVersion] = useState(demoProgramVersion);
  const [summary, setSummary] = useState<CycleProgressSummary>(() =>
    buildCycleProgressSummary(getPlannedWorkoutCount(demoCycle), []),
  );
  const [review, setReview] = useState<CycleReview | null>(null);
  const [overallRating, setOverallRating] = useState<CheckInRating | null>(null);
  const [focus, setFocus] = useState<CycleReviewFocus | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(database !== null);
  const [reviewBusy, setReviewBusy] = useState<'reflection' | CycleReviewAction | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);
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
        const existingReview = await getCycleReview(database, 'guest-user', latestCycle.id);
        if (!active) return;
        setCycle(latestCycle);
        if (snapshot) {
          setProgram(snapshot.program);
          setProgramVersion(snapshot.version);
        }
        setSummary(nextSummary);
        setReview(existingReview);
        setOverallRating(existingReview?.overallRating ?? null);
        setFocus(existingReview?.focus ?? null);
        setReviewNote(existingReview?.note ?? '');
        setReviewSaved(existingReview !== null);
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

  const persistReview = async (nextAction?: CycleReviewAction): Promise<boolean> => {
    if (reviewBusy) return false;

    const now = new Date().toISOString();
    const nextReview: CycleReview = {
      id: review?.id ?? `cycle-review-${cycle.id}`,
      userId: 'guest-user',
      cycleId: cycle.id,
      overallRating: overallRating ?? undefined,
      focus: focus ?? undefined,
      nextAction: nextAction ?? review?.nextAction,
      note: reviewNote.trim() || undefined,
      createdAt: review?.createdAt ?? now,
      updatedAt: now,
    };

    if (!database) {
      setReview(nextReview);
      setReviewSaved(true);
      return true;
    }

    setReviewBusy(nextAction ?? 'reflection');
    setError(null);
    try {
      await saveCycleReview(database, nextReview);
      setReview(nextReview);
      setReviewSaved(true);
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'We could not save your reflection.',
      );
      return false;
    } finally {
      setReviewBusy(null);
    }
  };

  const handleRepeatCycle = async () => {
    if (reviewBusy) return;

    setError(null);
    try {
      const savedReview = await persistReview('repeat');
      if (!savedReview) return;

      setReviewBusy('repeat');
      const nextCycle = createTrainingCycle({
        id: `cycle-guest-user-${cycle.id}-${Date.now()}`,
        userId: 'guest-user',
        programVersion,
        startedAt: new Date().toISOString(),
      });
      if (database) {
        await saveProgramVersion(database, 'guest-user', program, programVersion);
        await saveTrainingCycle(database, nextCycle);
      }
      trackAnalyticsEvent(analytics, 'next_cycle_started', {
        cycleId: nextCycle.id,
        programId: program.sourceProgramId ?? program.id,
      });
      router.replace('/');
    } catch (repeatError) {
      setError(
        repeatError instanceof Error ? repeatError.message : 'We could not start the next cycle.',
      );
    } finally {
      setReviewBusy(null);
    }
  };

  const handleAdjustCycle = async () => {
    if (reviewBusy) return;
    const savedReview = await persistReview('adjust');
    if (savedReview) {
      router.push({ pathname: '/builder', params: { sourceVersionId: programVersion.id } });
    }
  };

  const handleChooseProgram = async () => {
    if (reviewBusy) return;
    const savedReview = await persistReview('change-program');
    if (savedReview) router.push('/programs');
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
            Reflect on the block
          </Text>
          <Text variant="small" tone="muted" style={styles.sectionCopy}>
            Your reflection stays part of this cycle record. It helps future Coach explanations stay
            grounded in what you reported, and it never changes a plan by itself.
          </Text>
          <ReviewRatingScale
            label="Overall experience"
            value={overallRating}
            onChange={(value) => {
              setOverallRating(value);
              setReviewSaved(false);
            }}
          />
          <Text variant="smallMedium" style={styles.focusLabel}>
            What should the next block emphasize?
          </Text>
          <View style={styles.focusOptions} accessibilityRole="radiogroup">
            {cycleReviewFocusOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={focus === option.value}
                onPress={() => {
                  setFocus(option.value);
                  setReviewSaved(false);
                }}
              />
            ))}
          </View>
          <TextInput
            accessibilityLabel="Optional cycle reflection"
            multiline
            maxLength={2_000}
            onChangeText={(value) => {
              setReviewNote(value);
              setReviewSaved(false);
            }}
            placeholder="Optional note for your future self"
            placeholderTextColor={colors.inkMuted}
            style={styles.reviewNoteInput}
            value={reviewNote}
          />
          <Button
            label={reviewSaved ? 'Reflection saved' : 'Save reflection'}
            variant="secondary"
            loading={reviewBusy === 'reflection'}
            disabled={reviewSaved}
            onPress={() => void persistReview()}
            icon={
              reviewSaved ? <Ionicons name="checkmark" size={18} color={colors.ink} /> : undefined
            }
            style={styles.actionButton}
          />
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
            loading={reviewBusy === 'repeat'}
            icon={<Ionicons name="refresh-outline" size={18} color={colors.white} />}
            style={styles.actionButton}
          />
          <Button
            label="Adjust a private copy"
            variant="secondary"
            loading={reviewBusy === 'adjust'}
            onPress={() => void handleAdjustCycle()}
            icon={<Ionicons name="create-outline" size={18} color={colors.ink} />}
            style={styles.actionButton}
          />
          <Button
            label="Choose another program"
            variant="ghost"
            loading={reviewBusy === 'change-program'}
            onPress={() => void handleChooseProgram()}
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

function ReviewRatingScale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CheckInRating | null;
  onChange: (value: CheckInRating) => void;
}) {
  return (
    <View
      accessibilityLabel={`${label}. ${value ? `Selected ${value} of 5.` : 'Not selected.'}`}
      style={styles.rating}
    >
      <View style={styles.ratingHeader}>
        <Text variant="smallMedium">{label}</Text>
        <Text variant="caption" tone="muted">
          Not useful · Excellent
        </Text>
      </View>
      <View style={styles.ratingOptions}>
        {([1, 2, 3, 4, 5] as CheckInRating[]).map((rating) => (
          <Chip
            key={rating}
            label={String(rating)}
            selected={rating === value}
            onPress={() => onChange(rating)}
          />
        ))}
      </View>
    </View>
  );
}

const cycleReviewFocusOptions: readonly { value: CycleReviewFocus; label: string }[] = [
  { value: 'same-course', label: 'Stay the course' },
  { value: 'more-strength', label: 'More strength' },
  { value: 'more-conditioning', label: 'More conditioning' },
  { value: 'more-mobility', label: 'More mobility' },
  { value: 'improve-consistency', label: 'Consistency' },
  { value: 'recover-better', label: 'Recover better' },
];

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
  rating: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  focusLabel: {
    marginTop: spacing.xl,
  },
  focusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reviewNoteInput: {
    minHeight: 112,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: 'System',
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
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
