import type { ReactNode } from 'react';
import { StyleSheet, Text as NativeText } from 'react-native';
import type { TextProps as NativeTextProps } from 'react-native';

import { colors, typography } from '../../design/tokens';

export type TextVariant = keyof typeof typography;
export type TextTone = 'default' | 'muted' | 'inverse' | 'success' | 'warning' | 'error' | 'info';

export interface TextProps extends NativeTextProps {
  children: ReactNode;
  variant?: TextVariant;
  tone?: TextTone;
}

export function Text({ children, variant = 'body', tone = 'default', style, ...props }: TextProps) {
  return (
    <NativeText
      allowFontScaling
      {...props}
      style={[styles.base, typography[variant], toneStyles[tone], style]}
    >
      {children}
    </NativeText>
  );
}

const toneStyles = StyleSheet.create({
  default: { color: colors.ink },
  muted: { color: colors.inkMuted },
  inverse: { color: colors.white },
  success: { color: colors.success },
  warning: { color: colors.warning },
  error: { color: colors.error },
  info: { color: colors.info },
});

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    letterSpacing: 0,
  },
});
