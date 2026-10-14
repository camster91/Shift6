import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Keyboard, Modal, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Screen, Text } from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';
import { getActiveTrainingCycle } from '../src/db/cycleRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import {
  loadDatedCoachReview,
  getSavedCoachReviews,
  confirmDatedCoachReview,
  type SavedCoachReview,
} from '../src/db/coachReviewRepository';
import {
  previewCoachReviewChoice,
  type CoachReviewSnapshot,
  type CoachReviewWindow,
  type CoachReviewChoice,
  type CoachReviewResponse,
  type CoachReviewPreview,
} from '../src/domain/coachReview';
import { addDaysToDateKey } from '../src/domain/calendar';
import { lifecycleDate } from '../src/domain/cycleLifecycle';
import { goalValueLabel } from '../src/domain/goalPresentation';
import type { Shift } from '../src/domain/shift';
import type { UnitSystem } from '../src/domain/types';
import { resolveCoachNavigation } from '../src/services/coachNavigation';
import { colors, spacing } from '../src/design/tokens';
import { formatRecordedDateTime } from '../src/domain/datePresentation';
import { stableSnapshotJSON } from '../src/domain/programPersistence';

function goalContext(value: {
  evidenceFingerprint: string;
  goalWitness?: SavedCoachReview['receipt']['goalWitness'];
}) {
  const evidence = JSON.parse(value.evidenceFingerprint) as {
    goal: unknown;
    observations: unknown;
  };
  return stableSnapshotJSON({
    goal: evidence.goal,
    observations: evidence.observations,
    witness: value.goalWitness ?? null,
  });
}

