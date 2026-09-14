import { StyleSheet, View } from 'react-native';

import type { CycleWeek, CycleWeekStatus } from '../../domain/types';
import { colors, radii, spacing } from '../../design/tokens';
import { Text } from './Text';

export interface SixWeekIndicatorProps {
  weeks: readonly CycleWeek[];
  label?: string;
}

const statusSymbols: Record<CycleWeekStatus, string> = {
  completed: '✓',
  current: '•',
  upcoming: '',
  missed: '!',
  partial: '½',
};

export function SixWeekIndicator({ weeks, label = 'Six-week cycle' }: SixWeekIndicatorProps) {
  const orderedWeeks = [...weeks]
    .sort((left, right) => left.weekNumber - right.weekNumber)
    .slice(0, 6);
  const summary = orderedWeeks.map((week) => `${week.label}: ${week.status}`).join('; ');

  return (
    <View accessibilityLabel={`${label}. ${summary}`}>
      <View style={styles.row}>
        {orderedWeeks.map((week) => {
          const symbol = statusSymbols[week.status];
          return (
            <View key={week.weekNumber} style={styles.week}>
              <View style={[styles.node, nodeStyles[week.status]]}>
                <Text variant="caption" tone={week.status === 'current' ? 'inverse' : 'default'}>
                  {symbol || week.weekNumber}
                </Text>
              </View>
              <Text variant="caption" tone={week.status === 'current' ? 'default' : 'muted'}>
                W{week.weekNumber}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend} accessible={false}>
        <Text variant="caption" tone="muted">
          ✓ complete
        </Text>
        <Text variant="caption" tone="muted">
          • current
        </Text>
        <Text variant="caption" tone="muted">
          ! missed
        </Text>
      </View>
    </View>
  );
}

const nodeStyles = StyleSheet.create({
  completed: { backgroundColor: colors.mint },
  current: { backgroundColor: colors.ink },
  upcoming: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
  missed: { backgroundColor: colors.coral },
  partial: { backgroundColor: colors.yellow },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  week: {
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  node: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
