import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Card, ErrorState, LoadingSkeleton, Screen, Text } from '../src/components/ui';
import { getOwnedCycleReflection } from '../src/db/cycleHistoryRepository';
import { useLocalDatabase } from '../src/db/context';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function SavedCycleReflectionScreen() {
  const params = useLocalSearchParams<{ cycleId?: string | string[] }>();
  const cycleId =
    params.cycleId === undefined || typeof params.cycleId === 'string'
      ? params.cycleId
      : '\u0000invalid-cycle';
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getOwnedCycleReflection>>>(null);
  const [loaded, setLoaded] = useState<{
    database: typeof database;
    userId: string;
    cycleId: typeof cycleId;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setLoaded(null);
    setError(null);
    if (!database) {
      setError('Local storage is unavailable.');
      setLoaded({ database, userId, cycleId });
      return;
    }
    void getOwnedCycleReflection(database, userId, cycleId)
      .then((value) => {
        if (active) {
          setDetail(value);
          if (!value) setError('This saved cycle is unavailable for this person.');
        }
      })
      .catch(() => {
        if (active) setError('This saved reflection link is unavailable.');
      })
      .finally(() => {
        if (active) setLoaded({ database, userId, cycleId });
      });
    return () => {
      active = false;
    };
  }, [database, userId, cycleId]);
  const matches =
    loaded?.database === database && loaded?.userId === userId && loaded?.cycleId === cycleId;
  return (
    <Screen>
      <Button
        label="Back to saved cycles"
        variant="ghost"
        onPress={() => router.replace('/cycles')}
      />
      <Text variant="h1" accessibilityRole="header">
        Saved reflection
      </Text>
      {!matches ? (
        <LoadingSkeleton height={150} />
      ) : error ? (
        <ErrorState message={error} />
      ) : detail ? (
        <Card>
          <Text variant="body">
            Cycle started {detail.cycle.startedAt.slice(0, 10)} · {detail.cycle.status}
          </Text>
          {detail.review ? (
            <>
              <Text variant="small">Saved {detail.review.updatedAt.slice(0, 10)}</Text>
              {detail.review.overallRating ? (
                <Text variant="body">Rating: {detail.review.overallRating} of 5</Text>
              ) : null}
              {detail.review.focus ? (
                <Text variant="body">Focus: {detail.review.focus.replaceAll('-', ' ')}</Text>
              ) : null}
              {detail.review.nextAction ? (
                <Text variant="body">
                  Chosen next action: {detail.review.nextAction.replaceAll('-', ' ')}
                </Text>
              ) : null}
              {detail.review.note ? <Text variant="body">{detail.review.note}</Text> : null}
            </>
          ) : (
            <Text variant="body">No reflection saved for this cycle.</Text>
          )}
          <Text variant="small" tone="muted">
            This history view does not start or switch a cycle.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
