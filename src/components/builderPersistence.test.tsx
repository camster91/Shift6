import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProgramBuilderScreen from '../../app/builder';

let mockDatabase: object | null = {};
let mockReleaseMode = 'guest-only';
const mockSaveProgram = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ mode: 'blank' }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../config/env', () => ({
  runtimeConfig: {
    get releaseMode() {
      return mockReleaseMode;
    },
  },
}));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../db/programRepository', () => ({
  getUserExercises: async () => [],
  getUserProgramVersion: async () => null,
  saveCustomExercise: jest.fn(async () => undefined),
  saveProgramVersion: (...args: unknown[]) => mockSaveProgram(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDatabase = {};
  mockReleaseMode = 'guest-only';
  mockSaveProgram.mockResolvedValue(undefined);
});

test('confirmed guest writes explain device storage and never promise cloud sync', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText('Draft saved locally.')).toBeTruthy());
  expect(mockSaveProgram).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/They are not backed up to the cloud/)).toBeTruthy();
  expect(screen.queryByText(/queued for sync/)).toBeNull();
});

test('a failed save clears an earlier success and shows the write error', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText('Draft saved locally.')).toBeTruthy());
  mockSaveProgram.mockRejectedValue(new Error('Disk unavailable'));
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText('Disk unavailable')).toBeTruthy());
  expect(screen.queryByText('Draft saved locally.')).toBeNull();
});

test('missing local storage never claims a preview draft was saved', async () => {
  mockDatabase = null;
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText(/Your plan has not been saved/)).toBeTruthy());
  expect(mockSaveProgram).not.toHaveBeenCalled();
  expect(screen.queryByText('Draft saved locally.')).toBeNull();
});

test('connected mode retains the queued synchronization disclosure after a write', async () => {
  mockReleaseMode = 'connected';
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText(/queued for sync/)).toBeTruthy());
  expect(mockSaveProgram).toHaveBeenCalledTimes(1);
});
