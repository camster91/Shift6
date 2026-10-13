import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import CycleScreen from '../../app/cycle';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
const mockDb = {};
let mockOwner = 'guest-user';
let mockStatus = 'active';
let mockSelection: string | undefined;
let mockOtherActive: string | null = null;
const mockAppend = jest.fn();
const mockRefresh = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ cycleId: mockSelection }),
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../services/NotificationRuntimeProvider', () => ({
  useNotificationRuntime: () => ({ refreshNow: mockRefresh }),
}));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: async () =>
    mockOtherActive
      ? { ...mockCycle, id: mockOtherActive, userId: mockOwner, status: 'active' }
      : mockStatus === 'active'
        ? { ...mockCycle, userId: mockOwner, status: mockStatus }
        : null,
  getLatestTrainingCycle: async () => ({ ...mockCycle, userId: mockOwner, status: mockStatus }),
}));
jest.mock('../db/cycleHistoryRepository', () => ({
  selectDashboardCycle: async () =>
    mockSelection === 'foreign'
      ? null
      : { ...mockCycle, id: mockSelection ?? mockCycle.id, userId: mockOwner, status: mockStatus },
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
}));
jest.mock('../db/calendarRepository', () => ({
  getWorkoutScheduleOverrides: async () => [],
  getWorkoutScheduleSessions: async () => [],
}));
jest.mock('../db/progressRepository', () => ({ getCompletedWorkoutIds: async () => new Set() }));
jest.mock('../db/cycleLifecycleRepository', () => ({
  getCycleLifecycleEvents: async () => [],
  appendCycleLifecycleEvent: (...args: unknown[]) => mockAppend(...args),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockOwner = 'guest-user';
  mockStatus = 'active';
  mockSelection = undefined;
  mockOtherActive = null;
  mockAppend.mockResolvedValue({});
  mockRefresh.mockResolvedValue({ status: 'disabled' });
});
afterEach(() => jest.restoreAllMocks());
test('pause requires explicit confirmation and cancellation writes nothing', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByText('Pause cycle')).toBeTruthy());
  await fireEvent.press(screen.getByText('Pause cycle'));
  expect(mockAppend).not.toHaveBeenCalled();
  expect(alert.mock.calls[0]![1]).toContain('Saved sets');
  await act(async () => {
    alert.mock.calls[0]![2]![1]!.onPress!();
  });
  expect(mockAppend).toHaveBeenCalledWith(
    mockDb,
    expect.objectContaining({ kind: 'pause', userId: 'guest-user', previousEventId: null }),
  );
});
test('legacy paused cycle is reachable and explains unknown interval without guessed duration', async () => {
  mockStatus = 'paused';
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByText('Resume cycle')).toBeTruthy());
  expect(screen.getByText(/earlier pause start is unknown/)).toBeTruthy();
});
test('stale owner confirmation cannot mutate the earlier person', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByText('Pause cycle')).toBeTruthy());
  await fireEvent.press(screen.getByText('Pause cycle'));
  const confirm = alert.mock.calls[0]![2]![1]!.onPress!;
  mockOwner = 'other';
  await screen.rerender(<CycleScreen />);
  await act(async () => {
    confirm();
  });
  expect(mockAppend).not.toHaveBeenCalled();
});
test('review date confirmation names the exact entered date', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByLabelText('Planned review date')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Planned review date'), '2026-11-01');
  await fireEvent.press(screen.getByText('Confirm review date'));
  expect(alert.mock.calls[0]![1]).toContain('2026-11-01');
  expect(mockAppend).not.toHaveBeenCalled();
});
test('a foreign requested cycle never falls back to the active cycle', async () => {
  mockSelection = 'foreign';
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByText('Cycle unavailable')).toBeTruthy());
  expect(screen.queryByText('Pause cycle')).toBeNull();
  expect(mockAppend).not.toHaveBeenCalled();
});
test('changing the selected cycle invalidates a previously opened confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  mockSelection = 'older-a';
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByText('Pause cycle')).toBeTruthy());
  await fireEvent.press(screen.getByText('Pause cycle'));
  const confirm = alert.mock.calls[0]![2]![1]!.onPress!;
  mockSelection = 'newer-b';
  await screen.rerender(<CycleScreen />);
  await act(async () => confirm());
  expect(mockAppend).not.toHaveBeenCalled();
});
test('an older paused cycle links to the exact other active cycle and cannot silently resume', async () => {
  mockStatus = 'paused';
  mockSelection = 'older-a';
  mockOtherActive = 'newer-b';
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByText('Open active cycle')).toBeTruthy());
  await fireEvent.press(screen.getByText('Open active cycle'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/cycle', params: { cycleId: 'newer-b' } });
  expect(mockAppend).not.toHaveBeenCalled();
});
