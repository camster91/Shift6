import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, ProgramCard, Screen, Text } from '../../src/components/ui';
import { demoProgram } from '../../src/domain/fixtures/home';
import { colors, spacing } from '../../src/design/tokens';

export default function ProgramsScreen() {
  return (
    <Screen>
      <Text variant="caption" tone="muted">
        PROGRAM LIBRARY
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Build the next six weeks.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Start with a clear framework, then make it yours as your training evolves.
      </Text>

      <View style={styles.filterRow}>
        <Chip label="Recommended" selected />
        <Chip label="3 days" />
        <Chip label="30 min" />
      </View>

      <Text variant="h2" style={styles.sectionTitle}>
        For your equipment
      </Text>
      <ProgramCard program={demoProgram} onPress={() => router.push('/program')} />

      <Button
        label="Personalize recommendations"
        variant="secondary"
        icon={<Ionicons name="options-outline" size={18} color={colors.ink} />}
        onPress={() => router.push('/onboarding')}
        style={styles.personalizeButton}
      />

      <Card tone="mint" style={styles.foundationCard}>
        <Ionicons name="construct-outline" size={24} color={colors.ink} />
        <Text variant="h3" style={styles.cardTitle}>
          Your library is taking shape.
        </Text>
        <Text variant="body" tone="muted">
          The curated catalogue and custom builder will share the same versioned program model.
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  foundationCard: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  personalizeButton: {
    marginTop: spacing.md,
  },
  cardTitle: {
    marginTop: spacing.xs,
  },
});
