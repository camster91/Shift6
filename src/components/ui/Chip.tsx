import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, touchTargets } from '../../design/tokens';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected = false, onPress, disabled = false }: ChipProps) {
  const content = (
    <>
      <View style={[styles.dot, selected && styles.selectedDot]} />
      <Text variant="caption" tone={selected ? 'inverse' : 'muted'}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={[styles.base, selected && styles.selected]}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargets.compact,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  selectedDot: {
    backgroundColor: colors.lavender,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.inkMuted,
  },
  pressed: {
    opacity: 0.76,
  },
  disabled: {
    opacity: 0.45,
  },
});
