import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii, spacing, touchTargets } from '../../design/tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading || !onPress;
  const textTone = variant === 'primary' ? 'inverse' : 'default';

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.ink} />
      ) : (
        <>
          {icon}
          <Text variant="smallMedium" tone={textTone}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.lavenderBackground },
  ghost: { backgroundColor: 'transparent' },
});

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargets.standard,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
