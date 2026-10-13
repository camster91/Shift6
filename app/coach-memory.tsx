import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { TextInput, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  LoadingSkeleton,
  Screen,
  Text,
} from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';
import {
  confirmCoachMemoryFact,
  forgetCoachMemoryFact,
  getCoachMemorySnapshot,
  setCoachMemoryEnabled,
  type CoachMemorySnapshot,
} from '../src/db/coachMemoryRepository';
import type { CoachMemoryFact, CoachMemoryValue } from '../src/domain/localPersistence';
import { equipmentCatalog } from '../src/domain/equipment';
import { memoryKindLabels, memoryProvenance, memoryValueLabel } from '../src/services/coachMemory';
import { colors, radii, spacing } from '../src/design/tokens';

type Preview =
  | {
      action: 'fact';
      value: CoachMemoryValue;
      operationId: string;
      expectedRevision: number;
      stamp: string | null;
    }
  | { action: 'enabled'; enabled: boolean; stamp: string | null }
  | { action: 'forget'; fact: CoachMemoryFact; stamp: string | null };
export default function CoachMemoryScreen() {
  const db = useLocalDatabase(),
    owner = useCurrentUserId();
  const identity = useRef({ db, owner });
  identity.current = { db, owner };
  const generation = useRef(0),
    pending = useRef<Preview | null>(null),
    writing = useRef(false);
  const focused = useRef(false);
  const [snapshot, setSnapshot] = useState<CoachMemorySnapshot | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [kind, setKind] = useState<CoachMemoryValue['kind']>('training-time');
  const [trainingTime, setTrainingTime] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [minutes, setMinutes] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [style, setStyle] = useState<'concise' | 'supportive' | 'technical'>('concise');
  const current = useCallback(
    (token: number) =>
      generation.current === token &&
      identity.current.db === db &&
      identity.current.owner === owner,
    [db, owner],
  );
  const clearPreview = () => {
    pending.current = null;
    setPreview(null);
    setMessage('');
  };
  const read = useCallback(
    async (token: number) => {
      if (!db) {
        if (current(token)) {
          setError('Local storage is unavailable. No memory was changed.');
          setLoading(false);
        }
        return;
      }
      try {
        const loaded = await getCoachMemorySnapshot(db, owner);
        if (current(token)) setSnapshot(loaded);
      } catch (failure) {
        if (current(token))
          setError(failure instanceof Error ? failure.message : 'Local memory could not be read.');
      } finally {
        if (current(token)) setLoading(false);
      }
    },
    [db, owner, current],
  );
  useFocusEffect(
    useCallback(() => {
      const token = ++generation.current;
      focused.current = true;
      pending.current = null;
      setPreview(null);
      setSnapshot(null);
      setLoading(true);
      setError('');
      setMessage('');
      setBusy(writing.current);
      setMinutes('');
      setEquipment([]);
      setTrainingTime('morning');
      setStyle('concise');
      setKind('training-time');
      void read(token);
      return () => {
        generation.current++;
        focused.current = false;
        pending.current = null;
      };
    }, [read]),
  );
  const stage = (value: Preview) => {
    if (
      writing.current ||
      !snapshot ||
      snapshot.owner !== owner ||
      identity.current.owner !== owner ||
      identity.current.db !== db
    )
      return;
    pending.current = value;
    setPreview(value);
    setError('');
    setMessage('');
  };
  const edit = (fact: CoachMemoryFact) => {
    if (
      writing.current ||
      fact.userId !== owner ||
      identity.current.owner !== owner ||
      identity.current.db !== db
    )
      return;
    clearPreview();
    setKind(fact.value.kind);
    if (fact.value.kind === 'training-time') setTrainingTime(fact.value.value);
    if (fact.value.kind === 'session-minutes') setMinutes(String(fact.value.value));
    if (fact.value.kind === 'equipment') setEquipment([...fact.value.value]);
    if (fact.value.kind === 'coach-style') setStyle(fact.value.value);
  };
  const previewFact = () => {
    if (!snapshot) return;
    let value: CoachMemoryValue;
    if (kind === 'training-time') value = { kind, value: trainingTime };
    else if (kind === 'session-minutes') {
      if (!/^\d+$/.test(minutes) || Number(minutes) < 1 || Number(minutes) > 1440) {
        setError('Enter whole session minutes from 1 to 1440.');
        return;
      }
      value = { kind, value: Number(minutes) };
    } else if (kind === 'equipment') value = { kind, value: [...equipment].sort() };
    else value = { kind, value: style };
    stage({
      action: 'fact',
      value,
      expectedRevision: snapshot.facts.find((fact) => fact.value.kind === kind)?.revision ?? 0,
      operationId: `confirmed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      stamp: snapshot.preferenceUpdatedAt,
    });
  };
  const confirm = async (expectedPreview: Preview) => {
    const proposed = pending.current;
    if (
      !proposed ||
      proposed !== expectedPreview ||
      writing.current ||
      !db ||
      !snapshot ||
      snapshot.owner !== owner
    )
      return;
    const token = generation.current;
    pending.current = null;
    setPreview(null);
    writing.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const guard = () => current(token);
    try {
      const at = new Date().toISOString();
      if (proposed.action === 'fact')
        await confirmCoachMemoryFact(db, {
          owner,
          value: proposed.value,
          expectedRevision: proposed.expectedRevision,
          expectedPreferenceUpdatedAt: proposed.stamp,
          operationId: proposed.operationId,
          confirmedAt: at,
          guard,
        });
      else if (proposed.action === 'enabled')
        await setCoachMemoryEnabled(db, owner, proposed.enabled, proposed.stamp, at, guard);
      else
        await forgetCoachMemoryFact(
          db,
          owner,
          proposed.fact.id,
          proposed.fact.revision,
          proposed.stamp,
          at,
          guard,
        );
      if (current(token)) {
        setMessage(
          proposed.action === 'forget'
            ? 'Preference deleted from local memory. Your canonical records and previous exported files remain separate.'
            : 'Confirmed local memory saved. No profile, plan, result or provider consent was changed.',
        );
        await read(token);
      }
    } catch (failure) {
      if (current(token)) {
        setError(failure instanceof Error ? failure.message : 'Local memory could not be changed.');
        await read(token);
      }
    } finally {
      writing.current = false;
      if (focused.current) setBusy(false);
    }
  };
  if (loading || (snapshot && snapshot.owner !== owner))
    return (
      <Screen>
        <LoadingSkeleton height={150} />
      </Screen>
    );
  if (!snapshot?.profile)
    return (
      <Screen>
        <Text variant="h2">Local Coach memory</Text>
        <ErrorState
          message={error || 'Complete your local setup before confirming practical preferences.'}
        />
        <Button label="Open setup" onPress={() => router.push('/onboarding')} />
      </Screen>
    );
  return (
    <Screen>
      <Text variant="h1" accessibilityRole="header">
        Local Coach memory
      </Text>
      <Text>
        Only practical preferences you preview and confirm are remembered. Memory is{' '}
        {snapshot.enabled ? 'on' : 'off'} for local explanations. It never enables online AI or
        changes your profile, plan, goals or training results.
      </Text>
      <Button
        label={snapshot.enabled ? 'Review disabling local memory' : 'Review enabling local memory'}
        disabled={busy}
        variant="secondary"
        onPress={() =>
          stage({
            action: 'enabled',
            enabled: !snapshot.enabled,
            stamp: snapshot.preferenceUpdatedAt,
          })
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
      {snapshot.facts.length ? (
        snapshot.facts.map((fact) => (
          <Card key={fact.id}>
            <Text variant="h3">
              {memoryKindLabels[fact.value.kind]}: {memoryValueLabel(fact.value)}
            </Text>
            <Text variant="small">
              Confirmed {new Date(fact.confirmedAt).toLocaleString()} · revision {fact.revision} ·
              local record {fact.id}
            </Text>
            <Text>{memoryProvenance(fact, snapshot)}</Text>
            <Button
              label={`Edit ${memoryKindLabels[fact.value.kind]}`}
              variant="ghost"
              disabled={busy}
              onPress={() => edit(fact)}
            />
            <Button
              label={`Review forgetting ${memoryKindLabels[fact.value.kind]}`}
              variant="ghost"
              disabled={busy}
              onPress={() => stage({ action: 'forget', fact, stamp: snapshot.preferenceUpdatedAt })}
            />
          </Card>
        ))
      ) : (
        <Text>
          No practical preferences have been confirmed. Canonical setup and training records are
          still available to local Coach.
        </Text>
      )}
      <Card>
        <Text variant="h3">Review a practical preference</Text>
        <View>
          {(Object.keys(memoryKindLabels) as CoachMemoryValue['kind'][]).map((item) => (
            <Chip
              key={item}
              label={memoryKindLabels[item]}
              selected={kind === item}
              disabled={busy}
              onPress={() => {
                clearPreview();
                setKind(item);
              }}
            />
          ))}
        </View>
        {kind === 'training-time' ? (
          <View>
            {(['morning', 'afternoon', 'evening'] as const).map((item) => (
              <Chip
                key={item}
                label={`Remember ${item}`}
                selected={trainingTime === item}
                disabled={busy}
                onPress={() => {
                  clearPreview();
                  setTrainingTime(item);
                }}
              />
            ))}
          </View>
        ) : null}
        {kind === 'session-minutes' ? (
          <TextInput
            accessibilityLabel="Practical session minutes"
            editable={!busy}
            keyboardType="number-pad"
            value={minutes}
            onChangeText={(text) => {
              clearPreview();
              setMinutes(text);
            }}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.md,
              padding: spacing.md,
              fontSize: 16,
              color: colors.ink,
            }}
          />
        ) : null}
        {kind === 'equipment' ? (
          <View>
            {equipmentCatalog.map((item) => (
              <Chip
                key={item.id}
                label={`Remember ${item.name}`}
                selected={equipment.includes(item.id)}
                disabled={busy}
                onPress={() => {
                  clearPreview();
                  setEquipment((prior) =>
                    prior.includes(item.id)
                      ? prior.filter((id) => id !== item.id)
                      : [...prior, item.id],
                  );
                }}
              />
            ))}
          </View>
        ) : null}
        {kind === 'coach-style' ? (
          <View>
            {(['concise', 'supportive', 'technical'] as const).map((item) => (
              <Chip
                key={item}
                label={`Remember ${item} style`}
                selected={style === item}
                disabled={busy}
                onPress={() => {
                  clearPreview();
                  setStyle(item);
                }}
              />
            ))}
          </View>
        ) : null}
        <Button label="Preview practical preference" disabled={busy} onPress={previewFact} />
      </Card>
      {preview ? (
        <Card tone="lavender">
          <Text variant="h3">Confirm this local memory change</Text>
          <Text>
            {preview.action === 'fact'
              ? `${memoryKindLabels[preview.value.kind]}: ${memoryValueLabel(preview.value)}. This will be a confirmed preference, not a measured result.`
              : preview.action === 'enabled'
                ? preview.enabled
                  ? 'Use confirmed practical preferences in local explanations only. No online processing is enabled.'
                  : 'Exclude all remembered preferences from local explanations. Stored preferences remain available to inspect or forget.'
                : `Delete ${memoryKindLabels[preview.fact.value.kind]}: ${memoryValueLabel(preview.fact.value)} from local memory. Canonical records and previously exported files will not be deleted.`}
          </Text>
          <Button
            label="Confirm local memory change"
            disabled={busy}
            onPress={() => void confirm(preview)}
          />
          <Button label="Cancel memory preview" variant="ghost" onPress={clearPreview} />
        </Card>
      ) : null}
    </Screen>
  );
}
