import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Screen, Text } from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { assertEmptyRestoreTarget, restoreLocalBackup } from '../src/db/localRestoreRepository';
import { pickLocalBackup, type PickedBackup } from '../src/services/localDataRestore';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';
import { runtimeConfig } from '../src/config/env';

export default function RestoreScreen() {
  const db = useLocalDatabase(),
    owner = useCurrentUserId();
  const [backup, setBackup] = useState<PickedBackup | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  async function choose() {
    setBackup(null);
    setMessage(null);
    setBusy(true);
    try {
      if (!db || runtimeConfig.releaseMode !== 'guest-only')
        throw new Error('Local guest storage is not ready.');
      await assertEmptyRestoreTarget(db);
      const picked = await pickLocalBackup();
      if (picked) setBackup(picked);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The backup could not be opened.');
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!db || !backup || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const count = await restoreLocalBackup(db, owner, backup.serialized);
      setBackup(null);
      setMessage(
        `${count} records restored locally. Health access must be connected again in settings.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Restore failed. No records were changed.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Button
        label="Back"
        variant="ghost"
        disabled={busy}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <Text variant="display" accessibilityRole="header">
        Restore a local export
      </Text>
      <Text variant="body">
        Recover a schema-12 SHIFT6 JSON export into an empty guest installation. Existing records
        are never merged or replaced.
      </Text>
      <Button
        label="Choose backup file"
        disabled={busy}
        loading={busy}
        onPress={() => void choose()}
      />
      {backup ? (
        <Card tone="white">
          <Text variant="h2">Review before restoring</Text>
          <Text variant="body">{backup.name}</Text>
          <Text variant="body">Schema 12 · {backup.preview.recordCount} records</Text>
          <Text variant="small">Exported {backup.preview.exportedAt}</Text>
          {backup.preview.data.summary.sections.map((section) => (
            <Text key={section.key} variant="small">
              {section.title}: {section.recordCount}
            </Text>
          ))}
          {backup.preview.warnings.map((warning) => (
            <Text key={warning} variant="small">
              {warning}
            </Text>
          ))}
          <Button
            label="Confirm local restore"
            disabled={busy}
            onPress={() =>
              Alert.alert(
                'Restore these records?',
                `${backup.preview.recordCount} validated records will be saved on this device. Connections/consent reset and media files are not restored.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Restore', onPress: () => void restore() },
                ],
              )
            }
          />
          <Button
            label="Cancel preview"
            variant="ghost"
            disabled={busy}
            onPress={() => setBackup(null)}
          />
        </Card>
      ) : null}
      {message ? (
        <Text variant="body" accessibilityRole="alert">
          {message}
        </Text>
      ) : null}
      {!backup && message?.includes('records restored locally') ? (
        <Button label="Continue with restored records" onPress={() => router.replace('/')} />
      ) : null}
    </Screen>
  );
}
