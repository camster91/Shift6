import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  Text,
} from '../src/components/ui';
import { demoWorkoutHistory } from '../src/domain/fixtures/history';
import type { WorkoutHistoryEntry } from '../src/domain/history';
import { useLocalDatabase } from '../src/db/context';
import { getWorkoutHistory } from '../src/db/historyRepository';
import { colors, spacing } from '../src/design/tokens';

type HistoryFilter = 'all' | 'complete' | 'partial' | 'skipped';

const historyFilters: readonly { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'complete', label: 'Complete' },
  { value: 'partial', label: 'Partial' },
  { value: 'skipped', label: 'Skipped' },
];

export default function HistoryScreen() {
  const database = useLocalDatabase();
  const [entries, setEntries] = useState<WorkoutHistoryEntry[]>(database ? [] : demoWorkoutHistory);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [loading, setLoading] = useState(database !== null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void getWorkoutHistory(database, 'guest-user')
      .then((history) => {
        if (active) setEntries(history);
      })
      .catch(() => {
        if (active) setError('We could not load your local workout history.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database, reloadKey]);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => filter === 'all' || entry.status === filter),
    [entries, filter],
  );

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton width="34%" height={14} />
        <LoadingSkeleton width="76%" height={44} style={styles.loadingTitle} />
        <LoadingSkeleton height={96} style={styles.loadingCard} />
        <LoadingSkeleton height={180} style={styles.loadingCard} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Home"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          WORKOUT HISTORY
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Keep the record.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Every session stays attached to the cycle and version you trained from. Partial and skipped
        sessions remain visible without being counted as completed work.
      </Text>

      {error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((current) => current + 1)} />
      ) : null}

      <View style={styles.filterRow} accessibilityLabel="Workout history filters">
        {historyFilters.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={filter === option.value}
            onPress={() => setFilter(option.value)}
          />
        ))}
      </View>

      <Text variant="caption" tone="muted" style={styles.resultCount}>
        {visibleEntries.length} session{visibleEntries.length === 1 ? '' : 's'} shown
      </Text>

      {visibleEntries.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'Your history starts with a workout' : `No ${filter} sessions`}
          message={
            filter === 'all'
              ? 'Complete or intentionally stop a session and SHIFT6 will keep the result here locally.'
              : 'Try another filter or keep training to add a session to this view.'
          }
          icon={<Ionicons name="book-outline" size={32} color={colors.ink} />}
          actionLabel={filter === 'all' ? 'Browse programs' : undefined}
          onAction={filter === 'all' ? () => router.replace('/programs') : undefined}
        />
      ) : (
        <View style={styles.historyList}>
          {visibleEntries.map((entry) => (
            <HistoryCard key={entry.id} entry={entry} />
          ))}
        </View>
      )}

      <Button
        label="Open calendar"
        variant="ghost"
        icon={<Ionicons name="calendar-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/calendar')}
        style={styles.calendarButton}
      />
    </Screen>
  );
}

function HistoryCard({ entry }: { entry: WorkoutHistoryEntry }) {
  const statusLabel = formatStatus(entry.status);
  const focusLabel = entry.focus.replace('-', ' ');
  const metricParts = [`${entry.completedSetCount} set${entry.completedSetCount === 1 ? '' : 's'}`];
  if (entry.totalVolume > 0) {
    metricParts.push(`${Math.round(entry.totalVolume).toLocaleString()} volume`);
  }
  if (entry.totalDurationSeconds > 0) {
    metricParts.push(`${Math.round(entry.totalDurationSeconds / 60)} cardio min`);
  }
  if (entry.totalDistanceMeters > 0) {
    metricParts.push(`${Math.round(entry.totalDistanceMeters).toLocaleString()} m`);
  }
  if (entry.durationMinutes !== undefined) {
    metricParts.push(`${Math.round(entry.durationMinutes)} min session`);
  }

  return (
    <Card
      tone={entry.status === 'complete' ? 'white' : 'yellow'}
      accessibilityLabel={`${entry.title}, ${statusLabel}, week ${entry.cycleWeek}. ${metricParts.join(', ')}.`}
    >
      <View style={styles.historyHeader}>
        <View style={styles.historyCopy}>
          <Text variant="caption" tone="muted">
            {formatDate(entry.completedAt ?? entry.startedAt)} · WEEK {entry.cycleWeek}
          </Text>
          <Text variant="h3" style={styles.historyTitle}>
            {entry.title}
          </Text>
        </View>
        <Chip label={statusLabel} selected={entry.status === 'complete'} />
      </View>
      <Text variant="small" tone="muted" style={styles.historyMeta}>
        {capitalize(focusLabel)}
        {entry.isOffline ? ' · completed offline' : ''}
      </Text>
      <Text variant="smallMedium" style={styles.historyMetrics}>
        {metricParts.join(' · ')}
      </Text>
      {entry.completionReason ? (
        <Text variant="caption" tone="muted" style={styles.reason}>
          Reason: {formatReason(entry.completionReason)}
        </Text>
      ) : null}
    </Card>
  );
}

function formatStatus(status: WorkoutHistoryEntry['status']): string {
  return status === 'in-progress' ? 'In progress' : capitalize(status);
}

function formatReason(reason: string): string {
  return reason.replaceAll('-', ' ');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    marginTop: spacing.xxxl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  resultCount: {
    marginTop: spacing.lg,
  },
  historyList: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  historyCopy: {
    flex: 1,
  },
  historyTitle: {
    marginTop: spacing.xs,
  },
  historyMeta: {
    marginTop: spacing.sm,
  },
  historyMetrics: {
    marginTop: spacing.md,
  },
  reason: {
    marginTop: spacing.sm,
  },
  calendarButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  loadingTitle: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
});
