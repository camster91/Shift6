import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../design/tokens';
import type { ErrorReporter } from './contracts';
import { useAppServices } from './AppServicesProvider';

interface BoundaryProps {
  children: ReactNode;
  reporter: ErrorReporter;
}

interface BoundaryState {
  hasError: boolean;
}

class RootErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    try {
      this.props.reporter.captureException(error, { surface: 'root-render' });
    } catch {
      // Reporting must never replace the original failure with a second crash.
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>SHIFT6 ran into a problem.</Text>
          <Text style={styles.body}>
            Reopen the app to try again. If the problem continues, avoid deleting local app data
            until your workout history is safely synced or exported.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { errors } = useAppServices();
  return <RootErrorBoundary reporter={errors}>{children}</RootErrorBoundary>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.canvas,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: 'center',
    maxWidth: 520,
  },
});
