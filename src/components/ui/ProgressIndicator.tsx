import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../../design/tokens';
import { Text } from './Text';

export interface ProgressIndicatorProps {
  value: number;
  label: string;
  showValue?: boolean;
}

export function ProgressIndicator({ value, label, showValue = true }: ProgressIndicatorProps) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const percent = Math.round(clampedValue * 100);

  return (
    <View>
      <View style={styles.labelRow}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        {showValue ? (
          <Text variant="caption" tone="muted">
            {percent}%
          </Text>
        ) : null}
      </View>
      <View
        accessibilityLabel={`${label}: ${percent}%`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.rest,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.ink,
  },
});
