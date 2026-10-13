import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { Exercise, SetTarget } from '../domain/types';
import { parsePlanText } from '../domain/planTextImport';
import { colors, radii, spacing } from '../design/tokens';
import { Button, Card, Text } from './ui';

export function PlanTextImport({
  available,
  workoutTitle,
  onApply,
  recoveryState,
  onRecoveryChange,
}: {
  available: readonly Exercise[];
  workoutTitle: string;
  onApply: (text: string) => void;
  recoveryState?: { text: string; previewText: string | null };
  onRecoveryChange?: (state: { text: string; previewText: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewToken, setPreviewToken] = useState(0);
  const revision = useRef(0);
  const recoveryFingerprint = JSON.stringify(recoveryState ?? null);
  const fingerprint = useRef(recoveryFingerprint);
  if (fingerprint.current !== recoveryFingerprint) {
    fingerprint.current = recoveryFingerprint;
    revision.current++;
  }
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!recoveryState) return;
    const token = ++revision.current;
    setText(recoveryState.text);
    setPreviewText(recoveryState.previewText);
    setPreviewToken(token);
    if (recoveryState.text || recoveryState.previewText) setOpen(true);
  }, [recoveryState?.text, recoveryState?.previewText]);
  useEffect(
    () => () => {
      revision.current++;
    },
    [],
  );
  const preview = previewText === null ? null : parsePlanText(previewText, available);
  const ready =
    preview !== null &&
    preview.errors.length === 0 &&
    preview.rows.every((row) => row.errors.length === 0);
  return (
    <View style={styles.root}>
      <Button
        label={open ? 'Close pasted-text import' : 'Import pasted movement targets'}
        accessibilityLabel={`${open ? 'Close' : 'Import'} pasted targets for ${workoutTitle}`}
        variant="ghost"
        onPress={() => {
          revision.current++;
          setOpen(!open);
          setText('');
          setPreviewText(null);
          setMessage('');
          onRecoveryChange?.({ text: '', previewText: null });
        }}
      />
      {open ? (
        <Card tone="lavender">
          <Text variant="h3">Paste your own workout notes</Text>
          <Text>
            Local only. Adds movements to {workoutTitle}; it does not create a training prescription
            or approve public content.
          </Text>
          <Text>Use exact available movement names and this notation, one line per movement:</Text>
          <Text>My movement | sets=3 | reps=8-12 | load=40kg | rest=90s</Text>
          <Text>
            For holds use time=30s; distances require m, km or miles. Load is optional but needs kg
            or lb if present. Supersets and free-form prose stay unresolved.
          </Text>
          <Text>
            Available names:{' '}
            {available.length
              ? available.map((exercise) => exercise.name).join('; ')
              : 'None. Add your private movement first.'}
          </Text>
          <TextInput
            accessibilityLabel={`User-owned workout text for ${workoutTitle}`}
            value={text}
            onChangeText={(value) => {
              revision.current++;
              setText(value);
              setPreviewText(null);
              setMessage('');
              onRecoveryChange?.({ text: value, previewText: null });
            }}
            maxLength={10000}
            multiline
            style={styles.input}
          />
          <Text variant="small">
            {onRecoveryChange
              ? 'Private recovery includes this text. Check the recovery status above before leaving. Recovered previews are recomputed and require explicit review.'
              : 'Unsubmitted text is not saved and will be lost if this screen closes.'}{' '}
            After adding reviewed rows, choose Save draft program to keep them in your plan.
            Original lines become private movement notes.
          </Text>
          <Button
            label="Preview pasted targets"
            variant="secondary"
            onPress={() => {
              setPreviewToken(++revision.current);
              setPreviewText(text);
              onRecoveryChange?.({ text, previewText: text });
            }}
          />
          {preview ? (
            <View>
              {preview.errors.map((error) => (
                <Text key={error} accessibilityRole="alert">
                  {error}
                </Text>
              ))}
              {preview.rows.map((row, index) => (
                <View key={index} style={styles.row}>
                  <Text variant="smallMedium">
                    {index + 1}. Original: {row.original}
                  </Text>
                  <Text>
                    Extracted: {row.name}; sets {row.setCount ?? 'unresolved'};{' '}
                    {targetLabel(row.target)}; rest {row.restSeconds ?? 'unresolved'} seconds.
                  </Text>
                  {row.errors.map((error, errorIndex) => (
                    <Text key={errorIndex} tone="error">
                      Unresolved: {error}
                    </Text>
                  ))}
                </View>
              ))}
              <Button
                label="Add reviewed rows to this workout"
                disabled={!ready}
                onPress={() => {
                  if (!ready || previewText === null || previewToken !== revision.current) return;
                  // Consume synchronously before React updates; duplicate or stale
                  // callbacks cannot append the same preview a second time.
                  revision.current++;
                  try {
                    onApply(previewText!);
                    setText('');
                    setPreviewText(null);
                    onRecoveryChange?.({ text: '', previewText: null });
                    setMessage(
                      'Rows added to your unsaved plan. Choose Save draft program to keep them.',
                    );
                  } catch (error) {
                    setPreviewText(null);
                    onRecoveryChange?.({ text, previewText: null });
                    setMessage(
                      error instanceof Error ? error.message : 'Import could not be applied.',
                    );
                  }
                }}
              />
            </View>
          ) : null}
          {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
        </Card>
      ) : null}
    </View>
  );
}
function targetLabel(target: SetTarget): string {
  const values: string[] = [];
  if (target.reps !== undefined)
    values.push(
      `${typeof target.reps === 'number' ? target.reps : `${target.reps.min}–${target.reps.max}`} reps`,
    );
  if (target.load)
    values.push(`${target.load.value} ${target.load.unit === 'metric' ? 'kg' : 'lb'}`);
  if (target.durationSeconds !== undefined) values.push(`${target.durationSeconds} seconds`);
  if (target.distanceMeters !== undefined) values.push(`${target.distanceMeters} meters`);
  return values.join(', ') || 'target unresolved';
}
const styles = StyleSheet.create({
  root: { marginTop: spacing.sm },
  row: { marginVertical: spacing.sm },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.ink,
    backgroundColor: colors.white,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
