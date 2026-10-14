import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SummaryScreen from '../../app/summary';
import {
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
const mockDb = {},
  mockSave = jest.fn();
let mockSession = {
  id: 'synthetic-session',
  workoutId: mockVersion.workouts[0]!.id,
  programVersionId: mockVersion.id,
  startedAt: '2026-10-13T12:00:00Z',
  completedAt: '2026-10-13T12:10:00Z' as string | undefined,
  status: 'complete',
};
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
  getWorkoutSession: async () => mockSession,
}));
jest.mock('../db/checkInRepository', () => ({
  getWorkoutCheckIn: async () => null,
  saveWorkoutCheckIn: (...args: unknown[]) => mockSave(...args),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
  mockSession = {
    ...mockSession,
    startedAt: '2026-10-13T12:00:00Z',
    completedAt: '2026-10-13T12:10:00Z',
    status: 'complete',
  };
});

test('resumed hours-old partial session discloses elapsed time without changing original timestamps', async () => {
  mockSession = { ...mockSession, status: 'partial', completedAt: '2026-10-13T21:48:00Z' };
  const original = JSON.stringify(mockSession);
  const screen = await render(<SummaryScreen />);
  await waitFor(() =>
    expect(screen.getByText('0 sets logged · 588 min elapsed since start')).toBeTruthy(),
  );
  expect(
    screen.getByText('Includes time away and pauses. Active training time is not measured.'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(
      /Partial workout saved.*588 min elapsed since start.*Includes time away and pauses/,
    ),
  ).toBeTruthy();
  expect(JSON.stringify(mockSession)).toBe(original);
  expect(mockSave).not.toHaveBeenCalled();
});

test('missing completion time keeps the planned duration labeled as a target', async () => {
  mockSession = { ...mockSession, completedAt: undefined };
  const screen = await render(<SummaryScreen />);
  await waitFor(() =>
    expect(
      screen.getByText(
        `0 sets logged · ${mockVersion.workouts[0]!.estimatedDurationMinutes} min target`,
      ),
    ).toBeTruthy(),
  );
  expect(screen.queryByText(/min elapsed since start/)).toBeNull();
  expect(
    screen.queryByText('Includes time away and pauses. Active training time is not measured.'),
  ).toBeNull();
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
