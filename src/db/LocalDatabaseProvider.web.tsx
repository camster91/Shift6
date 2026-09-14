import type { ReactNode } from 'react';

interface LocalDatabaseProviderProps {
  children: ReactNode;
}

/**
 * Web is a UI preview surface for this mobile-first app.
 * Native builds use Expo SQLite; web does not claim durable local persistence.
 */
export function LocalDatabaseProvider({ children }: LocalDatabaseProviderProps) {
  return children;
}
