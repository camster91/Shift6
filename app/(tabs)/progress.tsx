import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, ProgressIndicator, Screen, SixWeekIndicator, Text } from '../../src/components/ui';
import { demoCycle, demoProgram } from '../../src/domain/fixtures/home';
import { colors, spacing } from '../../src/design/tokens';

export default function ProgressScreen() {
  return (
    <Screen>
      <Text variant="caption" tone="muted">
        CYCLE PROGRESS
      </Text>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        See what changed.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        Progress starts with a trustworthy baseline, not a perfect streak.
      </Text>

      <Card tone="white" style={styles.cycleCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="caption" tone="muted">
              {demoProgram.title.toUpperCase()}
            </Text>
            <Text variant="h2">Week {demoCycle.currentWeek} of 6</Text>
          </View>
          <Ionicons name="trending-up-outline" size={28} color={colors.success} />
        </View>
        <View style={styles.indicator}>
          <SixWeekIndicator weeks={demoCycle.weeks} />
        </View>
        <ProgressIndicator label="Adherence" value={0} />
        <Text variant="small" tone="muted" style={styles.helper}>
          Your first completed sessions will populate this cycle scorecard.
        </Text>
      </Card>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="barbell-outline"
          label="Workouts"
          value="0"
          detail="this cycle"
          tone="lavender"
        />
        <MetricCard
          icon="timer-outline"
          label="Cardio"
          value="0 min"
          detail="this cycle"
          tone="blue"
        />
        <MetricCard
          icon="pulse-outline"
          label="Volume"
          value="—"
          detail="not enough data"
          tone="mint"
        />
        <MetricCard
          icon="ribbon-outline"
          label="Records"
          value="0"
          detail="this cycle"
          tone="yellow"
        />
      </View>
    </Screen>
  );
}

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  tone: 'lavender' | 'blue' | 'mint' | 'yellow';
}

function MetricCard({ icon, label, value, detail, tone }: MetricCardProps) {
  return (
    <Card tone={tone} style={styles.metricCard}>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text variant="caption" tone="muted" style={styles.metricLabel}>
        {label}
      </Text>
      <Text variant="h2">{value}</Text>
      <Text variant="caption" tone="muted">
        {detail}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  cycleCard: {
    marginTop: spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  indicator: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  helper: {
    marginTop: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  metricLabel: {
    marginTop: spacing.xs,
  },
});
