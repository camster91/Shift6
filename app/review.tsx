import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

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
import { getLatestTrainingCycle } from '../src/db/cycleRepository';
import {
  prepareCycleHandover,
  confirmCycleHandover,
  getCycleHandoverReceipt,
} from '../src/db/cycleHandoverRepository';
import { getPersonalGoal } from '../src/db/personalGoalRepository';
import type { CycleHandoverRequest, CycleHandoverReceipt } from '../src/domain/cycleHandover';
import type { Shift } from '../src/domain/shift';
import { useLocalDatabase } from '../src/db/context';
import { getCycleProgressSummary } from '../src/db/progressRepository';
import { getUserProgramVersion } from '../src/db/programRepository';
import { getWeekSixGuidance } from '../src/domain/progression';
import { lifecycleDate } from '../src/domain/cycleLifecycle';
import { stableSnapshotJSON } from '../src/domain/programPersistence';
import type { CycleProgressSummary } from '../src/domain/progression';
import type {
  CheckInRating,
  CycleReview,
  CycleReviewAction,
  CycleReviewFocus,
  Program,
  ProgramVersion,
  TrainingCycle,
} from '../src/domain/types';
import { colors, spacing } from '../src/design/tokens';
import { useAppServices } from '../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function CycleReviewScreen() {
  const database = useLocalDatabase();
  const { analytics } = useAppServices();
  const userId = useCurrentUserId();
  const [cycle, setCycle] = useState<TrainingCycle | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [programVersion, setProgramVersion] = useState<ProgramVersion | null>(null);
  const [summary, setSummary] = useState<CycleProgressSummary | null>(null);
  const [review, setReview] = useState<CycleReview | null>(null);
  const [overallRating, setOverallRating] = useState<CheckInRating | null>(null);
  const [focus, setFocus] = useState<CycleReviewFocus | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(database !== null);
  const [reviewBusy, setReviewBusy] = useState<'reflection' | CycleReviewAction | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [personalGoal, setPersonalGoal] = useState<Shift | null>(null);
  const [handoverChoice, setHandoverChoice] = useState<CycleHandoverRequest['choice'] | null>(null);
  const [handoverPreview, setHandoverPreview] = useState<{
    request: CycleHandoverRequest;
    snapshot: string;
    focusGeneration: number;
  } | null>(null);
  const [handoverReceipt, setHandoverReceipt] = useState<CycleHandoverReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<{ database: typeof database; userId: string } | null>(
    null,
  );

  const repeatContext = useRef({
    database,
    userId,
    snapshot: stableSnapshotJSON({
      cycle,
      program,
      programVersion,
      overallRating,
      focus,
      reviewNote,
      review,
      handoverChoice,
    }),
  });
  repeatContext.current = {
    database,
    userId,
    snapshot: stableSnapshotJSON({
      cycle,
      program,
      programVersion,
      overallRating,
      focus,
      reviewNote,
      review,
      handoverChoice,
    }),
  };
  const repeatFocus = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const generation = ++repeatFocus.current;
      return () => {
        if (repeatFocus.current === generation) repeatFocus.current++;
      };
    }, [database, userId]),
  );
  const repeatMounted = useRef(true),
    repeatPending = useRef<number | null>(null),
    repeatSequence = useRef(0);
  useEffect(() => {
    repeatMounted.current = true;
    return () => {
      repeatMounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!database) {
        setLoading(false);
        return;
      }

      let active = true;
      setLoading(true);
      setError(null);
      setCycle(null);
      setProgram(null);
      setProgramVersion(null);
      setSummary(null);
      setLoadedFor(null);
      setPersonalGoal(null);
      setHandoverChoice(null);
      setHandoverPreview(null);
      setHandoverReceipt(null);
      void (async () => {
        try {
          const latestCycle = await getLatestTrainingCycle(database, userId);
          if (!latestCycle) return;
          const snapshot = await getUserProgramVersion(
            database,
            userId,
            latestCycle.programVersionId,
          );
          if (!snapshot) return;
          const nextSummary = await getCycleProgressSummary(
            database,
            latestCycle.id,
            getPlannedWorkoutCount(latestCycle),
          );
          const existingReview = await getCycleReview(database, userId, latestCycle.id);
          const existingGoal = await getPersonalGoal(database, userId, latestCycle.id);
          const recovered = await getCycleHandoverReceipt(database, userId, latestCycle.id);
          if (!active) return;
          setPersonalGoal(existingGoal);
          // An incoming receipt explains the active destination. Once that cycle
          // completes it must not hide preparation of its own next block.
          setHandoverReceipt(
            latestCycle.status === 'complete' &&
              recovered?.request.source.cycle.id !== latestCycle.id
              ? null
              : recovered,
          );
          setCycle(latestCycle);
          setProgram(snapshot.program);
          setProgramVersion(snapshot.version);
          setSummary(nextSummary);
          setLoadedFor({ database, userId });
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
    }, [database, userId]),
  );

  if (loading || (database && cycle && loadedFor?.database !== database)) {
    return (
      <Screen>
        <LoadingSkeleton width="34%" height={14} />
        <LoadingSkeleton width="80%" height={44} style={styles.loadingTitle} />
        <LoadingSkeleton height={260} style={styles.loadingCard} />
      </Screen>
    );
  }

  if (
    !database ||
    !cycle ||
    !program ||
    !programVersion ||
    !summary ||
    loadedFor?.userId !== userId
  ) {
    return (
      <Screen>
        <ErrorState
          title="Review unavailable"
          message={error ?? 'No saved cycle and program are available for review on this device.'}
        />
        <Button label="Return Home" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const guidance = getWeekSixGuidance(programVersion.cycleModel.weekSixMeaning);
  const isComplete = cycle.status === 'complete';

  const persistReview = async (
    nextAction?: CycleReviewAction,
    isCurrent: () => boolean = () => true,
  ): Promise<boolean> => {
    if (
      !isCurrent() ||
      reviewBusy ||
      !database ||
      !cycle ||
      loadedFor?.database !== database ||
      loadedFor.userId !== userId
    )
      return false;

    const now = new Date().toISOString();
    const nextReview: CycleReview = {
      id: review?.id ?? `cycle-review-${cycle.id}`,
      userId,
      cycleId: cycle.id,
      overallRating: overallRating ?? undefined,
      focus: focus ?? undefined,
      nextAction: nextAction ?? review?.nextAction,
      note: reviewNote.trim() || undefined,
      createdAt: review?.createdAt ?? now,
      updatedAt: now,
    };

    setReviewBusy(nextAction ?? 'reflection');
    setError(null);
    try {
      await saveCycleReview(database, nextReview);
      if (!isCurrent()) return false;
      setReview(nextReview);
      setReviewSaved(true);
      return true;
    } catch (saveError) {
      if (isCurrent())
        setError(
          saveError instanceof Error ? saveError.message : 'We could not save your reflection.',
        );
      return false;
    } finally {
      if (isCurrent()) setReviewBusy(null);
    }
  };

  const prepareNextCycle = async () => {
    if (
      repeatPending.current ||
      reviewBusy ||
      !handoverChoice ||
      !isComplete ||
      loadedFor?.database !== database ||
      loadedFor.userId !== userId
    )
      return;
    const snapshot = repeatContext.current.snapshot;
    const focusGeneration = repeatFocus.current;
    const isCurrent = () =>
      repeatMounted.current &&
      repeatContext.current.database === database &&
      repeatContext.current.userId === userId &&
      repeatFocus.current === focusGeneration &&
      repeatContext.current.snapshot === snapshot;
    const operationToken = ++repeatSequence.current;
    repeatPending.current = operationToken;
    setReviewBusy('repeat');
    setError(null);
    try {
      const preparedAt = new Date().toISOString();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const token = `${Date.now()}-${operationToken}`;
      const nextProgramId = `program-${program.slug}-${userId}-${token}`;
      const request = await prepareCycleHandover(database, userId, cycle.id, {
        operationId: `handover-${userId}-${cycle.id}-${token}`,
        preparedAt,
        choice: handoverChoice,
        personalReviewState: 'postponed',
        reflection: {
          id: review?.id ?? `cycle-review-${cycle.id}`,
          userId,
          cycleId: cycle.id,
          overallRating: overallRating ?? undefined,
          focus: focus ?? undefined,
          nextAction: 'repeat',
          note: reviewNote.trim() || undefined,
          createdAt: review?.createdAt ?? preparedAt,
          updatedAt: preparedAt,
        },
        destination: {
          cycleId: `cycle-${userId}-${cycle.id}-${token}`,
          programId: nextProgramId,
          versionId: `${nextProgramId}-version-1`,
          goalId: handoverChoice === 'continue-goal' ? `goal-${userId}-${token}` : null,
          startedAt: preparedAt,
          startDate: lifecycleDate(preparedAt, timeZone),
          timeZone,
        },
      });
      if (isCurrent()) setHandoverPreview({ request, snapshot, focusGeneration });
    } catch (prepareError) {
      if (isCurrent())
        setError(
          prepareError instanceof Error
            ? prepareError.message
            : 'We could not prepare the new cycle.',
        );
    } finally {
      if (repeatPending.current === operationToken) {
        repeatPending.current = null;
        if (repeatMounted.current) setReviewBusy(null);
      }
    }
  };

  const confirmNextCycle = async () => {
    if (!handoverPreview || repeatPending.current || reviewBusy) return;
    const preview = handoverPreview;
    const callFocus = repeatFocus.current;
    const isOwnerCurrent = () =>
      repeatMounted.current &&
      repeatContext.current.database === database &&
      repeatContext.current.userId === userId &&
      preview.request.userId === userId &&
      loadedFor?.database === database &&
      loadedFor.userId === userId;
    const isContextCurrent = () =>
      isOwnerCurrent() &&
      repeatFocus.current === preview.focusGeneration &&
      repeatContext.current.snapshot === preview.snapshot;
    const canShowResult = () => isOwnerCurrent() && repeatFocus.current === callFocus;
    const operationToken = ++repeatSequence.current;
    repeatPending.current = operationToken;
    setReviewBusy('repeat');
    setError(null);
    try {
      // Keep this exact request for recovery: the repository reads committed receipts first.
      const receipt = await confirmCycleHandover(database, userId, preview.request, {
        isOwnerCurrent,
        isContextCurrent,
      });
      if (!canShowResult()) return;
      setHandoverReceipt(receipt);
      setReview(receipt.request.reflection);
      setReviewSaved(true);
      trackAnalyticsEvent(analytics, 'next_cycle_started', {
        cycleId: receipt.request.destination.cycleId,
        programId: receipt.request.source.program.id,
      });
    } catch (confirmError) {
      if (canShowResult())
        setError(
          confirmError instanceof Error
            ? confirmError.message
            : 'Confirmation could not be read. Retry this exact confirmation to recover its saved result.',
        );
    } finally {
      if (repeatPending.current === operationToken) {
        repeatPending.current = null;
        if (repeatMounted.current) setReviewBusy(null);
      }
    }
  };

  const handleAdjustCycle = async () => {
    if (reviewBusy || !programVersion) return;
    const savedReview = await persistReview('adjust');
    if (savedReview) {
      router.push({ pathname: '/builder', params: { sourceVersionId: programVersion.id } });
    }
  };

  const handleProgressCycle = async () => {
    if (reviewBusy || !programVersion) return;
    const savedReview = await persistReview('progress');
    if (savedReview) {
      router.push({
        pathname: '/builder',
        params: { sourceVersionId: programVersion.id, mode: 'progress' },
      });
    }
  };

  const handleChangeExercises = async () => {
    if (reviewBusy || !programVersion) return;
    const savedReview = await persistReview('change-exercises');
    if (savedReview) {
      router.push({
        pathname: '/builder',
        params: { sourceVersionId: programVersion.id, mode: 'change-exercises' },
      });
    }
  };

  const handleChooseProgram = async () => {
    if (reviewBusy) return;
    const savedReview = await persistReview('change-program');
    if (savedReview) router.push('/programs');
  };

  const handleBuildNewProgram = async () => {
    if (reviewBusy) return;
    const savedReview = await persistReview('build-new');
    if (savedReview) router.push({ pathname: '/builder', params: { mode: 'blank' } });
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

      {summary.unknownLoadSetCount ? (
        <Text variant="small" tone="muted">
          {summary.unknownLoadSetCount} sets have unknown load units. Their load is excluded from
          volume and load records; recorded reps, time and distance remain available.
        </Text>
      ) : null}
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {isComplete ? 'Your training record, reviewed.' : 'Review your training so far.'}
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        {isComplete
          ? 'Use the record you created to decide what the next block should ask of you.'
          : 'You can review your saved record and reflect without finishing every workout or taking a performance test.'}
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

      {handoverReceipt && !isComplete ? (
        <Card tone="mint">
          <Text variant="h3">New cycle saved on this device.</Text>
          <Text variant="small">
            Confirmed {handoverReceipt.confirmedAt}. Your original training history is preserved.
          </Text>
          <Button
            label="Open new cycle"
            onPress={() => {
              if (
                repeatContext.current.database === database &&
                repeatContext.current.userId === handoverReceipt.request.userId
              )
                router.replace({
                  pathname: '/cycle',
                  params: { cycleId: handoverReceipt.request.destination.cycleId },
                });
            }}
          />
        </Card>
      ) : null}
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
          <Card tone="white" style={styles.pendingCard}>
            <Text variant="h3">Start a new six-week cycle</Text>
            <Text variant="small" tone="muted">
              Keep the same training targets in a new private plan. This does not repeat a completed
              week.
            </Text>
            {handoverReceipt ? (
              <>
                <Text variant="smallMedium" accessibilityRole="alert">
                  New cycle saved on this device.
                </Text>
                <Text variant="small">
                  Confirmed {handoverReceipt.confirmedAt}. Your history stays with the original
                  completed cycle.
                </Text>
                <Button
                  label="Open new cycle"
                  onPress={() => {
                    if (
                      repeatContext.current.userId === handoverReceipt.request.userId &&
                      repeatContext.current.database === database
                    )
                      router.replace({
                        pathname: '/cycle',
                        params: { cycleId: handoverReceipt.request.destination.cycleId },
                      });
                  }}
                />
              </>
            ) : handoverPreview ? (
              <>
                <Text variant="smallMedium">Review new cycle before saving</Text>
                <Text variant="small">
                  From {handoverPreview.request.source.program.title}, version{' '}
                  {handoverPreview.request.source.version.version}.
                </Text>
                <Text variant="small">
                  New private cycle starting {handoverPreview.request.destination.startDate} ·{' '}
                  {handoverPreview.request.destination.timeZone}.
                </Text>
                <Text variant="small">
                  {handoverPreview.request.choice === 'continue-goal'
                    ? `Carry “${handoverPreview.request.source.goal?.blockObjective}” into a new goal block with the same target and measurement setup. Its baseline is deferred; record a fresh baseline.`
                    : 'Start without a new personal goal. The old goal stays in history and is no longer primary.'}
                </Text>
                {handoverPreview.request.choice === 'continue-goal' &&
                handoverPreview.request.source.goal ? (
                  <Text variant="small">
                    Saved target:{' '}
                    {handoverPreview.request.source.goal.target === true
                      ? 'Complete the task'
                      : `${handoverPreview.request.source.goal.target} ${handoverPreview.request.source.goal.protocol.canonicalUnit}`}
                    . Measurement setup:{' '}
                    {handoverMetricLabel(handoverPreview.request.source.goal.protocol.metric)},{' '}
                    {handoverPreview.request.source.goal.protocol.equipmentSetup}; assistance{' '}
                    {handoverPreview.request.source.goal.protocol.assistance}.
                    {handoverPreview.request.source.goal.protocol.metric === 'load-for-reps'
                      ? ` At ${handoverPreview.request.source.goal.protocol.repCount} reps.`
                      : ''}
                    {handoverPreview.request.source.goal.protocol.metric === 'fixed-distance-time'
                      ? ` Over ${handoverPreview.request.source.goal.protocol.fixedDistanceMeters} meters.`
                      : ''}
                  </Text>
                ) : null}
                <Text variant="small" tone="muted">
                  Training targets stay unchanged. Saved sets, measurements and attainment are not
                  copied. Your reflection is saved with the old cycle; its personal-goal review is
                  postponed. Nothing changes until you confirm.
                </Text>
                <Button
                  label="Confirm new cycle"
                  loading={reviewBusy === 'repeat'}
                  onPress={() => void confirmNextCycle()}
                />
                <Button
                  label="Cancel new cycle"
                  variant="ghost"
                  disabled={reviewBusy !== null}
                  onPress={() => {
                    setHandoverPreview(null);
                    setError(null);
                  }}
                />
                <Text variant="small" tone="muted">
                  If confirmation is interrupted, retry this exact confirmation to recover a saved
                  receipt. If the plan or date changed before saving, cancel and prepare a fresh
                  preview.
                </Text>
              </>
            ) : (
              <>
                {personalGoal ? (
                  <Text variant="small">
                    Current personal goal: {personalGoal.blockObjective}. Choose what happens to it.
                  </Text>
                ) : (
                  <Text variant="small">This cycle has no personal goal to carry forward.</Text>
                )}
                <View accessibilityRole="radiogroup">
                  {personalGoal ? (
                    <Chip
                      label="Carry personal goal into a new block"
                      selected={handoverChoice === 'continue-goal'}
                      onPress={() => setHandoverChoice('continue-goal')}
                    />
                  ) : null}
                  <Chip
                    label="Start without a new personal goal"
                    selected={handoverChoice === 'without-goal'}
                    onPress={() => setHandoverChoice('without-goal')}
                  />
                </View>
                <Text variant="small" tone="muted">
                  Carrying a goal starts with a deferred baseline and no copied measurements. The
                  old personal-goal review is postponed in either path.
                </Text>
                <Button
                  label="Start a new cycle with these targets"
                  onPress={() => void prepareNextCycle()}
                  disabled={!handoverChoice || reviewBusy !== null}
                  loading={reviewBusy === 'repeat'}
                  style={styles.actionButton}
                />
              </>
            )}
          </Card>
          <Button
            label="Adjust a private copy"
            variant="secondary"
            loading={reviewBusy === 'adjust'}
            onPress={() => void handleAdjustCycle()}
            icon={<Ionicons name="create-outline" size={18} color={colors.ink} />}
            style={styles.actionButton}
          />
          <Button
            label="Build a progression copy"
            variant="secondary"
            loading={reviewBusy === 'progress'}
            onPress={() => void handleProgressCycle()}
            icon={<Ionicons name="trending-up-outline" size={18} color={colors.ink} />}
            style={styles.actionButton}
          />
          <Button
            label="Change exercises"
            variant="secondary"
            loading={reviewBusy === 'change-exercises'}
            onPress={() => void handleChangeExercises()}
            icon={<Ionicons name="swap-horizontal-outline" size={18} color={colors.ink} />}
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
          <Button
            label="Build a new program"
            variant="ghost"
            loading={reviewBusy === 'build-new'}
            onPress={() => void handleBuildNewProgram()}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.ink} />}
            style={styles.actionButton}
          />
          <Text variant="caption" tone="muted" style={styles.persistenceNote}>
            Starting a new cycle preserves the completed cycle and its training history.
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

function handoverMetricLabel(metric: Shift['protocol']['metric']): string {
  return {
    reps: 'repetitions',
    'load-for-reps': 'load at a fixed repetition count',
    'hold-duration': 'hold time',
    'fixed-distance-time': 'time over a fixed distance',
    distance: 'distance',
    completion: 'task completion',
  }[metric];
}
