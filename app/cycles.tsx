import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorState, LoadingSkeleton, Screen, Text } from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import {
  getSavedCyclePage,
  type SavedCycleEntry,
  type CycleHistoryCursor,
} from '../src/db/cycleHistoryRepository';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function SavedCyclesScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [entries, setEntries] = useState<SavedCycleEntry[]>([]);
  const [cursor, setCursor] = useState<CycleHistoryCursor | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [loadedFor, setLoadedFor] = useState<{ database: typeof database; userId: string } | null>(
    null,
  );
  const context = useRef({ database, userId });
  context.current = { database, userId };
  const generation = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const current = ++generation.current;
      setEntries([]);
      setCursor(null);
      setError(null);
      setBusy(true);
      setLoadedFor(null);
      if (!database) {
        setBusy(false);
        setError('Local cycle storage is unavailable.');
        return;
      }
      void getSavedCyclePage(database, userId)
        .then((page) => {
          if (generation.current === current) {
            setEntries(page.entries);
            setCursor(page.nextCursor);
            setLoadedFor({ database, userId });
          }
        })
        .catch(() => {
          if (generation.current === current) setError('Saved cycles could not be loaded.');
        })
        .finally(() => {
          if (generation.current === current) setBusy(false);
        });
      return () => {
        if (generation.current === current) generation.current++;
      };
    }, [database, userId, reload]),
  );
  const more = async () => {
    if (
      !database ||
      !cursor ||
      busy ||
      loadedFor?.database !== database ||
      loadedFor.userId !== userId ||
      context.current.userId !== userId
    )
      return;
    const current = generation.current;
    setBusy(true);
    setError(null);
    try {
      const page = await getSavedCyclePage(database, userId, cursor);
      if (current === generation.current) {
        setEntries((previous) => {
          const seen = new Set(previous.map((entry) => entry.cycle.id));
          return [...previous, ...page.entries.filter((entry) => !seen.has(entry.cycle.id))];
        });
        setCursor(page.nextCursor);
      }
    } catch {
      if (current === generation.current)
        setError('The next page could not be loaded. Retry to continue.');
    } finally {
      if (current === generation.current) setBusy(false);
    }
  };
  const open = (id: string, reflection = false) => {
    if (
      context.current.database !== database ||
      context.current.userId !== userId ||
      loadedFor?.database !== database ||
      loadedFor.userId !== userId
    )
      return;
    router.push({ pathname: reflection ? '/cycle-reflection' : '/cycle', params: { cycleId: id } });
  };
  const visibleEntries =
    loadedFor?.database === database && loadedFor?.userId === userId ? entries : [];
  return (
    <Screen>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
      <Text variant="h1" accessibilityRole="header">
        Saved cycles
      </Text>
      <Text variant="body" tone="muted">
        Inspect your local cycles and saved reflections. Opening a cycle does not activate it.
      </Text>
      {error ? <ErrorState message={error} /> : null}
      {!busy && !visibleEntries.length && !error ? (
        <Text variant="body">No saved cycles on this device.</Text>
      ) : null}
      {visibleEntries.map((entry) => (
        <Card key={entry.cycle.id} style={{ marginTop: 16 }}>
          <Text variant="h3">{entry.programTitle ?? 'Saved private plan'}</Text>
          <Text variant="small">
            Started {entry.cycle.startedAt.slice(0, 10)} · {entry.cycle.status} · Week{' '}
            {entry.cycle.currentWeek} of 6
          </Text>
          <Button
            label="Inspect cycle"
            onPress={() => open(entry.cycle.id)}
            accessibilityLabel={`Inspect cycle started ${entry.cycle.startedAt.slice(0, 10)}, ${entry.cycle.status}`}
          />
          {entry.reviewUpdatedAt ? (
            <View>
              <Text variant="small">Reflection saved {entry.reviewUpdatedAt.slice(0, 10)}</Text>
              <Button
                label="Read saved reflection"
                variant="secondary"
                onPress={() => open(entry.cycle.id, true)}
              />
            </View>
          ) : null}
        </Card>
      ))}
      {busy ? <LoadingSkeleton height={80} /> : null}
      {cursor ? (
        <Button label="Load more cycles" disabled={busy} onPress={() => void more()} />
      ) : null}
      <Button
        label="Refresh saved cycles"
        variant="ghost"
        disabled={busy}
        onPress={() => setReload((value) => value + 1)}
      />
    </Screen>
  );
}
