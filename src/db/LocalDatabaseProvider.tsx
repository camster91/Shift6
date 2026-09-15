import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, Text } from '../components/ui';
import { colors, spacing } from '../design/tokens';
import { migrateDatabase } from './migrations';
import { LocalDatabaseContext } from './context';

interface LocalDatabaseProviderProps {
  children: ReactNode;
}

export function LocalDatabaseProvider({ children }: LocalDatabaseProviderProps) {
  const [databaseError, setDatabaseError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const handleDatabaseError = useCallback(() => setDatabaseError(true), []);
  const retryDatabase = useCallback(() => {
    setDatabaseError(false);
    setAttempt((current) => current + 1);
  }, []);

  if (databaseError) {
    return <DatabaseUnavailableScreen onRetry={retryDatabase} />;
  }

  return (
    <SQLiteProvider
      key={attempt}
      databaseName="shift6.db"
      onError={handleDatabaseError}
      onInit={migrateDatabase}
    >
      <DatabaseContextBridge>{children}</DatabaseContextBridge>
    </SQLiteProvider>
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
        SHIFT6 could not open its on-device workout storage. Your data was not changed. Try again
        before continuing.
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

function DatabaseContextBridge({ children }: LocalDatabaseProviderProps) {
  const database = useSQLiteContext();

  return <LocalDatabaseContext.Provider value={database}>{children}</LocalDatabaseContext.Provider>;
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
