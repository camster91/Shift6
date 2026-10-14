import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../app/(tabs)/profile';
const mockDatabase = {};
const mockExport = jest.fn();
const mockShare = jest.fn();
const mockData = { summary: { totalRecordCount: 22, sections: ['profile', 'workouts'] } };
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../db/privacyRepository', () => ({
  exportLocalUserData: (...args: unknown[]) => mockExport(...args),
  deleteLocalUserData: jest.fn(),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../services/localDataExport', () => ({
  shareLocalDataExport: (...args: unknown[]) => mockShare(...args),
  clearLocalExportFiles: jest.fn(),
}));
jest.mock('../services/accountDeletion', () => ({ deleteAuthenticatedAccount: jest.fn() }));
jest.mock('../services/accountDeletionRecovery', () => ({ accountDeletionRecoveryStore: {} }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ auth: {}, backend: {} }),
}));
jest.mock('../services/SyncRuntimeProvider', () => ({ useSyncRuntime: () => ({}) }));
jest.mock('../services/UserIdentityProvider', () => ({
  useUserIdentity: () => ({ userId: 'synthetic-guest', kind: 'guest' }),
}));
beforeEach(() => {
  mockExport.mockReset().mockResolvedValue(mockData);
  mockShare.mockReset().mockResolvedValue(undefined);
});

test.each([
  ['preparation', 'We could not prepare the local export. Reopen the app and try again.'],
  [
    'sharing',
    'Your local records were prepared, but we could not share the export file. Reopen the app and try Export local data again.',
  ],
] as const)(
  '%s failure explains the failed stage and permits another attempt',
  async (stage, message) => {
    if (stage === 'preparation')
      mockExport.mockRejectedValueOnce(new Error('Synthetic database failure'));
    else mockShare.mockRejectedValueOnce(new Error('Synthetic share sheet failure'));
    const screen = await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Export local data' }));
    await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
    expect(mockShare).toHaveBeenCalledTimes(stage === 'sharing' ? 1 : 0);
    expect(
      screen.getByRole('button', { name: 'Export local data' }).props.accessibilityState.disabled,
    ).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Export local data' }));
    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(stage === 'sharing' ? 2 : 1));
    expect(mockExport).toHaveBeenCalledWith(mockDatabase, 'synthetic-guest', expect.any(String));
  },
);

test('sharing remains busy until its promise settles and completion asks for external receipt confirmation', async () => {
  let finish!: () => void;
  mockShare.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const screen = await render(<ProfileScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Export local data' }));
  await waitFor(() => expect(mockShare).toHaveBeenCalledWith(mockData));
  expect(
    screen.getByRole('button', { name: 'Export local data' }).props.accessibilityState.disabled,
  ).toBe(true);
  await act(async () => finish());
  await waitFor(() =>
    expect(
      screen.getByText(
        'Your local export includes 22 records across 2 sections. Open the JSON file in your chosen destination to confirm receipt.',
      ),
    ).toBeTruthy(),
  );
  expect(
    screen.getByRole('button', { name: 'Export local data' }).props.accessibilityState.disabled,
  ).toBe(false);
});
