import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
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
  const [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const context = useRef({ db, owner });
  context.current = { db, owner };
  const generation = useRef(0),
    active = useRef(false),
    pending = useRef(false);
  const read = useCallback(
    async (window: CoachReviewWindow, focus: number) => {
      const current = () =>
        active.current &&
        generation.current === focus &&
        context.current.db === db &&
        context.current.owner === owner;
      if (!db || !current()) return;
      const cycle = await getActiveTrainingCycle(db, owner);
      if (!current()) return;
      if (!cycle) throw new Error('Start a private cycle before reviewing local training.');
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
      setUnits(profile?.user.unitSystem ?? 'metric');
      setReview(next);
      setHistory(saved);
      setResponse(null);
      setSkipped(false);
      setPreview(null);
      setReceipt(null);
    },
    [db, owner],
  );
  useFocusEffect(
    useCallback(() => {
      const focus = ++generation.current;
      active.current = true;
      pending.current = true;
      const window = initialWindow();
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
        context.current.owner === owner;
      void read(window, focus)
        .catch((failure: unknown) => {
          if (current())
            setError(
              failure instanceof Error ? failure.message : 'Local review could not be read.',
            );
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
    }, [db, owner, read]),
  );
  const run = async (task: (current: () => boolean) => Promise<void>) => {
    if (!db || !active.current || pending.current) return;
    const focus = generation.current,
      savedDb = db,
      savedOwner = owner;
    const current = () =>
      active.current &&
      generation.current === focus &&
      context.current.db === savedDb &&
      context.current.owner === savedOwner;
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
  const change = (key: keyof CoachReviewWindow, text: string) => {
    if (pending.current) return;
    setDates((value) => ({ ...value, [key]: text }));
    setReview(null);
    setPreview(null);
    setReceipt(null);
    setResponse(null);
    setSkipped(false);
  };
  const choose = (choice: CoachReviewChoice) => {
    if (!review || pending.current || !active.current) return;
    setPreview({
      value: previewCoachReviewChoice(review, choice, response),
      id: operationId(),
      parent: history[0]?.id ?? null,
    });
    setReceipt(null);
    setError('');
  };
  const confirm = () =>
    void run(async (current) => {
      if (!db || !preview || !review) return;
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
      setReceipt(result);
      setPreview(null);
      setHistory((items) =>
        [result, ...items.filter((item) => item.id !== result.id)].slice(0, 20),
      );
    });
  const openNext = () =>
    void run(async (current) => {
      if (!db || !receipt?.receipt.nextCapability) return;
      const cycle = await getActiveTrainingCycle(db, owner);
      if (!current()) return;
      if (
        !cycle ||
        cycle.id !== receipt.receipt.cycleId ||
        cycle.programVersionId !== receipt.receipt.programVersionId
      )
        throw new Error('The reviewed cycle changed. Reload before opening another workflow.');
      const next = await resolveCoachNavigation(db, owner, receipt.receipt.nextCapability);
      if (current()) router.push(next.route);
    });
  const goal = review ? (JSON.parse(review.evidenceFingerprint).goal as Shift | null) : null;
  const comparison = review?.goal.comparison;
  return (
    <Screen>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <Text variant="h2">Local Coach review</Text>
      <Text tone="muted">
        Review saved evidence and record your choice. Everything stays on this device.
      </Text>
      <Card style={styles.card}>
        <Text variant="bodyMedium">Choose up to seven local dates</Text>
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
              onChangeText={(text) => change(key, text)}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>
        ))}
        <Button
          label="Review these dates"
          disabled={!loaded || !db || busy}
          onPress={() =>
            void run(async () => {
              await read(dates, generation.current);
            })
          }
        />
      </Card>
      {busy ? (
        <Text accessibilityLiveRegion="polite">Reading or confirming local evidence…</Text>
      ) : null}
      {error ? (
        <Text tone="error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {review ? (
        <>
          <Card style={styles.card}>
            <Text variant="bodyMedium">Sessions started in this date range</Text>
            <Text>
              {review.window.startDate} through {review.window.endDate} · {review.window.timeZone}
            </Text>
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
                measured {comparison.baseline.measuredAt}
              </Text>
            ) : null}
            {goal && comparison?.latest ? (
              <Text>
                Latest:{' '}
                {goalValueLabel(comparison.latest.canonicalValue, goal.protocol.metric, units)} ·
                measured {comparison.latest.measuredAt}
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
                      if (pending.current) return;
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
                  if (pending.current) return;
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
      {preview ? (
        <Card style={styles.card}>
          <Text variant="bodyMedium">Confirm dated intent: {choices[preview.value.choice]}</Text>
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
          <Button label="Confirm and save intent" disabled={busy} onPress={confirm} />
          <Button
            label="Cancel preview"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              if (!pending.current) setPreview(null);
            }}
          />
        </Card>
      ) : null}
      {receipt ? (
        <Card style={styles.card}>
          <Text variant="bodyMedium" accessibilityLiveRegion="polite">
            Dated intent saved locally
          </Text>
          <Text>
            {choices[receipt.receipt.choice]} · confirmed {receipt.receipt.confirmedAt}
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
      {history.length ? (
        <Card style={styles.card}>
          <Text variant="bodyMedium">Saved dated review history</Text>
          <Text tone="muted">
            Most recent {history.length} intent receipts for this cycle. Evidence reflects each
            confirmation time.
          </Text>
          {history.map((item) => (
            <View key={item.id} style={styles.field}>
              <Text>
                {choices[item.receipt.choice]} · confirmed {item.receipt.confirmedAt}
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
