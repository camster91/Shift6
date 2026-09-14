import type { ReactNode } from 'react';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDatabase } from './migrations';

interface LocalDatabaseProviderProps {
  children: ReactNode;
}

export function LocalDatabaseProvider({ children }: LocalDatabaseProviderProps) {
  return (
    <SQLiteProvider databaseName="shift6.db" onInit={migrateDatabase}>
      {children}
    </SQLiteProvider>
  );
}
