import { connectivityStatusFromNetworkState } from './connectivity';

describe('connectivity mapping', () => {
  it('treats a disconnected or unreachable network as offline', () => {
    expect(connectivityStatusFromNetworkState({ isConnected: false })).toBe('offline');
    expect(
      connectivityStatusFromNetworkState({ isConnected: true, isInternetReachable: false }),
    ).toBe('offline');
  });

  it('keeps an indeterminate native state distinct from online', () => {
    expect(connectivityStatusFromNetworkState({})).toBe('unknown');
    expect(connectivityStatusFromNetworkState({ isConnected: true })).toBe('online');
  });
});
