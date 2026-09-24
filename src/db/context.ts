import { createContext, useContext } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

export const LocalDatabaseContext = createContext<SQLiteDatabase | null>(null);

export function useLocalDatabase(): SQLiteDatabase | null {
  return useContext(LocalDatabaseContext);
}
