import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Button, Card, LoadingSkeleton, Screen, Text } from '../components/ui';
import { colors, spacing } from '../design/tokens';
import { migrateDatabase } from './migrations';
import { LocalDatabaseContext } from './context';
import {
  createDatabaseInitialization,
  type DatabaseInitializationState,
} from './databaseInitialization';

// Public SDK option: each attempt owns its connection instead of borrowing the
// native cache's handle. Keep initialization serialized across React remounts.
const databaseOpenOptions = { useNewConnection: true } as const;
const initialization = createDatabaseInitialization({
  open: () => openDatabaseAsync('shift6.db', databaseOpenOptions),
  initialize: migrateDatabase,
  onDiagnostic: (value) => console.warn('SHIFT6 local storage', value.stage, value.code),
});

interface LocalDatabaseProviderProps {
  children: ReactNode;
}

export function LocalDatabaseProvider({ children }: LocalDatabaseProviderProps) {
  const [state, setState] = useState<DatabaseInitializationState<SQLiteDatabase>>({
    status: 'loading',
  });
  const [attempt, setAttempt] = useState(0);
  const retryDatabase = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => initialization.start(setState), [attempt]);

  if (state.status === 'error') {
    return <DatabaseUnavailableScreen onRetry={retryDatabase} />;
  }

  if (state.status === 'loading') {
    return (
      <Screen>
        <Text variant="h2" accessibilityRole="alert">
          Opening your local record…
        </Text>
        <LoadingSkeleton height={180} />
      </Screen>
    );
  }

  return (
    <LocalDatabaseContext.Provider value={state.database}>{children}</LocalDatabaseContext.Provider>
  );
}

function DatabaseUnavailableScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen>
      <View style={styles.icon} accessibilityLabel="Local database unavailable">
        <Ionicons name="warning-outline" size={28} color={colors.warning} />
      </View>
      <Text variant="display" accessibilityRole="header" style={styles.title}>
        Your local record needs attention.
      </Text>
      <Text variant="body" tone="muted" style={styles.subtitle}>
        SHIFT6 could not open its on-device workout storage. Try again before continuing.
      </Text>
      <Card tone="yellow" style={styles.card} accessibilityLabel="Local storage unavailable">
        <Text variant="smallMedium">Local-first storage is unavailable</Text>
        <Text variant="small" tone="muted" style={styles.cardCopy}>
          Workout logging stays unavailable until the local database opens successfully.
        </Text>
      </Card>
      <Button label="Try again" onPress={onRetry} style={styles.retryButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  title: {
    marginTop: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.xl,
  },
  cardCopy: {
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.xl,
  },
});
