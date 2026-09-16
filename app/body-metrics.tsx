import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, EmptyState, IconButton, Screen, Text } from '../src/components/ui';
import {
  bodyMetricUnitLabel,
  bodyMetricValueForUnitSystem,
  type BodyMetric,
} from '../src/domain/bodyMetrics';
import { demoUser } from '../src/domain/fixtures/home';
import type { UnitSystem } from '../src/domain/types';
import {
  deleteBodyMetric,
  getBodyMetrics,
  saveManualWeight,
} from '../src/db/bodyMetricRepository';
import { useLocalDatabase } from '../src/db/context';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { colors, radii, spacing } from '../src/design/tokens';
import { useCurrentUserId } from '../src/services/UserIdentityProvider';

export default function BodyMetricsScreen() {
  const database = useLocalDatabase();
  const userId = useCurrentUserId();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(demoUser.unitSystem);
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(database !== null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void Promise.all([
      getOnboardingProfile(database, userId),
      getBodyMetrics(database, userId),
    ])
      .then(([profile, stored]) => {
        if (!active) return;
        setUnitSystem(profile?.user.unitSystem ?? demoUser.unitSystem);
        setMetrics(stored);
      })
      .catch(() => {
        if (active) setMessage('We could not load manual body metrics from this device.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [database, userId]);

  const unitLabel = bodyMetricUnitLabel(unitSystem);
  const parsedValue = useMemo(() => Number(input.replace(',', '.')), [input]);
  const canSave = Number.isFinite(parsedValue) && parsedValue > 0;

  const save = async () => {
    if (!database) {
      setMessage('Web preview: manual body metrics are stored on native builds.');
      return;
    }
    if (!canSave) return;

    setSaving(true);
    setMessage(null);
    try {
      const metric = await saveManualWeight(
        database,
        userId,
        parsedValue,
        unitSystem,
        new Date().toISOString(),
      );
      setMetrics((current) => [metric, ...current.filter((item) => item.id !== metric.id)]);
      setInput('');
      setMessage('Weight was saved locally. It is not sent to analytics or cloud sync.');
    } catch {
      setMessage('We could not save that weight entry.');
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (metric: BodyMetric) => {
    if (!database) return;
    if (Platform.OS === 'web') {
      void performDelete(metric);
      return;
    }

    Alert.alert('Delete weight entry?', 'This permanently removes this local manual entry.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void performDelete(metric),
      },
    ]);
  };

  const performDelete = async (metric: BodyMetric) => {
    if (!database) return;
    try {
      const deleted = await deleteBodyMetric(database, userId, metric.id);
      if (deleted) setMetrics((current) => current.filter((item) => item.id !== metric.id));
      setMessage(deleted ? 'Weight entry removed.' : 'That entry was already unavailable.');
    } catch {
      setMessage('We could not remove that weight entry.');
    }
  };

  return (
    <Screen scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={styles.header}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.ink} />}
          label="Back to Profile"
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="muted">
          BODY METRICS
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Track only what helps.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Manual weight tracking is optional. Entries stay local, are included in your local data
        export, and are not sent to analytics or automatic Coach context.
      </Text>

      <Card tone="lavender" style={styles.entryCard}>
        <Text variant="caption" tone="muted">
          MANUAL WEIGHT
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityHint="Enter an optional manual weight measurement."
            accessibilityLabel={`Weight in ${unitLabel}`}
            keyboardType="decimal-pad"
            onChangeText={setInput}
            placeholder={`Enter ${unitLabel}`}
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            value={input}
          />
          <Text variant="h3">{unitLabel}</Text>
        </View>
        <Button
          label="Save weight"
          disabled={!canSave || loading}
          loading={saving}
          onPress={() => void save()}
          style={styles.saveButton}
        />
      </Card>

      {message ? (
        <Card tone="white" style={styles.messageCard} accessibilityLabel={message}>
          <Text variant="small" tone="muted">
            {message}
          </Text>
        </Card>
      ) : null}

      <Text variant="h2" style={styles.sectionTitle}>
        Manual history
      </Text>
      {loading ? (
        <Text variant="small" tone="muted">
          Loading local entries…
        </Text>
      ) : metrics.length === 0 ? (
        <EmptyState
          title="No manual weight entries"
          message="Add a weight only if it is useful to your own progress review."
        />
      ) : (
        metrics.slice(0, 20).map((metric) => (
          <Card key={metric.id} tone="white" style={styles.metricCard}>
            <View style={styles.metricRow}>
              <View>
                <Text variant="h3">
                  {trimNumber(bodyMetricValueForUnitSystem(metric, unitSystem))} {unitLabel}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatDate(metric.measuredAt)}
                </Text>
              </View>
              <Button
                label="Delete"
                variant="ghost"
                accessibilityHint={`Deletes the manual weight entry from ${formatDate(metric.measuredAt)}.`}
                onPress={() => requestDelete(metric)}
                style={styles.deleteButton}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function formatDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown date';
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
  entryCard: {
    marginTop: spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 18,
  },
  saveButton: {
    marginTop: spacing.md,
  },
  messageCard: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  metricCard: {
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  deleteButton: {
    alignSelf: 'center',
  },
});
