import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SummaryScreen from '../../app/summary';
import {
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
const mockDb = {},
  mockSave = jest.fn();
jest.mock('./artwork/ShiftArtwork', () => ({ ShiftArtwork: () => null }));
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ sessionId: 'synthetic-session' }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
}));
jest.mock('../db/workoutRepository', () => ({
  getCompletedSets: async () => [],
  getWorkoutSession: async () => ({
    id: 'synthetic-session',
    workoutId: mockVersion.workouts[0]!.id,
    programVersionId: mockVersion.id,
    startedAt: '2026-10-13T12:00:00Z',
    completedAt: '2026-10-13T12:10:00Z',
    status: 'complete',
  }),
}));
jest.mock('../db/checkInRepository', () => ({
  getWorkoutCheckIn: async () => null,
  saveWorkoutCheckIn: (...args: unknown[]) => mockSave(...args),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});
test('guest check-in copy reports saved only after persistence, without a sync promise', async () => {
  const screen = await render(<SummaryScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save check-in')).toBeTruthy());
  expect(
    screen.getByText('Save your check-in to keep it on this device. Cloud sync is not enabled.'),
  ).toBeTruthy();
  expect(screen.queryByText(/queued for sync/)).toBeNull();
  await fireEvent.press(screen.getByLabelText('Save check-in'));
  await waitFor(() =>
    expect(
      screen.getByText('Check-in saved on this device. Cloud sync is not enabled.'),
    ).toBeTruthy(),
  );
  expect(mockSave).toHaveBeenCalledTimes(1);
});
test('failed check-in keeps unsaved guidance', async () => {
  mockSave.mockRejectedValue(new Error('Synthetic storage failure'));
  const screen = await render(<SummaryScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save check-in')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Save check-in'));
  await waitFor(() => expect(screen.getByText('Synthetic storage failure')).toBeTruthy());
  expect(
    screen.queryByText('Check-in saved on this device. Cloud sync is not enabled.'),
  ).toBeNull();
  expect(
    screen.getByText('Save your check-in to keep it on this device. Cloud sync is not enabled.'),
  ).toBeTruthy();
});
