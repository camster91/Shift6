import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, Text } from './ui';
import { parseVoiceSet, voiceBindingKey, type VoiceSetBinding } from '../domain/voiceSetDraft';
import type { WorkoutDraftSetValues } from '../domain/types';
import { createPlatformLocalVoiceAdapter, type LocalVoiceAdapter } from '../services/localVoice';
import { colors, radii, spacing, touchTargets, typography } from '../design/tokens';

/** Supplies reviewed fields to the current unsaved set; the existing Save set transaction is separate. */
export function VoiceSetEntry({
  binding,
  onApply,
  adapter: suppliedAdapter,
  disabled = false,
  onCorrectionFocus,
  onCorrectionBlur,
  onCorrectionLayout,
}: {
  binding: VoiceSetBinding;
  onApply: (values: Partial<WorkoutDraftSetValues>, expectedBindingKey: string) => boolean;
  adapter?: LocalVoiceAdapter;
  disabled?: boolean;
  onCorrectionFocus?: (input: TextInput, isCurrent: () => boolean) => void;
  onCorrectionBlur?: (input: TextInput) => void;
  onCorrectionLayout?: (input: TextInput) => void;
}) {
  const correctionInput = useRef<TextInput | null>(null);
  const geometryCallbacks = useRef({ onCorrectionFocus, onCorrectionBlur, onCorrectionLayout });
  geometryCallbacks.current = { onCorrectionFocus, onCorrectionBlur, onCorrectionLayout };
  const releaseCorrectionFocus = useCallback(() => {
    const input = correctionInput.current;
    if (input) geometryCallbacks.current.onCorrectionBlur?.(input);
  }, []);
  const adapter = useMemo(
    () => suppliedAdapter ?? createPlatformLocalVoiceAdapter(),
    [suppliedAdapter],
  );
  const key = voiceBindingKey(binding);
  const currentKey = useRef(key);
  currentKey.current = key;
  const currentDisabled = useRef(disabled);
  currentDisabled.current = disabled;
  const currentAdapter = useRef(adapter);
  currentAdapter.current = adapter;
  const revision = useRef(0);
  const capturing = useRef(false);
  const [editor, setEditor] = useState<{ key: string; adapter: LocalVoiceAdapter } | null>(null);
  const currentEditor = useRef(editor);
  const editorMatches = useCallback(
    () =>
      Boolean(
        editor &&
        currentEditor.current === editor &&
        editor.key === currentKey.current &&
        editor.key === key &&
        editor.adapter === adapter &&
        editor.adapter === currentAdapter.current &&
        !currentDisabled.current,
      ),
    [editor, key, adapter],
  );
  const [settledCapture, setSettledCapture] = useState<{
    editor: NonNullable<typeof editor>;
    token: number;
  } | null>(null);
  useEffect(() => {
    const input = correctionInput.current;
    if (
      settledCapture?.editor === editor &&
      settledCapture?.token === revision.current &&
      editorMatches() &&
      !capturing.current &&
      input?.isFocused()
    )
      geometryCallbacks.current.onCorrectionFocus?.(input, editorMatches);
  }, [editor, editorMatches, settledCapture]);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const currentText = useRef(text);
  currentText.current = text;
  const [preview, setPreview] = useState<{ text: string; token: number; key: string } | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    releaseCorrectionFocus();
    revision.current++;
    capturing.current = false;
    currentEditor.current = null;
    setEditor(null);
    adapter.cancel();
    setListening(false);
    currentText.current = '';
    setText('');
    setPreview(null);
    setMessage('');
    return () => {
      releaseCorrectionFocus();
      revision.current++;
      currentEditor.current = null;
      adapter.cancel();
    };
  }, [adapter, key, disabled, releaseCorrectionFocus]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background' || currentAdapter.current !== adapter) return;
      releaseCorrectionFocus();
      revision.current++;
      capturing.current = false;
      currentEditor.current = null;
      setEditor(null);
      adapter.cancel();
      setListening(false);
      currentText.current = '';
      setText('');
      setPreview(null);
      setMessage('');
    });
    return () => subscription.remove();
  }, [adapter, releaseCorrectionFocus]);
  const draft = editorMatches() && preview ? parseVoiceSet(preview.text, binding) : null;
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
          if (
            capturing.current ||
            currentDisabled.current ||
            currentKey.current !== key ||
            currentAdapter.current !== adapter
          )
            return;
          releaseCorrectionFocus();
          capturing.current = true;
          const opened = { key, adapter };
          currentEditor.current = opened;
          setEditor(opened);
          const token = ++revision.current;
          const capturedKey = key;
          const captureMatches = () =>
            !currentDisabled.current &&
            revision.current === token &&
            currentKey.current === capturedKey &&
            currentAdapter.current === adapter &&
            currentEditor.current === opened;
          setListening(true);
          currentText.current = '';
          setText('');
          setPreview(null);
          setMessage('');
          try {
            const final = await adapter.listen('en-US', (partial) => {
              if (captureMatches()) {
                currentText.current = partial;
                setText(partial);
              }
            });
            if (!captureMatches()) return;
            currentText.current = final;
            setText(final);
            setPreview({ text: final, token, key: capturedKey });
          } catch (error) {
            if (captureMatches())
              setMessage(
                error instanceof Error
                  ? error.message
                  : 'Offline voice unavailable. Use manual entry.',
              );
          } finally {
            if (captureMatches()) {
              capturing.current = false;
              setListening(false);
              // Retry can retain native focus without emitting another onFocus.
              // Reattach only after this exact capture's editor has committed.
              setSettledCapture({ editor: opened, token });
            }
          }
        }}
      />
      {editorMatches() ? (
        <View style={styles.editor}>
          <Button
            label="Dismiss voice entry"
            variant="ghost"
            onPress={() => {
              if (!editorMatches()) return;
              releaseCorrectionFocus();
              revision.current++;
              capturing.current = false;
              currentEditor.current = null;
              setEditor(null);
              adapter.cancel();
              setListening(false);
              currentText.current = '';
              setText('');
              setPreview(null);
              setMessage('');
            }}
          />
          <Text variant="bodyMedium">Correct or type actual results</Text>
          <Text tone="muted">Type actual values with units, then review.</Text>
          <TextInput
            ref={correctionInput}
            onFocus={() => {
              const input = correctionInput.current;
              if (input && editorMatches() && !capturing.current)
                geometryCallbacks.current.onCorrectionFocus?.(input, editorMatches);
            }}
            onBlur={() => {
              if (editorMatches()) releaseCorrectionFocus();
            }}
            onLayout={() => {
              const input = correctionInput.current;
              if (input && editorMatches()) geometryCallbacks.current.onCorrectionLayout?.(input);
            }}
            accessibilityLabel="Review or correct the spoken set entry"
            placeholder={example ? `e.g. ${example}` : 'Actual results with units'}
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            value={text}
            editable={!listening && !disabled}
            maxLength={500}
            multiline
            onChangeText={(value) => {
              if (!editorMatches() || capturing.current) return;
              revision.current++;
              currentText.current = value;
              if (correctionInput.current)
                geometryCallbacks.current.onCorrectionLayout?.(correctionInput.current);
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
              if (
                !editorMatches() ||
                capturing.current ||
                currentText.current !== text ||
                !text.trim()
              )
                return;
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
                !editorMatches() ||
                currentDisabled.current ||
                preview.token !== revision.current ||
                preview.key !== currentKey.current ||
                draft.unresolved.length
              )
                return;
              revision.current++;
              setPreview(null);
              currentText.current = '';
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

const styles = StyleSheet.create({
  editor: { gap: spacing.sm },
  input: {
    ...typography.body,
    minHeight: touchTargets.standard + spacing.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.canvas,
    color: colors.ink,
    textAlignVertical: 'top',
  },
});
