import { render } from '@testing-library/react-native';
import { OfflineBanner } from './OfflineBanner';
let mockReleaseMode = 'guest-only';
jest.mock('../../config/env', () => ({
  runtimeConfig: {
    get releaseMode() {
      return mockReleaseMode;
    },
  },
}));
afterEach(() => {
  mockReleaseMode = 'guest-only';
});
test('guest banners never promise remote synchronization or backup', async () => {
  for (const status of ['offline', 'syncing', 'sync-failed', 'sync-conflict'] as const) {
    const screen = await render(<OfflineBanner status={status} />);
    expect(
      screen.getByLabelText(
        `${status === 'offline' ? 'Offline mode' : 'Local storage'}. Workout logging stays on this device. Cloud sync is not enabled.`,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/sync when you reconnect|being backed up|retry later/)).toBeNull();
    await screen.unmount();
  }
});
test('connected offline mode keeps its existing authenticated sync guidance', async () => {
  mockReleaseMode = 'connected';
  const screen = await render(<OfflineBanner status="offline" />);
  expect(
    screen.getByLabelText(
      'Offline mode. Workout logging is available. We’ll sync when you reconnect.',
    ),
  ).toBeTruthy();
});
