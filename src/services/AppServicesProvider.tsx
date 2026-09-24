import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import { runtimeConfig } from '../config/env';
import { createAppServices, type AppServices } from './appServices';
import { createExpoSecureAuthProvider } from './auth';

const defaultAppServices = createAppServices({
  auth: createExpoSecureAuthProvider(),
  apiBaseUrl: runtimeConfig.apiBaseUrl,
});

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({
  children,
  services = defaultAppServices,
}: {
  children: ReactNode;
  services?: AppServices;
}) {
  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

export function useAppServices(): AppServices {
  const services = useOptionalAppServices();
  if (!services) throw new Error('useAppServices must be used within AppServicesProvider.');
  return services;
}

export function useOptionalAppServices(): AppServices | null {
  return useContext(AppServicesContext);
}
