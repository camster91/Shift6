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
  accessibilityHint?: string;
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  style,
  accessibilityHint,
}: IconButtonProps) {
  const isDisabled = disabled || !onPress;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && !isDisabled && styles.pressed, style]}
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
