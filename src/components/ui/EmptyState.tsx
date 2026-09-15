import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../design/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View accessibilityLabel={`${title}. ${message}`} style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="h3" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" tone="muted" style={styles.message}>
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 20,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
