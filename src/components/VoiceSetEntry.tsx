import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, TextInput, View } from 'react-native';
import { Button, Card, Text } from './ui';
import { parseVoiceSet, voiceBindingKey, type VoiceSetBinding } from '../domain/voiceSetDraft';
import type { WorkoutDraftSetValues } from '../domain/types';
import { createPlatformLocalVoiceAdapter, type LocalVoiceAdapter } from '../services/localVoice';

/** Supplies reviewed fields to the current unsaved set; the existing Save set transaction is separate. */
export function VoiceSetEntry({
  binding,
  onApply,
  adapter: suppliedAdapter,
  disabled = false,
}: {
  binding: VoiceSetBinding;
  onApply: (values: Partial<WorkoutDraftSetValues>, expectedBindingKey: string) => boolean;
  adapter?: LocalVoiceAdapter;
  disabled?: boolean;
}) {
  const adapter = useMemo(
    () => suppliedAdapter ?? createPlatformLocalVoiceAdapter(),
    [suppliedAdapter],
  );
  const key = voiceBindingKey(binding);
  const currentKey = useRef(key);
  currentKey.current = key;
  const currentDisabled = useRef(disabled);
  currentDisabled.current = disabled;
  const revision = useRef(0);
  const capturing = useRef(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ text: string; token: number; key: string } | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    revision.current++;
    capturing.current = false;
    adapter.cancel();
    setListening(false);
    setText('');
    setPreview(null);
    setMessage('');
    return () => {
      revision.current++;
      adapter.cancel();
    };
  }, [adapter, key, disabled]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;
      revision.current++;
      capturing.current = false;
      adapter.cancel();
      setListening(false);
      setText('');
      setPreview(null);
      setMessage('');
    });
    return () => subscription.remove();
  }, [adapter]);
  const draft = preview ? parseVoiceSet(preview.text, binding) : null;
  const examples = {
    reps: 'eight reps',
    load: binding.loadUnit === 'lb' ? 'forty pounds' : 'forty kilograms',
    duration: 'thirty seconds',
    distance: 'five hundred meters',
    rpe: 'RPE seven',
    rir: 'two reps left',
  };
  const exampleFields = [
    ...new Set([
      ...binding.required.filter((field) => binding.allowed.includes(field)),
      ...binding.allowed.filter((field) =>
        ['reps', 'load', 'duration', 'distance'].includes(field),
      ),
    ]),
  ];
  const example = exampleFields.map((field) => examples[field]).join(', ');
  return (
    <Card>
      <Text variant="h3">Voice set entry</Text>
      <Text>
        On-device English transcription. Audio and unconfirmed text are not saved. Review the
        values, then use the usual Complete or Save correction control.
      </Text>
      <Text>
        Report actual results{example ? `, for example “${example}”` : ' with explicit values'}.
        {binding.allowed.includes('duration') ? ' Report hold time in seconds.' : ''}
        {binding.allowed.includes('distance')
          ? ' Report distance in meters, kilometers or miles.'
          : ''}
      </Text>
      {binding.allowed.includes('load') ? (
        <Text>
          Load for this set is{' '}
          {binding.loadUnit === 'unknown'
            ? 'unknown: report kilograms or pounds explicitly'
            : binding.loadUnit}
          .
        </Text>
      ) : null}
      <Button
        label={listening ? 'Listening on device…' : 'Speak a set entry'}
        disabled={listening || disabled}
        onPress={async () => {
          if (capturing.current || currentDisabled.current) return;
          capturing.current = true;
          const token = ++revision.current;
          const capturedKey = key;
          setListening(true);
          setText('');
          setPreview(null);
          setMessage('');
          try {
            const final = await adapter.listen('en-US', (partial) => {
              if (
                !currentDisabled.current &&
                revision.current === token &&
                currentKey.current === capturedKey
              )
                setText(partial);
            });
            if (
              currentDisabled.current ||
              revision.current !== token ||
              currentKey.current !== capturedKey
            )
              return;
            setText(final);
            setPreview({ text: final, token, key: capturedKey });
          } catch (error) {
            if (
              !currentDisabled.current &&
              revision.current === token &&
              currentKey.current === capturedKey
            )
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Offline voice unavailable. Use manual entry.',
              );
          } finally {
            if (revision.current === token && currentKey.current === capturedKey) {
              capturing.current = false;
              setListening(false);
            }
          }
        }}
      />
      {listening || text || message ? (
        <View>
          <Button
            label="Dismiss voice entry"
            variant="ghost"
            onPress={() => {
              revision.current++;
              capturing.current = false;
              adapter.cancel();
              setListening(false);
              setText('');
              setPreview(null);
              setMessage('');
            }}
          />
          <TextInput
            accessibilityLabel="Review or correct the spoken set entry"
            value={text}
            editable={!listening && !disabled}
            maxLength={500}
            multiline
            onChangeText={(value) => {
              revision.current++;
              setText(value);
              setPreview(null);
              setMessage('');
            }}
          />
          <Button
            label="Review corrected values"
            disabled={listening || disabled || !text.trim()}
            variant="secondary"
            onPress={() => {
              if (currentDisabled.current) return;
              setPreview({ text, token: ++revision.current, key });
            }}
          />
        </View>
      ) : null}
      {draft ? (
        <View>
          <Text>Confirm actual results for set {binding.setNumber}:</Text>
          {Object.entries(draft.values)
            .filter(([field]) => field !== 'loadUnit')
            .map(([field, value]) => (
              <Text key={field}>
                {field}: {value}
                {field === 'load'
                  ? ` ${draft.values.loadUnit}`
                  : field === 'duration'
                    ? ' seconds'
                    : field === 'distance'
                      ? ' meters'
                      : ''}
              </Text>
            ))}
          {draft.unresolved.map((item, index) => (
            <Text key={index} accessibilityRole="alert">
              {item}
            </Text>
          ))}
          <Button
            label="Use reviewed values in unsaved set"
            disabled={disabled || draft.unresolved.length > 0}
            onPress={() => {
              if (
                !preview ||
                currentDisabled.current ||
                preview.token !== revision.current ||
                preview.key !== currentKey.current ||
                draft.unresolved.length
              )
                return;
              revision.current++;
              setPreview(null);
              setText('');
              try {
                const accepted = onApply(draft.values, preview.key);
                setMessage(
                  accepted
                    ? 'Values entered. Review the set and choose Complete or Save correction when ready.'
                    : 'The active set changed. Review a new entry for the current set.',
                );
              } catch {
                setMessage('The reviewed values could not be entered. Use manual entry.');
              }
            }}
          />
        </View>
      ) : null}
      {message ? <Text accessibilityRole="alert">{message}</Text> : null}
    </Card>
  );
}
