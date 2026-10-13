import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RestoreScreen from '../../app/restore';
const mockRestore = jest.fn(async () => 22),
  mockPick = jest.fn(),
  mockEmpty = jest.fn(async () => undefined),
  mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    canGoBack: () => false,
    back: jest.fn(),
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => ({}) }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
jest.mock('../db/localRestoreRepository', () => ({
  assertEmptyRestoreTarget: () => mockEmpty(),
  restoreLocalBackup: (..._args: unknown[]) => mockRestore(),
}));
jest.mock('../services/localDataRestore', () => ({ pickLocalBackup: () => mockPick() }));
beforeEach(() => {
  jest.clearAllMocks();
  mockEmpty.mockResolvedValue(undefined);
  mockPick.mockResolvedValue({
    name: 'synthetic.json',
    serialized: 'validated',
    preview: {
      recordCount: 22,
      exportedAt: '2026-10-13T12:00:00.000Z',
      warnings: ['Consent resets; media not included.'],
      data: { summary: { sections: [] } },
    },
  });
});
test('preview is inert until a separate explicit confirmation', async () => {
  const screen = await render(<RestoreScreen />);
  const alert = jest.spyOn(Alert, 'alert');
  await fireEvent.press(screen.getByLabelText('Choose backup file'));
  await waitFor(() => expect(screen.getByText('Review before restoring')).toBeTruthy());
  expect(mockRestore).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Confirm local restore'));
  expect(mockRestore).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0]![2]!;
  await buttons.find((button) => button.text === 'Restore')!.onPress!();
  await waitFor(() => expect(mockRestore).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Continue with restored records')).toBeTruthy();
  alert.mockRestore();
});
test('conflict stops before opening file picker and never deletes data', async () => {
  mockEmpty.mockRejectedValue(new Error('This installation already contains local records.'));
  const screen = await render(<RestoreScreen />);
  await fireEvent.press(screen.getByLabelText('Choose backup file'));
  await waitFor(() => expect(screen.getByText(/already contains local records/)).toBeTruthy());
  expect(mockPick).not.toHaveBeenCalled();
  expect(mockRestore).not.toHaveBeenCalled();
});
test('cancel preview leaves local records untouched', async () => {
  const screen = await render(<RestoreScreen />);
  await fireEvent.press(screen.getByLabelText('Choose backup file'));
  await waitFor(() => expect(screen.getByText('Review before restoring')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Cancel preview'));
  expect(screen.queryByText('Review before restoring')).toBeNull();
  expect(mockRestore).not.toHaveBeenCalled();
});
