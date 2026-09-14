import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, IconButton, Screen, Text } from '../src/components/ui';
import { healthDataTypeDetails } from '../src/domain/health';
import { demoUser } from '../src/domain/fixtures/home';
import type { HealthConnectionPreference } from '../src/domain/types';
import { useLocalDatabase } from '../src/db/context';
import { getOnboardingProfile } from '../src/db/profileRepository';
import { colors, spacing } from '../src/design/tokens';
import { UnavailableHealthProvider, healthTypesForPreference } from '../src/services/health';

const unavailableProvider = new UnavailableHealthProvider();

export default function HealthSettingsScreen() {
  const database = useLocalDatabase();
  const [preference, setPreference] = useState<HealthConnectionPreference>('not-now');
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void unavailableProvider.isAvailable().then((value) => {
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
  }, [database]);

  const requestedTypes = useMemo(() => healthTypesForPreference(preference), [preference]);
  const statusLabel =
    preference === 'not-now'
      ? 'Not connected'
      : available === null
        ? 'Checking availability'
        : available
          ? 'Available on this device'
          : 'Connector not installed';

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
            : 'Before any native connection is enabled, SHIFT6 will explain each data type and ask separately.'}
        </Text>
      </Card>

      {requestedTypes.length > 0 ? (
        <>
          <Text variant="h2" style={styles.sectionTitle}>
            Potential data types
          </Text>
          <Text variant="small" tone="muted" style={styles.sectionCopy}>
            These are the summaries associated with your preference. This preview does not request
            access or import any health data.
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
  action: {
    marginTop: spacing.xl,
  },
  previewNote: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
