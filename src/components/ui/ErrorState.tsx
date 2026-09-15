import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../design/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something needs attention',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityRole="alert"
      style={styles.container}
    >
      <Text variant="h3">{title}</Text>
      <Text variant="body" tone="muted" style={styles.message}>
        {message}
      </Text>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    borderRadius: 20,
    backgroundColor: colors.coral,
  },
  message: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
});
