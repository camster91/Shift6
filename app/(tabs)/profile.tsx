import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, Screen, Text } from '../../src/components/ui';
import { demoEquipment, demoUser } from '../../src/domain/fixtures/home';
import { colors, radii, spacing } from '../../src/design/tokens';

export default function ProfileScreen() {
  return (
    <Screen>
      <Text variant="caption" tone="muted">
        PROFILE
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Make training fit.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Your goals, equipment, schedule, and preferences shape the plan.
      </Text>

      <Card tone="ink" style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text variant="h2">C</Text>
        </View>
        <Text variant="h2" tone="inverse" style={styles.profileName}>
          {demoUser.displayName}
        </Text>
        <Text variant="small" style={styles.profileMeta}>
          Intermediate · {demoUser.preferredSessionMinutes}-minute sessions · Imperial
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Equipment on hand
      </Text>
      <Card tone="white" style={styles.equipmentCard}>
        <View style={styles.chips}>
          {demoEquipment.slice(0, 5).map((equipment) => (
            <Chip key={equipment.id} label={equipment.name} selected />
          ))}
        </View>
        <Text variant="small" tone="muted" style={styles.equipmentHint}>
          Equipment availability will filter programs and rank substitutions.
        </Text>
      </Card>

      <Card tone="blue" style={styles.settingsCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.ink} />
        <Text variant="h3" style={styles.settingsTitle}>
          Local-first by default.
        </Text>
        <Text variant="body" tone="muted">
          Workout data is designed to remain useful on the device before any account or cloud sync
          is connected.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  profileCard: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    marginTop: spacing.md,
  },
  profileMeta: {
    color: colors.rest,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  equipmentCard: {
    padding: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  equipmentHint: {
    marginTop: spacing.md,
  },
  settingsCard: {
    marginTop: spacing.xl,
  },
  settingsTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
