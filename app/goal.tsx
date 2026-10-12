import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Screen, Text } from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { getActiveTrainingCycle } from '../src/db/cycleRepository';
import {
  appendPersonalObservation,
  createPersonalGoal,
  getPersonalGoal,
  getPersonalGoalDraft,
  getPersonalObservations,
  revisePersonalTarget,
  savePersonalGoalDraft,
  savePersonalReview,
  setPersonalBaselineState,
} from '../src/db/personalGoalRepository';
import { colors, spacing } from '../src/design/tokens';
import {
  evaluateShift,
  type MeasurementProtocol,
  type Shift,
  type ShiftObservation,
} from '../src/domain/shift';
import type { TrainingCycle } from '../src/domain/types';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

type Metric = MeasurementProtocol['metric'];
const labels: Record<Metric, string> = {
  reps: 'Repetitions',
  'hold-duration': 'Hold in seconds',
  distance: 'Distance in meters',
  'load-for-reps': 'Load for a fixed rep count (kg)',
  'fixed-distance-time': 'Time for a fixed distance (seconds)',
  completion: 'Complete an activity',
};
const units = {
  reps: 'reps',
  'hold-duration': 'seconds',
  distance: 'meters',
  'load-for-reps': 'kg',
  'fixed-distance-time': 'seconds',
  completion: 'completed',
} as const;
const initial = {
  objective: '',
  metric: 'reps',
  target: '',
  setup: '',
  assistance: '',
  replace: 'no',
  repCount: '',
  fixedDistance: '',
};
const uid = () => `personal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
function numeric(value: string) {
  if (!value.trim() || !/^\d+(\.\d+)?$/.test(value.trim()))
    throw new Error('Enter a measurement using numbers.');
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error('Enter a finite measurement.');
  return result;
}
export default function PersonalGoalScreen() {
  const db = useLocalDatabase();
  const owner = useCurrentUserId();
  const [cycle, setCycle] = useState<TrainingCycle | null>(null);
  const [goal, setGoal] = useState<Shift | null>(null);
  const [observations, setObservations] = useState<ShiftObservation[]>([]);
  const [fields, setFields] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [value, setValue] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [reason, setReason] = useState('');
  const [correction, setCorrection] = useState<ShiftObservation | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const context = useRef({ db, owner });
  context.current = { db, owner };
  useEffect(() => {
    let live = true;
    setLoaded(false);
    setError('');
    setGoal(null);
    setCycle(null);
    setFields(initial);
    setObservations([]);
    setValue('');
    setCorrection(null);
    if (!db) {
      setLoaded(true);
      return;
    }
    void (async () => {
      const active = await getActiveTrainingCycle(db, owner);
      if (!live) return;
      if (active) {
        const current = await getPersonalGoal(db, owner, active.id);
        const draft = current ? null : await getPersonalGoalDraft(db, owner, active.id);
        const entries = current ? await getPersonalObservations(db, owner, current.id) : [];
        if (!live) return;
        setCycle(active);
        setGoal(current);
        setObservations(entries);
        if (draft)
          setFields({
            ...initial,
            ...Object.fromEntries(Object.entries(draft).filter(([k]) => k in initial)),
          });
      }
    })()
      .catch(() => {
        if (live) setError('Your saved goal could not be loaded. Go back and try again.');
      })
      .finally(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [db, owner]);
  const change = (key: keyof typeof initial, text: string) => {
    const next = { ...fields, [key]: text };
    setFields(next);
    if (!db || !cycle || goal) return;
    const savedDb = db,
      savedOwner = owner,
      savedCycle = cycle.id;
    queue.current = queue.current
      .catch(() => undefined)
      .then(() => savePersonalGoalDraft(savedDb, savedOwner, savedCycle, next));
    void queue.current.catch(() => {
      if (context.current.db === savedDb && context.current.owner === savedOwner)
        setError('Draft could not be saved. Keep this screen open and try again.');
    });
  };
  const act = async (operation: () => Promise<void>) => {
    if (!db || !cycle || busy) return;
    const savedDb = db,
      savedOwner = owner;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await queue.current;
      await operation();
      if (context.current.db !== savedDb || context.current.owner !== savedOwner) return;
      const current = await getPersonalGoal(savedDb, savedOwner, cycle.id);
      setGoal(current);
      setObservations(
        current ? await getPersonalObservations(savedDb, savedOwner, current.id) : [],
      );
      setNotice('Saved on this device.');
    } catch (e) {
      if (context.current.db === savedDb && context.current.owner === savedOwner)
        setError(
          e instanceof Error
            ? e.message
            : 'Could not save. Your existing records remain available.',
        );
    } finally {
      setBusy(false);
    }
  };
  const input = (
    label: string,
    current: string,
    onChange: (v: string) => void,
    numbers = false,
  ) => (
    <View style={styles.field}>
      <Text variant="smallMedium">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={current}
        onChangeText={onChange}
        editable={!busy}
        maxLength={240}
        keyboardType={numbers ? 'decimal-pad' : 'default'}
        style={styles.input}
      />
    </View>
  );
  const create = () =>
    act(async () => {
      const metric = fields.metric as Metric;
      if (!(metric in labels)) throw new Error('Choose a measurement.');
      const id = uid();
      const protocol = {
        id: `${id}-setup`,
        version: 1,
        exerciseId: fields.objective,
        variantId: fields.objective,
        assistance: fields.assistance,
        equipmentSetup: fields.setup,
        metric,
        canonicalUnit: units[metric],
        direction:
          metric === 'completion'
            ? 'complete'
            : metric === 'fixed-distance-time'
              ? 'lower'
              : 'higher',
        ...(metric === 'load-for-reps' ? { repCount: numeric(fields.repCount) } : {}),
        ...(metric === 'fixed-distance-time'
          ? { fixedDistanceMeters: numeric(fields.fixedDistance) }
          : {}),
      } as MeasurementProtocol;
      await createPersonalGoal(
        db!,
        owner,
        cycle!.id,
        {
          id,
          objective: fields.objective,
          protocol,
          target: metric === 'completion' ? true : numeric(fields.target),
          replacePrimary: fields.replace === 'yes',
        },
        new Date().toISOString(),
      );
    });
  const record = (baseline: boolean) =>
    act(async () => {
      if (!goal) return;
      if (goal.protocol.metric === 'completion' && !['true', 'false'].includes(value))
        throw new Error('Choose completed or not completed.');
      const at = new Date().toISOString();
      await appendPersonalObservation(
        db!,
        owner,
        {
          id: uid(),
          shiftId: goal.id,
          protocolId: goal.protocol.id,
          protocolVersion: goal.protocol.version,
          measuredAt: correction?.measuredAt ?? at,
          source: correction ? 'historical-entry' : 'assessment',
          value: goal.protocol.metric === 'completion' ? value === 'true' : numeric(value),
          unit: goal.protocol.canonicalUnit,
          ...(correction ? { correctsObservationId: correction.id } : {}),
        },
        baseline,
        at,
      );
      setValue('');
      setCorrection(null);
    });
  const progress = goal && cycle ? evaluateShift(goal, cycle, observations) : null;
  const display = (v: number | boolean | undefined) =>
    v === undefined
      ? 'Not measured'
      : typeof v === 'boolean'
        ? v
          ? 'Completed'
          : 'Not completed'
        : String(Math.round(v * 100) / 100);
  return (
    <Screen
      footer={
        loaded && cycle ? (
          <View>
            {error ? (
              <Text accessibilityRole="alert">{error}</Text>
            ) : notice ? (
              <Text accessibilityLiveRegion="polite">{notice}</Text>
            ) : null}
            {!goal ? (
              <Button label="Save personal goal" loading={busy} onPress={() => void create()} />
            ) : null}
          </View>
        ) : undefined
      }
    >
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <Text variant="h1" accessibilityRole="header">
        Personal goal
      </Text>
      <Text style={styles.field}>
        Your own target and measurements, saved locally. This does not prescribe an exercise or
        verify that a target is safe for you.
      </Text>
      {!loaded ? (
        <Text>Loading your goal…</Text>
      ) : !cycle ? (
        <Card>
          <Text>Start a training plan before adding a personal goal.</Text>
          <Button label="Choose a plan" onPress={() => router.push('/programs')} />
        </Card>
      ) : !goal ? (
        <Card>
          {input('What do you want to track?', fields.objective, (v) => change('objective', v))}
          <Text variant="smallMedium">Measurement</Text>
          {(Object.keys(labels) as Metric[]).map((m) => (
            <Button
              key={m}
              label={labels[m]}
              variant={fields.metric === m ? 'primary' : 'secondary'}
              disabled={busy}
              onPress={() => change('metric', m)}
              style={styles.field}
            />
          ))}
          {fields.metric === 'load-for-reps'
            ? input('Fixed rep count', fields.repCount, (v) => change('repCount', v), true)
            : null}
          {fields.metric === 'fixed-distance-time'
            ? input(
                'Fixed distance (meters)',
                fields.fixedDistance,
                (v) => change('fixedDistance', v),
                true,
              )
            : null}
          {fields.metric === 'completion' ? (
            <Text>Target: complete this activity.</Text>
          ) : (
            input(
              `Target (${units[fields.metric as Metric] ?? 'choose measurement'})`,
              fields.target,
              (v) => change('target', v),
              true,
            )
          )}
          {input('Equipment and setup (write “none” if none)', fields.setup, (v) =>
            change('setup', v),
          )}
          {input('Assistance (write “none” if none)', fields.assistance, (v) =>
            change('assistance', v),
          )}
          <Text>
            Use the same setup for comparable measurements. Changing your setup needs a separate
            goal.
          </Text>
          <Button
            label={
              fields.replace === 'yes'
                ? 'Previous goal replacement confirmed'
                : 'Allow replacing a previous primary goal'
            }
            variant="secondary"
            disabled={busy}
            onPress={() => change('replace', fields.replace === 'yes' ? 'no' : 'yes')}
            style={styles.field}
          />
        </Card>
      ) : (
        <>
          <Card>
            <Text variant="h2">{goal.blockObjective}</Text>
            <Text>
              Target:{' '}
              {goal.target === true
                ? 'Complete this activity'
                : String(goal.target) + ' ' + goal.protocol.canonicalUnit}
            </Text>
            <Text>
              Setup: {goal.protocol.equipmentSetup}. Assistance: {goal.protocol.assistance}.
              {goal.protocol.metric === 'load-for-reps'
                ? ' Fixed rep count: ' + goal.protocol.repCount
                : goal.protocol.metric === 'fixed-distance-time'
                  ? ' Fixed distance: ' + goal.protocol.fixedDistanceMeters + ' meters'
                  : ''}
            </Text>
            <Text>
              Baseline: {display(progress?.baseline?.canonicalValue)} · Latest:{' '}
              {display(progress?.latest?.canonicalValue)}
            </Text>
            <Text>Personal best: {display(progress?.personalBest?.canonicalValue)}</Text>
            <Text>
              {progress?.attainment === 'met'
                ? 'Measured target met'
                : progress?.attainment === 'not-met'
                  ? 'Measured target not yet met'
                  : 'Target attainment needs a measurement'}
            </Text>
            <Text>
              Baseline status: {goal.baseline.state}. Missing measurements are never treated as
              zero.
            </Text>
          </Card>
          <Card style={styles.field}>
            <Text variant="h2">
              {correction ? 'Correct a measurement' : 'Record a measurement'}
            </Text>
            {correction ? <Text>The original entry and date stay in your history.</Text> : null}
            {goal.protocol.metric === 'completion' ? (
              <View>
                {(['true', 'false'] as const).map((option) => (
                  <Button
                    key={option}
                    label={option === 'true' ? 'Completed' : 'Not completed'}
                    variant={value === option ? 'primary' : 'secondary'}
                    disabled={busy}
                    onPress={() => setValue(option)}
                    style={styles.field}
                  />
                ))}
              </View>
            ) : (
              input(`Actual value (${goal.protocol.canonicalUnit})`, value, setValue, true)
            )}
            <Button
              label={correction ? 'Save correction' : 'Save measurement'}
              loading={busy}
              onPress={() => void record(false)}
            />
            {!correction ? (
              <Button
                label="Save as baseline"
                variant="secondary"
                disabled={busy}
                onPress={() => void record(true)}
                style={styles.field}
              />
            ) : (
              <Button
                label="Cancel correction"
                variant="ghost"
                disabled={busy}
                onPress={() => {
                  setCorrection(null);
                  setValue('');
                }}
              />
            )}
            {(['deferred', 'not-yet-able'] as const).map((state) => (
              <Button
                key={state}
                label={state === 'deferred' ? 'Defer baseline' : 'Mark baseline not yet able'}
                variant="ghost"
                disabled={busy}
                onPress={() =>
                  void act(() =>
                    setPersonalBaselineState(
                      db!,
                      owner,
                      goal.id,
                      state,
                      uid(),
                      new Date().toISOString(),
                    ),
                  )
                }
              />
            ))}
          </Card>
          <Card>
            <Text variant="h2">Measurement history</Text>
            {observations.length === 0 ? (
              <Text>No measurements yet.</Text>
            ) : (
              observations.map((o) => (
                <View key={o.id} style={styles.field}>
                  <Text>
                    {new Date(o.measuredAt).toLocaleString()} · {display(o.value)} {o.unit}
                    {o.correctsObservationId ? ' · correction' : ''}
                  </Text>
                  {!observations.some((child) => child.correctsObservationId === o.id) ? (
                    <Button
                      label="Correct this entry"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => {
                        setCorrection(o);
                        setValue(String(o.value));
                      }}
                    />
                  ) : (
                    <Text>Original retained; see its correction.</Text>
                  )}
                </View>
              ))
            )}
          </Card>
          {goal.protocol.metric !== 'completion' ? (
            <Card style={styles.field}>
              <Text variant="h2">Revise target</Text>
              {input(`New target (${goal.protocol.canonicalUnit})`, newTarget, setNewTarget, true)}
              {input('Reason for changing target', reason, setReason)}
              <Button
                label="Save target revision"
                disabled={busy}
                onPress={() =>
                  void act(async () => {
                    await revisePersonalTarget(
                      db!,
                      owner,
                      goal.id,
                      numeric(newTarget),
                      reason,
                      uid(),
                      new Date().toISOString(),
                    );
                    setNewTarget('');
                    setReason('');
                  })
                }
              />
              <Text>Previous target revisions and measurements stay in your exported history.</Text>
            </Card>
          ) : null}
          <Card>
            <Text variant="h2">Review and next step</Text>
            <Text>
              Review: {goal.reviewState}. Next step: {goal.nextChoice}.
            </Text>
            {(['maintain', 'repeat', 'modify', 'new-goal', 'break'] as const).map((choice) => (
              <Button
                key={choice}
                label={`Record next step: ${choice.replace('-', ' ')}`}
                variant="secondary"
                disabled={busy}
                style={styles.field}
                onPress={() =>
                  void act(() =>
                    savePersonalReview(
                      db!,
                      owner,
                      goal.id,
                      'completed',
                      choice,
                      uid(),
                      new Date().toISOString(),
                    ),
                  )
                }
              />
            ))}
            <Button
              label="Postpone review"
              variant="ghost"
              disabled={busy}
              onPress={() =>
                void act(() =>
                  savePersonalReview(
                    db!,
                    owner,
                    goal.id,
                    'postponed',
                    'undecided',
                    uid(),
                    new Date().toISOString(),
                  ),
                )
              }
            />
            <Text>Recording a choice does not start or change a training plan.</Text>
          </Card>
        </>
      )}
      {!cycle && error ? (
        <Text accessibilityRole="alert" style={styles.field}>
          {error}
        </Text>
      ) : null}
      {!cycle && notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.field}>
          {notice}
        </Text>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  field: { marginVertical: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
    color: colors.ink,
    marginTop: 8,
  },
});
