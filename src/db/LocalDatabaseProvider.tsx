import type { ReactNode } from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

import { migrateDatabase } from './migrations';
import { LocalDatabaseContext } from './context';

interface LocalDatabaseProviderProps {
  children: ReactNode;
}

export function LocalDatabaseProvider({ children }: LocalDatabaseProviderProps) {
  return (
    <SQLiteProvider databaseName="shift6.db" onInit={migrateDatabase}>
      <DatabaseContextBridge>{children}</DatabaseContextBridge>
    </SQLiteProvider>
  );
}

function DatabaseContextBridge({ children }: LocalDatabaseProviderProps) {
  const database = useSQLiteContext();

  return <LocalDatabaseContext.Provider value={database}>{children}</LocalDatabaseContext.Provider>;
}
