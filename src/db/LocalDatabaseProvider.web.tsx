import type { ReactNode } from 'react';

import { LocalDatabaseContext } from './context';

interface LocalDatabaseProviderProps {
  children: ReactNode;
}

/**
 * Web is a UI preview surface for this mobile-first app.
 * Native builds use Expo SQLite; web does not claim durable local persistence.
 */
export function LocalDatabaseProvider({ children }: LocalDatabaseProviderProps) {
  return <LocalDatabaseContext.Provider value={null}>{children}</LocalDatabaseContext.Provider>;
}
