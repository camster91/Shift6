import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, IconButton, Screen, Text } from '../src/components/ui';
import { healthDataTypeDetails, type HealthTrendPoint } from '../src/domain/health';
import { demoUser } from '../src/domain/fixtures/home';
import type { HealthConnectionPreference } from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { getDailyHealthTrends } from '../src/db/healthRepository';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { colors, spacing } from '../src/design/tokens';
import { healthTypesForPreference } from '../src/services/health';
import { useAppServices } from '../src/services/AppServicesProvider';
import { trackAnalyticsEvent } from '../src/services/analytics';
import { syncHealthSummaries, type HealthSyncStatus } from '../src/services/healthSync';

type HealthSyncUiState = 'idle' | 'syncing' | HealthSyncStatus;

export default function HealthSettingsScreen() {
  const database = useLocalDatabase();
  const { analytics, health } = useAppServices();
  const [preference, setPreference] = useState<HealthConnectionPreference>('not-now');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [healthTrends, setHealthTrends] = useState<HealthTrendPoint[]>([]);
  const [healthTrendsLoading, setHealthTrendsLoading] = useState(database !== null);
  const [healthTrendsError, setHealthTrendsError] = useState(false);
  const [healthSyncState, setHealthSyncState] = useState<HealthSyncUiState>('idle');
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    let active = true;
    void health.isAvailable().then((value) => {
      if (active) setAvailable(value);
    });

    if (!database) {
      return () => {
        active = false;
      };
    }

    void getOnboardingProfile(database, 'guest-user')
      .then((profile) => {
        if (active && profile) setPreference(profile.healthConnection);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [database, health]);

  const requestedTypes = useMemo(() => healthTypesForPreference(preference), [preference]);
  const statusLabel =
    preference === 'not-now'
      ? 'Not connected'
      : available === null
        ? 'Checking availability'
        : available
          ? 'Available on this device'
          : 'Connector not installed';

  useEffect(() => {
    if (!database || requestedTypes.length === 0) {
      setHealthTrends([]);
      setHealthTrendsLoading(false);
      setHealthTrendsError(false);
      return;
    }

    let active = true;
    setHealthTrendsLoading(true);
    setHealthTrendsError(false);
    void getDailyHealthTrends(database, 'guest-user', { types: requestedTypes })
      .then((trends) => {
        if (!active) return;
        setHealthTrends(trends.slice(-7));
      })
      .catch(() => {
        if (active) setHealthTrendsError(true);
      })
      .finally(() => {
        if (active) setHealthTrendsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database, requestedTypes]);

  async function handleHealthSync() {
    if (!database || requestedTypes.length === 0 || available !== true) return;

    setHealthSyncState('syncing');
    setImportedCount(0);
    const endAt = new Date();
    const startAt = new Date(endAt.getTime() - 30 * 24 * 60 * 60 * 1000);
    const result = await syncHealthSummaries({
      database,
      userId: 'guest-user',
      provider: health,
      types: requestedTypes,
      range: { startAt: startAt.toISOString(), endAt: endAt.toISOString() },
    });

    setHealthSyncState(result.status);
    setImportedCount(result.importedCount);
    if (result.status !== 'synced') return;

    trackAnalyticsEvent(analytics, 'health_connected', {
      provider: preference,
      grantedTypeCount: result.grantedTypes.length,
    });

    setHealthTrendsLoading(true);
    setHealthTrendsError(false);
    try {
      const trends = await getDailyHealthTrends(database, 'guest-user', {
        types: requestedTypes,
      });
      setHealthTrends(trends.slice(-7));
    } catch {
      setHealthTrendsError(true);
    } finally {
      setHealthTrendsLoading(false);
    }
  }

  const syncFeedback = healthSyncFeedback(healthSyncState, importedCount);

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Profile"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          HEALTH CONNECTIONS
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Health, on your terms.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Health data is optional. SHIFT6 workout logging and progression work without it.
      </Text>

      <Card
        tone="blue"
        style={styles.statusCard}
        accessibilityLabel={`Health status: ${statusLabel}`}
      >
        <View style={styles.statusHeader}>
          <Ionicons name="heart-outline" size={24} color={colors.ink} />
          <Chip label={statusLabel} selected={preference === 'not-now'} />
        </View>
        <Text variant="h3" style={styles.cardTitle}>
          {preference === 'not-now' ? 'No data requested' : 'Permission is still your choice'}
        </Text>
        <Text variant="small" tone="muted" style={styles.cardCopy}>
          {preference === 'not-now'
            ? 'You can keep the full training experience without connecting a health provider.'
            : 'SHIFT6 will explain the selected summaries and ask for read-only access only when you choose to connect.'}
        </Text>
      </Card>

      {requestedTypes.length > 0 ? (
        <>
          <Text variant="h2" style={styles.sectionTitle}>
            Potential data types
          </Text>
          <Text variant="small" tone="muted" style={styles.sectionCopy}>
            These are the summaries associated with your preference. You decide whether to connect
            and import them; workout logging never depends on this access.
          </Text>
          {requestedTypes.map((type) => {
            const detail = healthDataTypeDetails[type];
            return (
              <Card key={type} tone="white" style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <Text variant="h3" style={styles.typeLabel}>
                    {detail.label}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {detail.unit}
                  </Text>
                </View>
                <Text variant="small" tone="muted" style={styles.typeReason}>
                  {detail.reason}
                </Text>
              </Card>
            );
          })}
        </>
      ) : null}

      {requestedTypes.length > 0 ? (
        <HealthTrendCard
          trends={healthTrends}
          loading={healthTrendsLoading}
          hasDatabase={database !== null}
          hasError={healthTrendsError}
        />
      ) : null}

      {requestedTypes.length > 0 ? (
        <>
          <Button
            label={
              healthSyncState === 'syncing'
                ? 'Importing summaries…'
                : 'Connect and import summaries'
            }
            loading={healthSyncState === 'syncing'}
            disabled={database === null || available !== true}
            icon={<Ionicons name="heart-circle-outline" size={18} color={colors.ink} />}
            onPress={() => void handleHealthSync()}
            style={styles.syncAction}
            accessibilityHint="Ask the selected health platform for read-only summaries and save them on this device."
          />
          {syncFeedback ? (
            <Text
              variant="caption"
              tone={healthSyncState === 'failed' ? 'error' : 'muted'}
              accessibilityLiveRegion="polite"
              style={styles.syncFeedback}
            >
              {syncFeedback}
            </Text>
          ) : null}
        </>
      ) : null}

      <Button
        label="Change health preference"
        variant="secondary"
        icon={<Ionicons name="options-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/onboarding')}
        style={styles.action}
      />
      <Text variant="caption" tone="muted" style={styles.previewNote}>
        {database
          ? 'Native profile preference loaded locally.'
          : `Web preview: ${demoUser.displayName}'s preference is not persisted.`}
      </Text>
    </Screen>
  );
}

function healthSyncFeedback(state: HealthSyncUiState, importedCount: number): string | null {
  switch (state) {
    case 'synced':
      return `${importedCount} health summar${importedCount === 1 ? 'y was' : 'ies were'} saved on this device.`;
    case 'unavailable':
      return 'The native health connector is unavailable on this device.';
    case 'permission-denied':
      return 'No health data was imported. You can change access in the platform health settings.';
    case 'failed':
      return 'Health import did not finish. Your workout data is unaffected.';
    case 'syncing':
      return 'Reading only the summaries you selected…';
    default:
      return null;
  }
}

function HealthTrendCard({
  trends,
  loading,
  hasDatabase,
  hasError,
}: {
  trends: readonly HealthTrendPoint[];
  loading: boolean;
  hasDatabase: boolean;
  hasError: boolean;
}) {
  const visibleTrends = [...trends].reverse();
  const accessibilityLabel = visibleTrends.length
    ? `Recent health summaries. ${visibleTrends.map(formatTrendAccessibility).join('. ')}`
    : 'Recent health summaries. No local health summaries are available.';

  return (
    <Card tone="mint" style={styles.trendCard} accessibilityLabel={accessibilityLabel}>
      <Text variant="caption" tone="muted">
        RECENT SUMMARIES
      </Text>
      <Text variant="h3" style={styles.trendTitle}>
        Context you chose to share.
      </Text>
      {loading ? (
        <Text variant="small" tone="muted" style={styles.trendCopy}>
          Loading local summaries…
        </Text>
      ) : hasError ? (
        <Text variant="small" tone="muted" style={styles.trendCopy}>
          We could not read local summaries right now. Your workout data is unaffected.
        </Text>
      ) : visibleTrends.length > 0 ? (
        <View style={styles.trendList}>
          {visibleTrends.map((trend) => (
            <View key={`${trend.day}-${trend.type}-${trend.unit}`} style={styles.trendRow}>
              <View style={styles.trendRowCopy}>
                <Text variant="smallMedium">{healthDataTypeDetails[trend.type].label}</Text>
                <Text variant="caption" tone="muted">
                  {trend.day} · {trend.sampleCount} sample{trend.sampleCount === 1 ? '' : 's'}
                </Text>
              </View>
              <Text variant="smallMedium">{formatHealthValue(trend)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text variant="small" tone="muted" style={styles.trendCopy}>
          {hasDatabase
            ? 'No health summaries are stored on this device yet. SHIFT6 remains fully usable without them.'
            : 'Web preview: native health summaries are not available in this surface.'}
        </Text>
      )}
    </Card>
  );
}

function formatTrendAccessibility(trend: HealthTrendPoint): string {
  return `${healthDataTypeDetails[trend.type].label} on ${trend.day}: ${formatHealthValue(trend)}`;
}

function formatHealthValue(trend: HealthTrendPoint): string {
  if (trend.type === 'sleep-duration') return formatDuration(trend.value);
  if (trend.type === 'heart-rate' || trend.type === 'resting-heart-rate') {
    return `${Math.round(trend.value)} ${trend.unit}`;
  }
  if (trend.type === 'weight') return `${trimNumber(trend.value)} ${trend.unit}`;
  return `${Math.round(trend.value).toLocaleString()} ${trend.unit}`;
}

function formatDuration(seconds: number): string {
  const roundedMinutes = Math.round(seconds / 60);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
  statusCard: {
    marginTop: spacing.xl,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    marginTop: spacing.lg,
  },
  cardCopy: {
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
  },
  sectionCopy: {
    marginTop: spacing.xs,
  },
  typeCard: {
    marginTop: spacing.sm,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  typeLabel: {
    flex: 1,
  },
  typeReason: {
    marginTop: spacing.xs,
  },
  trendCard: {
    marginTop: spacing.xl,
  },
  trendTitle: {
    marginTop: spacing.sm,
  },
  trendCopy: {
    marginTop: spacing.xs,
  },
  trendList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  trendRowCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  action: {
    marginTop: spacing.xl,
  },
  syncAction: {
    marginTop: spacing.xl,
  },
  syncFeedback: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  previewNote: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
