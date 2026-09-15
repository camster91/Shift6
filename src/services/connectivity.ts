import * as Network from 'expo-network';
import type { NetworkState } from 'expo-network';

import type { ConnectivityProvider, ConnectivityStatus } from './syncCoordinator';

export function connectivityStatusFromNetworkState(state: NetworkState): ConnectivityStatus {
  if (state.isConnected === false || state.isInternetReachable === false) return 'offline';
  if (state.isConnected === true || state.isInternetReachable === true) return 'online';
  return 'unknown';
}

export class ExpoConnectivityProvider implements ConnectivityProvider {
  async getStatus(): Promise<ConnectivityStatus> {
    try {
      return connectivityStatusFromNetworkState(await Network.getNetworkStateAsync());
    } catch {
      return 'unknown';
    }
  }

  subscribe(listener: (status: ConnectivityStatus) => void): { remove: () => void } {
    return subscribeToConnectivity(listener);
  }
}

export function subscribeToConnectivity(listener: (status: ConnectivityStatus) => void): {
  remove: () => void;
} {
  const subscription = Network.addNetworkStateListener((state) => {
    listener(connectivityStatusFromNetworkState(state));
  });
  return { remove: () => subscription.remove() };
}
