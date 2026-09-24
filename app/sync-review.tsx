import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  IconButton,
  LoadingSkeleton,
  Screen,
  Text,
} from '../src/components/ui';
import { useLocalDatabase } from '../src/db/context';
import { getPendingSyncIssues, type SyncIssue } from '../src/db/syncRepository';
import { colors, spacing } from '../src/design/tokens';
import { useSyncRuntime } from '../src/services/SyncRuntimeProvider';

export default function SyncReviewScreen() {
  const database = useLocalDatabase();
  const { flushNow } = useSyncRuntime();
  const [issues, setIssues] = useState<SyncIssue[]>([]);
  const [loading, setLoading] = useState(database !== null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIssues = useCallback(async () => {
    if (!database) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setIssues(await getPendingSyncIssues(database));
    } catch {
      setError('We could not read local sync issues.');
    } finally {
      setLoading(false);
    }
  }, [database]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const retrySync = async () => {
    setRetrying(true);
    setError(null);
    try {
      await flushNow();
      await loadIssues();
    } catch {
      setError('Sync could not be retried right now. Your local data remains on this device.');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingSkeleton width="36%" height={14} />
        <LoadingSkeleton height={48} style={styles.loadingTitle} />
        <LoadingSkeleton height={150} style={styles.loadingCard} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Profile"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          SYNC REVIEW
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Keep your record clear.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        SHIFT6 never merges or discards a future plan automatically. Local workout data stays safe
        while a server-side conflict is waiting for review.
      </Text>

      {!database ? (
        <Card
          tone="yellow"
          style={styles.infoCard}
          accessibilityLabel="Sync review unavailable in web preview"
        >
          <Text variant="smallMedium">Web preview</Text>
          <Text variant="small" tone="muted" style={styles.cardCopy}>
            Native SQLite is not active here, so local sync issues cannot be inspected in this
            browser preview.
          </Text>
        </Card>
      ) : issues.length === 0 ? (
        <Card tone="mint" style={styles.infoCard} accessibilityLabel="No pending sync issues">
          <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
          <Text variant="h3" style={styles.cardTitle}>
            No pending issues
          </Text>
          <Text variant="small" tone="muted" style={styles.cardCopy}>
            The local outbox has no errors requiring review.
          </Text>
        </Card>
      ) : (
        issues.map((issue) => <SyncIssueCard key={issue.id} issue={issue} />)
      )}

      {issues.length > 0 ? (
        <Button
          label="Retry sync"
          variant="secondary"
          loading={retrying}
          disabled={retrying}
          onPress={() => void retrySync()}
          icon={<Ionicons name="sync-outline" size={18} color={colors.ink} />}
          style={styles.retryButton}
          accessibilityHint="Retries queued changes without changing local workout history"
        />
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => void loadIssues()} /> : null}
    </Screen>
  );
}

function SyncIssueCard({ issue }: { issue: SyncIssue }) {
  const title = issue.kind === 'conflict' ? 'Plan change needs review' : 'Sync will retry';
  const message =
    issue.kind === 'conflict'
      ? 'This change is still stored locally. A future resolution flow will let you compare it with the server record before choosing what to keep.'
      : 'This mutation remains queued and will be retried when the sync service is available.';

  return (
    <Card
      tone={issue.kind === 'conflict' ? 'yellow' : 'white'}
      style={styles.issueCard}
      accessibilityLabel={`${title}. ${message}`}
    >
      <View style={styles.issueHeader}>
        <Ionicons
          name={issue.kind === 'conflict' ? 'warning-outline' : 'cloud-upload-outline'}
          size={24}
          color={issue.kind === 'conflict' ? colors.warning : colors.ink}
        />
        <View style={styles.issueCopy}>
          <Text variant="h3">{title}</Text>
          <Text variant="caption" tone="muted">
            {formatEntityType(issue.entityType)} · {issue.attemptCount} attempt
            {issue.attemptCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <Text variant="small" tone="muted" style={styles.cardCopy}>
        {message}
      </Text>
    </Card>
  );
}

function formatEntityType(entityType: SyncIssue['entityType']): string {
  return entityType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  loadingTitle: {
    marginTop: spacing.md,
  },
  loadingCard: {
    marginTop: spacing.xl,
  },
  infoCard: {
    marginTop: spacing.xl,
  },
  issueCard: {
    marginTop: spacing.md,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  issueCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    marginTop: spacing.sm,
  },
  cardCopy: {
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.xl,
  },
  syncStatus: {
    marginTop: spacing.xl,
  },
  syncReviewButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
