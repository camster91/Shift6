import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, elevation, radii, spacing, touchTargets } from '../../design/tokens';
import { Text } from './Text';

export interface OptionCardProps {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
  icon?: ReactNode;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function OptionCard({
  label,
  description,
  selected = false,
  onPress,
  icon,
  accessibilityHint,
  style,
}: OptionCardProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.copy}>
        <Text variant="bodyMedium">{label}</Text>
        {description ? (
          <Text variant="small" tone="muted" style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.indicator, selected && styles.selectedIndicator]}>
        {selected ? <Text variant="smallMedium">✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: touchTargets.standard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...elevation.card,
  },
  selected: {
    borderColor: colors.ink,
    backgroundColor: colors.lavenderBackground,
  },
  pressed: {
    opacity: 0.78,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  description: {
    marginTop: spacing.xxs,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    borderColor: colors.ink,
    backgroundColor: colors.lavender,
  },
});
