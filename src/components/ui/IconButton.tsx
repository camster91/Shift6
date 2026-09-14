import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, touchTargets } from '../../design/tokens';

export interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, onPress, disabled = false, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && !disabled && styles.pressed, style]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTargets.compact,
    height: touchTargets.compact,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.72,
  },
});
