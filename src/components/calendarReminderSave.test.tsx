import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CalendarScreen from '../../app/calendar';
import { getActiveTrainingCycle } from '../db/cycleRepository';
import { getUserProgramVersion } from '../db/programRepository';
import {
  getWorkoutScheduleOverrides,
  getWorkoutScheduleSessions,
  saveWorkoutScheduleOverride,
} from '../db/calendarRepository';
import { demoCycle, demoProgram, demoProgramVersion } from '../domain/fixtures/home';
const mockDb = {},
  mockRefresh = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/NotificationRuntimeProvider', () => ({
  useNotificationRuntime: () => ({ refreshNow: mockRefresh }),
}));
jest.mock('../db/cycleRepository', () => ({ getActiveTrainingCycle: jest.fn() }));
jest.mock('../db/programRepository', () => ({ getUserProgramVersion: jest.fn() }));
jest.mock('../db/calendarRepository', () => ({
  getWorkoutScheduleOverrides: jest.fn(),
  getWorkoutScheduleSessions: jest.fn(),
  saveWorkoutScheduleOverride: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout'] });
  jest.setSystemTime(new Date(2026, 9, 14, 7));
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.mocked(getActiveTrainingCycle).mockResolvedValue({
    ...demoCycle,
    userId: 'guest-user',
    startedAt: new Date(2026, 9, 14, 12).toISOString(),
  });
  jest
    .mocked(getUserProgramVersion)
    .mockResolvedValue({ program: demoProgram, version: demoProgramVersion });
  jest.mocked(getWorkoutScheduleOverrides).mockResolvedValue([]);
  jest.mocked(getWorkoutScheduleSessions).mockResolvedValue([]);
  jest.mocked(saveWorkoutScheduleOverride).mockResolvedValue(undefined);
  mockRefresh.mockResolvedValue({ status: 'scheduled' });
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});
test('a move previews dates, cancellation writes nothing, confirmation refreshes only after save', async () => {
  const screen = await render(<CalendarScreen />);
  await waitFor(() =>
    expect(screen.getAllByLabelText('Move Strength A later').length).toBeGreaterThan(0),
  );
  await fireEvent.press(screen.getAllByLabelText('Move Strength A later')[0]!);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Move this session?',
    expect.stringContaining('Oct 14'),
    expect.any(Array),
  );
  expect(saveWorkoutScheduleOverride).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
  const choices = jest.mocked(Alert.alert).mock.calls[0]?.[2];
  await act(async () => choices?.find((choice) => choice.text === 'Cancel')?.onPress?.());
  expect(saveWorkoutScheduleOverride).not.toHaveBeenCalled();
  await act(async () => choices?.find((choice) => choice.text === 'Move session')?.onPress?.());
  await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  expect(saveWorkoutScheduleOverride).toHaveBeenCalledWith(
    mockDb,
    expect.objectContaining({ scheduledDate: '2026-10-15', originalDate: '2026-10-14' }),
  );
  expect(jest.mocked(saveWorkoutScheduleOverride).mock.invocationCallOrder[0]).toBeLessThan(
    mockRefresh.mock.invocationCallOrder[0]!,
  );
});
test('reminder failure does not undo a committed calendar move', async () => {
  mockRefresh.mockRejectedValueOnce(new Error('notifications unavailable'));
  const screen = await render(<CalendarScreen />);
  await waitFor(() =>
    expect(screen.getAllByLabelText('Move Strength A later').length).toBeGreaterThan(0),
  );
  await fireEvent.press(screen.getAllByLabelText('Move Strength A later')[0]!);
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]?.[2]?.find((choice) => choice.text === 'Move session')
      ?.onPress?.(),
  );
  await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  expect(saveWorkoutScheduleOverride).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText('MOVED').length).toBe(1);
  expect(screen.queryByText('notifications unavailable')).toBeNull();
  expect(
    screen.getByText(
      'Date saved. Device reminders could not be refreshed; check notification settings.',
    ),
  ).toBeTruthy();
});
