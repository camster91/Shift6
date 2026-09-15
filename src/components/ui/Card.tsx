import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, elevation, radii, spacing } from '../../design/tokens';

export type CardTone = 'white' | 'ink' | 'lavender' | 'blue' | 'mint' | 'yellow' | 'coral' | 'rest';

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({ children, tone = 'white', style, accessibilityLabel }: CardProps) {
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, toneStyles[tone], style]}
    >
      {children}
    </View>
  );
}

const toneStyles = StyleSheet.create({
  white: { backgroundColor: colors.white },
  ink: { backgroundColor: colors.ink },
  lavender: { backgroundColor: colors.lavenderBackground },
  blue: { backgroundColor: colors.blue },
  mint: { backgroundColor: colors.mint },
  yellow: { backgroundColor: colors.yellow },
  coral: { backgroundColor: colors.coral },
  rest: { backgroundColor: colors.rest },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    ...elevation.card,
  },
});
