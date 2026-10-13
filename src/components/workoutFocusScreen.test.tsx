import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActiveWorkoutScreen from '../../app/workout';
import { demoCycle, demoProgram, demoProgramVersion, demoUser } from '../domain/fixtures/home';
const mockDb = {},
  mockSaveSet = jest.fn(),
  mockSaveNote = jest.fn(),
  mockPartial = jest.fn(),
  mockSkip = jest.fn(),
  mockSaveDraft = jest.fn();
jest.mock('expo-network', () => ({
  getNetworkStateAsync: async () => ({ isConnected: false, isInternetReachable: false }),
  addNetworkStateListener: () => ({ remove: () => undefined }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ workoutId: 'workout-barbell-30-strength-a' }),
}));
jest.mock('../services/notifications', () => ({ createExpoNotificationProvider: () => ({}) }));
jest.mock('../services/notificationScheduler', () => ({
  cancelRestTimerCue: async () => undefined,
  refreshRestTimerCue: async () => ({ outcome: 'disabled' }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../services/SyncRuntimeProvider', () => ({
  useSyncRuntime: () => ({ flushNow: jest.fn(), state: 'idle' }),
}));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: async () => ({ ...mockCycle, userId: 'guest-user' }),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
  getUserExercises: async () => [],
}));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: async () => ({ user: mockUser }),
}));
jest.mock('../db/notificationRepository', () => ({
  getNotificationPreferences: async () => ({ restTimer: false }),
}));
jest.mock('../db/progressRepository', () => ({ getLatestCompletedWorkoutSets: async () => [] }));
jest.mock('../db/workoutRepository', () => ({
  getInProgressWorkoutSession: async () => null,
  saveWorkoutSession: async () => undefined,
  getCompletedSets: async () => [],
  getWorkoutDraft: async () => null,
  saveWorkoutDraft: (...args: unknown[]) => mockSaveDraft(...args),
  saveCompletedSet: (...args: unknown[]) => mockSaveSet(...args),
  updateCompletedSet: jest.fn(),
  updateWorkoutSessionNote: (...args: unknown[]) => mockSaveNote(...args),
  updateWorkoutSessionReadiness: jest.fn(),
  saveActiveWorkoutRevision: jest.fn(),
  completeWorkoutSessionAndAdvanceCycle: jest.fn(),
  finishWorkoutSessionPartially: (...args: unknown[]) => mockPartial(...args),
  finishWorkoutSessionSkipped: (...args: unknown[]) => mockSkip(...args),
}));
const mockCycle = demoCycle,
  mockProgram = demoProgram,
  mockVersion = demoProgramVersion,
  mockUser = demoUser;
beforeEach(() => {
  jest.clearAllMocks();
  mockSaveSet.mockResolvedValue('saved');
  mockSaveNote.mockResolvedValue(undefined);
  mockSaveDraft.mockResolvedValue(undefined);
  mockPartial.mockResolvedValue({ status: 'partial' });
  mockSkip.mockResolvedValue({ status: 'skipped' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());
test('focus saves the actual edited result before revealing the next set, preserving failure state', async () => {
  let release: (value: string) => void = () => undefined;
  mockSaveSet.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
  expect(screen.getByText(/Suggested values are not measurements/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '4');
  const pendingPress = fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalled());
  expect(mockSaveSet.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ reps: 4 }));
  expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
  release('saved');
  await pendingPress;
  await waitFor(() => expect(screen.getByLabelText('Back squat set 2 reps')).toBeTruthy());
  expect(screen.getByText(/How did Back squat set 1 feel/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Too hard'));
  await waitFor(() =>
    expect(mockSaveNote).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      'Set feeling · Back squat · set 1: Too hard',
    ),
  );
  expect(mockSaveSet).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Back squat set 2 reps').props.value).toBe('5');
});
test('a failed set save does not advance focus or manufacture a recorded result', async () => {
  mockSaveSet.mockRejectedValueOnce(new Error('disk full'));
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(screen.getByText('disk full')).toBeTruthy());
  expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy();
  expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
});
test('discomfort requires confirmation and an untouched session is skipped rather than completed', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByText('Discomfort — stop session')).toBeTruthy());
  await fireEvent.press(screen.getByText('Discomfort — stop session'));
  expect(mockSkip).not.toHaveBeenCalled();
  expect(mockSaveSet).not.toHaveBeenCalled();
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]?.[2]?.find((item) => item.text === 'Skip and stop')
      ?.onPress?.(),
  );
  await waitFor(() =>
    expect(mockSkip).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      expect.any(String),
      'discomfort',
    ),
  );
  expect(mockPartial).not.toHaveBeenCalled();
  expect(mockSaveSet).not.toHaveBeenCalled();
});

test('pending feedback stays attached to the saved set and cannot advance or select another set', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 2')).toBeTruthy());
  let release: () => void = () => undefined;
  mockSaveNote.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const feedbackPress = fireEvent.press(screen.getByText('Too hard'));
  await waitFor(() =>
    expect(
      screen.getByLabelText('Complete Back squat set 2').props.accessibilityState.disabled,
    ).toBe(true),
  );
  expect(mockSaveSet).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/How did Back squat set 1 feel/)).toBeTruthy();
  await act(async () => {
    release();
  });
  await feedbackPress;
  await waitFor(() =>
    expect(
      screen.getByLabelText('Complete Back squat set 2').props.accessibilityState.disabled,
    ).toBe(false),
  );
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 2'));
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 3')).toBeTruthy());
  expect(screen.getByText(/How did Back squat set 2 feel/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Too hard', selected: false })).toBeTruthy();
  expect(mockSaveNote).toHaveBeenCalledWith(
    mockDb,
    expect.any(String),
    'Set feeling · Back squat · set 1: Too hard',
  );
});