const choices: Record<CoachReviewChoice, string> = {
  'keep-plan': 'Keep plan',
  'review-availability': 'Review availability',
  'open-goal-review': 'Open goal review',
};
const answers: Record<string, string> = {
  'review-baseline': 'Review my baseline',
  'leave-for-later': 'Leave it for later',
  'review-availability': 'Review available time',
  'keep-plan': 'Keep current training time',
};
const states: Record<CoachReviewSnapshot['goal']['state'], string> = {
  'no-goal': 'No personal goal is saved for this cycle.',
  'missing-baseline': 'An explicit baseline is missing. No measured improvement is established.',
  'deferred-baseline': 'The baseline was deferred. No measured improvement is established.',
  'not-yet-able': 'The baseline is marked not yet able. No measured improvement is established.',
  'protocol-mismatch':
    'The baseline uses a different protocol. These measurements cannot establish a comparable change.',
  'insufficient-data': 'There are not yet two comparable measurements.',
  comparable: 'Comparable measurements are available.',
};
function initialWindow(): CoachReviewWindow {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const endDate = lifecycleDate(new Date().toISOString(), timeZone);
  return { startDate: addDaysToDateKey(endDate, -6), endDate, timeZone };
}
const operationId = () => `dated-review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function CoachReviewScreen() {
  const db = useLocalDatabase(),
    owner = useCurrentUserId();
  const [dates, setDates] = useState(initialWindow);
  const [datesExpanded, setDatesExpanded] = useState(false);
  const dateEditor = useRef({ visible: false, generation: 0 });
  const dateEditorGeneration = dateEditor.current.generation;
  const setDateEditorVisibility = useCallback((visible: boolean) => {
    dateEditor.current = { visible, generation: dateEditor.current.generation + 1 };
    setDatesExpanded(visible);
  }, []);
  const [review, setReview] = useState<Awaited<ReturnType<typeof loadDatedCoachReview>> | null>(
    null,
  );
  const [history, setHistory] = useState<SavedCoachReview[]>([]);
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [response, setResponse] = useState<CoachReviewResponse | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [preview, setPreview] = useState<{
    value: CoachReviewPreview;
    id: string;
    parent: string | null;
  } | null>(null);
  const [receipt, setReceipt] = useState<SavedCoachReview | null>(null);
  const [restoredReceipt, setRestoredReceipt] = useState(false);
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const context = useRef({ db, owner, epoch: 0 });
  if (context.current.db !== db || context.current.owner !== owner)
    context.current = { db, owner, epoch: context.current.epoch + 1 };
  const epoch = context.current.epoch;
  const [loadedFor, setLoadedFor] = useState<{
    db: ReturnType<typeof useLocalDatabase>;
    owner: string;
    epoch: number;
    focus: number;
    cycleId: string | null;
    programVersionId: string | null;
  } | null>(null);
  const generation = useRef(0),
    evidenceGeneration = useRef(0),
    active = useRef(false),
    pending = useRef(false);
  const visibleState = useRef({ loadedFor, review, preview, receipt, history, dates });
  visibleState.current = { loadedFor, review, preview, receipt, history, dates };
  const read = useCallback(
    async (window: CoachReviewWindow, focus: number) => {
      const current = () =>
        active.current &&
        generation.current === focus &&
        context.current.db === db &&
        context.current.owner === owner &&
        context.current.epoch === epoch;
      if (!db || !current()) return;
      const cycle = await getActiveTrainingCycle(db, owner);
      if (!current()) return;
      if (!cycle) throw new Error('Start a private cycle before reviewing local training.');
      if (cycle.userId !== owner)
        throw new Error('Local review ownership changed. Reload before continuing.');
      const profile = await getOnboardingProfile(db, owner);
      const next = await loadDatedCoachReview(
        db,
        owner,
        cycle.id,
        window,
        new Date().toISOString(),
      );
      const saved = await getSavedCoachReviews(db, owner, cycle.id);
      if (!current()) return;
      if (
        next.ownerId !== owner ||
        next.cycleId !== cycle.id ||
        next.programVersionId !== cycle.programVersionId ||
        saved.some((item) => item.receipt.ownerId !== owner || item.receipt.cycleId !== cycle.id)
      )
        throw new Error('Local review record ownership changed. Reload before continuing.');
      setDateEditorVisibility(false);
      setUnits(profile?.user.unitSystem ?? 'metric');
      setReview(next);
      setHistory(saved);
      setResponse(null);
      setSkipped(false);
      setPreview(null);
      const head = saved[0];
      setReceipt(
        head?.receipt.nextCapability &&
          head.receipt.programVersionId === cycle.programVersionId &&
          goalContext(head.receipt) === goalContext(next)
          ? head
          : null,
      );
      setRestoredReceipt(true);
      setLoadedFor({
        db,
        owner,
        epoch,
        focus,
        cycleId: cycle.id,
        programVersionId: cycle.programVersionId,
      });
    },
    [db, owner, epoch, setDateEditorVisibility],
  );
  useFocusEffect(
    useCallback(() => {
      const focus = ++generation.current;
      setLoadedFor(null);
      active.current = true;
      pending.current = true;
      const window = initialWindow();
      setDateEditorVisibility(false);
      setDates(window);
      setReview(null);
      setHistory([]);
      setPreview(null);
      setReceipt(null);
      setResponse(null);
      setSkipped(false);
      setError('');
      setLoaded(false);
      setBusy(true);
      const current = () =>
        active.current &&
        generation.current === focus &&
        context.current.db === db &&
        context.current.owner === owner &&
        context.current.epoch === epoch;
      void read(window, focus)
        .catch((failure: unknown) => {
          if (current()) {
            setDateEditorVisibility(true);
            setLoadedFor({ db, owner, epoch, focus, cycleId: null, programVersionId: null });
            setError(
              failure instanceof Error ? failure.message : 'Local review could not be read.',
            );
          }
        })
        .finally(() => {
          if (current()) {
            pending.current = false;
            setBusy(false);
            setLoaded(true);
          }
        });
      return () => {
        active.current = false;
        generation.current += 1;
      };
    }, [db, owner, read, epoch, setDateEditorVisibility]),
  );
  const loadMatches = () =>
    Boolean(
      loadedFor &&
      visibleState.current.loadedFor === loadedFor &&
      active.current &&
      loadedFor.db === db &&
      loadedFor.owner === owner &&
      loadedFor.db === context.current.db &&
      loadedFor.owner === context.current.owner &&
      loadedFor.epoch === context.current.epoch &&
      loadedFor.focus === generation.current,
    );
  const reviewMatches = () =>
    Boolean(
      loadMatches() &&
      review &&
      visibleState.current.review === review &&
      review.ownerId === owner &&
      review.cycleId === loadedFor?.cycleId &&
      review.programVersionId === loadedFor?.programVersionId &&
      history.every(
        (item) => item.receipt.ownerId === owner && item.receipt.cycleId === loadedFor?.cycleId,
      ),
    );
  const previewMatches = () =>
    Boolean(
      reviewMatches() &&
      preview &&
      visibleState.current.preview === preview &&
      preview.value.ownerId === owner &&
      preview.value.cycleId === loadedFor?.cycleId &&
      preview.value.programVersionId === loadedFor?.programVersionId &&
      preview.value.evidenceFingerprint === review?.evidenceFingerprint,
    );
  const receiptMatches = () =>
    Boolean(
      loadMatches() &&
      receipt &&
      visibleState.current.preview === null &&
      visibleState.current.receipt === receipt &&
      receipt.receipt.ownerId === owner &&
      receipt.receipt.cycleId === loadedFor?.cycleId &&
      receipt.receipt.programVersionId === loadedFor?.programVersionId,
    );
  const run = async (task: (current: () => boolean) => Promise<void>) => {
    if (!db || !loadMatches() || pending.current) return;
    const focus = generation.current,
      evidence = evidenceGeneration.current,
      savedDb = db,
      savedOwner = owner;
    const current = () =>
      active.current &&
      generation.current === focus &&
      evidenceGeneration.current === evidence &&
      context.current.db === savedDb &&
      context.current.owner === savedOwner &&
      context.current.epoch === epoch;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await task(current);
    } catch (failure) {
      if (current())
        setError(
          failure instanceof Error
            ? failure.message
            : 'This local review action could not be completed.',
        );
    } finally {
      if (current()) {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  const change = (key: keyof CoachReviewWindow, text: string, editorGeneration: number) => {
    if (
      pending.current ||
      !loadMatches() ||
      visibleState.current.preview !== null ||
      !dateEditor.current.visible ||
      dateEditor.current.generation !== editorGeneration
    )
      return;
    evidenceGeneration.current += 1;
    const nextDates = { ...visibleState.current.dates, [key]: text };
    visibleState.current.dates = nextDates;
    visibleState.current.review = null;
    visibleState.current.preview = null;
    visibleState.current.receipt = null;
    setDates(nextDates);
    setReview(null);
    setPreview(null);
    setReceipt(null);
    setResponse(null);
    setSkipped(false);
  };
  const choose = (choice: CoachReviewChoice) => {
    if (!review || pending.current || !reviewMatches()) return;
    Keyboard.dismiss();
    const nextPreview = {
      value: previewCoachReviewChoice(review, choice, response),
      id: operationId(),
      parent: history[0]?.id ?? null,
    };
    // Invalidate a retained continuation before React commits the modal render.
    visibleState.current.preview = nextPreview;
    setPreview(nextPreview);
    setError('');
  };
  const confirm = () =>
    void run(async (current) => {
      if (!db || !preview || !review || !previewMatches()) return;
      const result = await confirmDatedCoachReview(
        db,
        preview.value,
        preview.id,
        preview.parent,
        new Date().toISOString(),
        true,
        current,
      );
      if (!current()) return;
      if (
        result.receipt.ownerId !== owner ||
        result.receipt.cycleId !== loadedFor?.cycleId ||
        result.receipt.programVersionId !== loadedFor?.programVersionId
      )
        throw new Error('The saved intent belongs to a different review context.');
      setReceipt(result);
      setRestoredReceipt(false);
      setPreview(null);
      setHistory((items) =>
        [result, ...items.filter((item) => item.id !== result.id)].slice(0, 20),
      );
    });
  const openNext = () =>
    void run(async (current) => {
      if (!db || !receipt?.receipt.nextCapability || !receiptMatches()) return;
      const cycle = await getActiveTrainingCycle(db, owner);
      if (!current()) return;
      if (
        !cycle ||
        cycle.userId !== owner ||
        cycle.id !== receipt.receipt.cycleId ||
        cycle.programVersionId !== receipt.receipt.programVersionId
      )
        throw new Error('The reviewed cycle changed. Reload before opening another workflow.');
      const checkHead = async () => {
        const saved = await getSavedCoachReviews(db, owner, cycle.id, 1);
        if (!current()) return false;
        if (stableSnapshotJSON(saved[0] ?? null) !== stableSnapshotJSON(receipt))
          throw new Error('The latest saved intent changed. Reload before continuing.');
        return true;
      };
      if (!(await checkHead())) return;
      const checkGoal = async () => {
        const fresh = await loadDatedCoachReview(
          db,
          owner,
          cycle.id,
          receipt.receipt.window,
          new Date().toISOString(),
        );
        if (!current()) return false;
        if (
          fresh.ownerId !== owner ||
          fresh.cycleId !== cycle.id ||
          fresh.programVersionId !== cycle.programVersionId ||
          goalContext(fresh) !== goalContext(receipt.receipt)
        )
          throw new Error('The reviewed goal changed. Reload before opening another workflow.');
        return true;
      };
      if (!(await checkGoal())) return;
      const next = await resolveCoachNavigation(db, owner, receipt.receipt.nextCapability);
      if (!current() || !(await checkHead()) || !(await checkGoal())) return;
      const latestCycle = await getActiveTrainingCycle(db, owner);
      if (!current()) return;
      if (
        !latestCycle ||
        latestCycle.userId !== owner ||
        latestCycle.id !== cycle.id ||
        latestCycle.programVersionId !== cycle.programVersionId
      )
        throw new Error('The reviewed cycle changed. Reload before opening another workflow.');
      router.push(next.route);
    });
  if (!loadMatches())
    return (
      <Screen>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
        <Text variant="h2">Local Coach review</Text>
        <Text accessibilityLiveRegion="polite">Loading the current person's local review…</Text>
      </Screen>
    );
  const goal =
    reviewMatches() && review
      ? (JSON.parse(review.evidenceFingerprint).goal as Shift | null)
      : null;
  const comparison = review?.goal.comparison;
  return (
    <Screen>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <Text variant="h2">Local Coach review</Text>
      <Text tone="muted">
        Review saved evidence and record your choice. Everything stays on this device.
      </Text>
      {receiptMatches() && receipt ? (
        <Card style={styles.card}>
          <Text variant="bodyMedium" accessibilityLiveRegion="polite">
            {restoredReceipt ? 'Latest saved dated intent' : 'Dated intent saved locally'}
          </Text>
          <Text>
            {choices[receipt.receipt.choice]} · confirmed{' '}
            {formatRecordedDateTime(receipt.receipt.confirmedAt, receipt.receipt.window.timeZone)}
          </Text>
          <Text tone="muted">
            Reviewed dates: {receipt.receipt.window.startDate} through{' '}
            {receipt.receipt.window.endDate} · {receipt.receipt.window.timeZone}
          </Text>
          <Text>Your plan was not changed by this receipt.</Text>
          {receipt.receipt.nextCapability ? (
            <Button
              label={
                receipt.receipt.nextCapability === 'open-goal'
                  ? 'Continue to personal goal'
                  : 'Continue to setup'
              }
              disabled={busy}
              onPress={openNext}
            />
          ) : null}
        </Card>
      ) : null}
      <Card style={styles.card}>
        <Text variant="bodyMedium">Review date window</Text>
        {!datesExpanded && reviewMatches() && review ? (
          <Text>
            {review.window.startDate} through {review.window.endDate} · {review.window.timeZone}
          </Text>
        ) : null}
        <Button
          label={datesExpanded ? 'Hide review date controls' : 'Change review dates'}
          variant="secondary"
          accessibilityHint={
            datesExpanded
              ? 'Closes the date controls after valid dates have been reviewed.'
              : 'Opens start date, end date and time zone fields for this local review.'
          }
          disabled={busy || (datesExpanded && !reviewMatches())}
          onPress={() => {
            const visible = dateEditor.current.visible;
            if (pending.current || !loadMatches() || (visible && !reviewMatches())) return;
            if (visible) Keyboard.dismiss();
            setDateEditorVisibility(!visible);
          }}
        />
        {datesExpanded ? (
          <>
            <Text tone="muted">
              All three fields are required. Use YYYY-MM-DD dates, at most seven elapsed local
              dates, and a valid time zone such as America/Toronto. Select Review these dates before
              closing the controls.
            </Text>
            {(['startDate', 'endDate', 'timeZone'] as const).map((key) => (
              <View key={key} style={styles.field}>
                <Text>
                  {key === 'startDate'
                    ? 'Start date (YYYY-MM-DD)'
                    : key === 'endDate'
                      ? 'End date (YYYY-MM-DD)'
                      : 'Time zone (IANA name)'}
                </Text>
                <TextInput
                  accessibilityLabel={
                    key === 'startDate'
                      ? 'Review start date'
                      : key === 'endDate'
                        ? 'Review end date'
                        : 'Review time zone'
                  }
                  editable={!busy}
                  maxLength={key === 'timeZone' ? 128 : 10}
                  returnKeyType="done"
                  value={dates[key]}
                  onChangeText={(text) => change(key, text, dateEditorGeneration)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            ))}
            <Button
              label="Review these dates"
              disabled={!loaded || !db || busy}
              onPress={() => {
                if (
                  !dateEditor.current.visible ||
                  dateEditor.current.generation !== dateEditorGeneration ||
                  visibleState.current.preview !== null ||
                  visibleState.current.dates !== dates
                )
                  return;
                void run(async (current) => {
                  await read(dates, generation.current);
                  if (current()) Keyboard.dismiss();
                });
              }}
            />
          </>
        ) : null}
      </Card>
      {busy ? (
        <Text accessibilityLiveRegion="polite">Reading or confirming local evidence…</Text>
      ) : null}
      {error && !previewMatches() ? (
        <Text tone="error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {reviewMatches() && review ? (
        <>
          <Card style={styles.card}>
            <Text variant="bodyMedium">Sessions started in this date range</Text>
            <Text>
              {review.training.complete} complete · {review.training.partial} partial ·{' '}
              {review.training.skipped} skipped · {review.training.inProgress} in progress
            </Text>
            {review.training.otherRecords ? (
              <Text>
                {review.training.otherRecords} planned or abandoned records are separate from those
                counts.
              </Text>
            ) : null}
            <Text tone="muted">
              These are saved sessions, not unique planned workouts. A resumed session is counted by
              its original start date. Planned coverage and adherence are unavailable in this
              review.
            </Text>
            {review.reportedDiscomfort ? (
              <Text tone="warning">
                A saved session reports discomfort. This review does not recommend increasing
                training.
              </Text>
            ) : null}
          </Card>
          <Card style={styles.card}>
            <Text variant="bodyMedium">Personal goal: baseline to latest</Text>
            <Text>
              {review.goalWitness?.state === 'unavailable-legacy-history'
                ? 'A personal goal is saved, but its dated change history is unavailable. This review withholds comparison and attainment; open your personal goal to inspect its records.'
                : states[review.goal.state]}
            </Text>
            <Text tone="muted">
              When available, this goal comparison uses the explicit baseline and latest eligible
              measurement across its history, separately from the selected session dates.
            </Text>
            {goal ? (
              <>
                <Text>{goal.blockObjective}</Text>
                {goal.protocol.metric === 'load-for-reps' ? (
                  <Text>Load for {goal.protocol.repCount} repetitions.</Text>
                ) : null}
                {goal.protocol.metric === 'fixed-distance-time' ? (
                  <Text>
                    Time for {goalValueLabel(goal.protocol.fixedDistanceMeters, 'distance', units)}.
                  </Text>
                ) : null}
                <Text>
                  Goal target: {goalValueLabel(goal.target, goal.protocol.metric, units)}.
                </Text>
                <Text tone="muted">
                  Same measurement setup: {goal.protocol.equipmentSetup}. Assistance:{' '}
                  {goal.protocol.assistance}.
                </Text>
              </>
            ) : null}
            {goal && comparison?.baseline ? (
              <Text>
                Baseline:{' '}
                {goalValueLabel(comparison.baseline.canonicalValue, goal.protocol.metric, units)} ·
                measured{' '}
                {formatRecordedDateTime(comparison.baseline.measuredAt, review.window.timeZone)}
              </Text>
            ) : null}
            {goal && comparison?.latest ? (
              <Text>
                Latest:{' '}
                {goalValueLabel(comparison.latest.canonicalValue, goal.protocol.metric, units)} ·
                measured{' '}
                {formatRecordedDateTime(comparison.latest.measuredAt, review.window.timeZone)}
              </Text>
            ) : null}
            {comparison ? (
              <Text>
                Measured change: {comparison.change.replaceAll('-', ' ')}. Target:{' '}
                {comparison.attainment.replaceAll('-', ' ')}.
              </Text>
            ) : null}
            {comparison?.excludedObservationIds.length ? (
              <Text tone="muted">
                {comparison.excludedObservationIds.length} observations excluded from the comparable
                series.
              </Text>
            ) : null}
          </Card>
          {review.question ? (
            <Card style={styles.card}>
              <Text variant="bodyMedium">One optional question</Text>
              <Text>{review.question.text}</Text>
              {review.question.answers
                .filter((answer) => answer !== 'skip')
                .map((answer) => (
                  <Button
                    key={answer}
                    label={answers[answer] ?? answer}
                    variant="secondary"
                    selected={response?.answer === answer}
                    disabled={busy}
                    onPress={() => {
                      if (pending.current || !reviewMatches()) return;
                      setResponse({ questionId: review.question!.id, answer });
                      setSkipped(false);
                      setPreview(null);
                    }}
                  />
                ))}
              <Button
                label="Skip question"
                variant="ghost"
                selected={skipped}
                disabled={busy}
                onPress={() => {
                  if (pending.current || !reviewMatches()) return;
                  setResponse(null);
                  setSkipped(true);
                  setPreview(null);
                }}
              />
              {skipped ? <Text>Question skipped.</Text> : null}
            </Card>
          ) : null}
          <Card style={styles.card}>
            <Text variant="bodyMedium">Preview a choice</Text>
            {(Object.keys(choices) as CoachReviewChoice[]).map((choice) => (
              <Button
                key={choice}
                label={choices[choice]}
                variant="secondary"
                disabled={busy}
                onPress={() => choose(choice)}
              />
            ))}
          </Card>
        </>
      ) : null}
      {previewMatches() && preview ? (
        <Modal
          testID="coach-review-preview-modal"
          visible
          animationType="none"
          presentationStyle="fullScreen"
          accessibilityViewIsModal
          onRequestClose={() => {
            if (!pending.current && previewMatches()) setPreview(null);
          }}
        >
          <Screen
            footer={
              <View style={styles.previewActions}>
                {error ? (
                  <Text tone="error" accessibilityRole="alert" accessibilityLiveRegion="polite">
                    {error}
                  </Text>
                ) : null}
                <Button label="Confirm and save intent" disabled={busy} onPress={confirm} />
                <Button
                  label="Cancel preview"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => {
                    if (!pending.current && previewMatches()) setPreview(null);
                  }}
                />
              </View>
            }
          >
            <Text variant="h2" accessibilityRole="header">
              Confirm dated intent: {choices[preview.value.choice]}
            </Text>
            <Text>
              {preview.value.window.startDate} through {preview.value.window.endDate} ·{' '}
              {preview.value.window.timeZone}
            </Text>
            <Text>
              {preview.value.choice === 'keep-plan'
                ? 'Save your choice to keep the current plan.'
                : 'Save your intention to review an existing workflow. Open it separately after confirmation; any changes require its own confirmation.'}
            </Text>
            <Text tone="muted">
              Saving this receipt does not edit training, schedule, goal, or the end-of-cycle
              reflection.
            </Text>
          </Screen>
        </Modal>
      ) : null}
      {history.length &&
      history.every(
        (item) => item.receipt.ownerId === owner && item.receipt.cycleId === loadedFor?.cycleId,
      ) ? (
        <Card style={styles.card}>
          <Text variant="bodyMedium">Saved dated review history</Text>
          <Text tone="muted">
            Most recent {history.length} intent receipts for this cycle. Evidence reflects each
            confirmation time.
          </Text>
          {history.map((item) => (
            <View key={item.id} style={styles.field}>
              <Text>
                {choices[item.receipt.choice]} · confirmed{' '}
                {formatRecordedDateTime(item.receipt.confirmedAt, item.receipt.window.timeZone)}
              </Text>
              <Text tone="muted">
                {item.receipt.window.startDate} through {item.receipt.window.endDate} ·{' '}
                {item.receipt.window.timeZone}
              </Text>
              <Text tone="muted">
                {item.receipt.response
                  ? `Optional answer: ${answers[item.receipt.response.answer] ?? item.receipt.response.answer}.`
                  : 'No optional answer was recorded.'}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  previewActions: { gap: spacing.sm },
  card: { gap: spacing.md },
  field: { gap: spacing.sm },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.ink,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
  },
});
