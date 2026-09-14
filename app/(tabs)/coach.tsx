import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, Screen, Text } from '../../src/components/ui';
import { demoCoachProposal } from '../../src/domain/fixtures/home';
import { colors, radii, spacing } from '../../src/design/tokens';

export default function CoachScreen() {
  return (
    <Screen>
      <Text variant="caption" tone="muted">
        SHIFT6 COACH
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        A thoughtful next step.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Coach guidance will stay grounded in your approved plan and logged training.
      </Text>

      <Card tone="lavender" style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <View style={styles.icon}>
            <Ionicons name="sparkles-outline" size={22} color={colors.ink} />
          </View>
          <View style={styles.noteHeading}>
            <Text variant="caption" tone="muted">
              TODAY'S NOTE
            </Text>
            <Text variant="h3">Week 1: establish.</Text>
          </View>
        </View>
        <Text variant="body" style={styles.noteBody}>
          {demoCoachProposal.summary}
        </Text>
        <Text variant="small" tone="muted">
          Facts first. Suggestions require your approval.
        </Text>
      </Card>

      <Text variant="h2" style={styles.sectionTitle}>
        Proposals
      </Text>
      <EmptyState
        icon={<Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />}
        title="No plan changes yet"
        message="When the data supports a meaningful adjustment, you’ll see the current plan, proposed change, and reason here."
      />
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
  noteCard: {
    marginTop: spacing.xl,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteHeading: {
    gap: spacing.xs,
  },
  noteBody: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
});
