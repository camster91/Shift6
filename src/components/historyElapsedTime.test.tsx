import { render, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../../app/history';
import { buildWorkoutHistoryEntry, type WorkoutHistoryEntry } from '../domain/history';

let mockEntries: WorkoutHistoryEntry[] = [];
const mockDb = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../db/historyRepository', () => ({ getWorkoutHistory: async () => mockEntries }));
const input = {
  id: 'history-synthetic',
  cycleId: 'private-cycle',
  cycleWeek: 1,
  workoutId: 'private-workout',
  title: 'Synthetic paused session',
  focus: 'strength' as const,
  status: 'partial' as const,
  startedAt: '2026-10-13T12:00:00Z',
  completedAt: '2026-10-13T21:48:00Z',
  isOffline: true,
  completedSetCount: 3,
  totalVolume: 0,
  totalDurationSeconds: 0,
  totalDistanceMeters: 0,
};
beforeEach(() => {
  mockEntries = [];
});

test('history labels preserved wall-clock duration and explains pauses in visible and accessible copy', async () => {
  mockEntries = [buildWorkoutHistoryEntry(input)];
  const original = JSON.stringify(mockEntries);
  const screen = await render(<HistoryScreen />);
  await waitFor(() =>
    expect(screen.getByText('3 sets · 588 min elapsed since start')).toBeTruthy(),
  );
  expect(
    screen.getByText('Includes time away and pauses. Active training time is not measured.'),
  ).toBeTruthy();
  expect(
    screen.getByLabelText(
      /Synthetic paused session.*588 min elapsed since start.*Includes time away and pauses/,
    ),
  ).toBeTruthy();
  expect(JSON.stringify(mockEntries)).toBe(original);
  expect(mockEntries[0]!.durationMinutes).toBe(588);
  expect(mockEntries[0]!.startedAt).toBe(input.startedAt);
});

test('unknown completion time never becomes elapsed or active exercise time', async () => {
  mockEntries = [
    buildWorkoutHistoryEntry({ ...input, status: 'in-progress', completedAt: undefined }),
  ];
  const screen = await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText('Synthetic paused session')).toBeTruthy());
  expect(screen.queryByText(/min elapsed since start/)).toBeNull();
  expect(
    screen.queryByText('Includes time away and pauses. Active training time is not measured.'),
  ).toBeNull();
  expect(mockEntries[0]!.durationMinutes).toBeUndefined();
});

test('a recorded zero interval stays explicit instead of borrowing a planned duration', async () => {
  mockEntries = [
    buildWorkoutHistoryEntry({ ...input, status: 'complete', completedAt: input.startedAt }),
  ];
  const screen = await render(<HistoryScreen />);
  await waitFor(() => expect(screen.getByText('3 sets · 0 min elapsed since start')).toBeTruthy());
  expect(mockEntries[0]!.durationMinutes).toBe(0);
});
