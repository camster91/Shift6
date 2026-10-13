import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CalendarScreen from '../../app/calendar';
import { getActiveTrainingCycle } from '../db/cycleRepository';
import { getUserProgramVersion } from '../db/programRepository';
import { getWorkoutScheduleOverrides, getWorkoutScheduleSessions } from '../db/calendarRepository';
import {
  previewLocalScheduleMove,
  confirmLocalScheduleMove,
} from '../db/scheduleRevisionRepository';
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
}));
jest.mock('../db/scheduleRevisionRepository', () => ({
  previewLocalScheduleMove: jest.fn(),
  confirmLocalScheduleMove: jest.fn(),
  getConfirmedScheduleTimeZone: async () => null,
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['setTimeout', 'clearTimeout'] });
  jest.setSystemTime(new Date(2026, 9, 14, 7));
  jest.mocked(getActiveTrainingCycle).mockResolvedValue({
    ...demoCycle,
    currentWeek: 1,
    userId: 'guest-user',
    startedAt: new Date(2026, 9, 14, 6).toISOString(),
  });
  jest
    .mocked(getUserProgramVersion)
    .mockResolvedValue({ program: demoProgram, version: demoProgramVersion });
  jest.mocked(getWorkoutScheduleOverrides).mockResolvedValue([]);
  jest.mocked(getWorkoutScheduleSessions).mockResolvedValue([]);
  jest.mocked(previewLocalScheduleMove).mockImplementation(async (_db, input) => ({
    move: { ...input, previousRevisionId: null },
    cycleFingerprint: 'reviewed-cycle',
    effectiveDate: '2026-10-14',
    baseline: null,
    dates: [],
  }));
  jest.mocked(confirmLocalScheduleMove).mockResolvedValue({ status: 'appended', revisions: [] });
  mockRefresh.mockResolvedValue({ status: 'scheduled' });
});
afterEach(() => jest.useRealTimers());
async function openReview() {
  const screen = await render(<CalendarScreen />);
  await waitFor(() =>
    expect(screen.getAllByLabelText('Move Strength A later').length).toBeGreaterThan(0),
  );
  await fireEvent.press(screen.getAllByLabelText('Move Strength A later')[0]!);
  return screen;
}
test('date and original timezone are reviewed before confirmation; Cancel writes nothing', async () => {
  const screen = await openReview();
  expect(screen.getByDisplayValue('2026-10-15')).toBeTruthy();
  expect(confirmLocalScheduleMove).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Review date change'));
  await waitFor(() => expect(screen.getByLabelText('Confirm session date')).toBeTruthy());
  expect(previewLocalScheduleMove).toHaveBeenCalledWith(
    mockDb,
    expect.objectContaining({
      toDate: '2026-10-15',
      cycleWeek: 1,
      originalTimeZone: expect.any(String),
    }),
    expect.any(String),
  );
  await fireEvent.press(screen.getByLabelText('Cancel date change'));
  expect(confirmLocalScheduleMove).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
});
test('confirmation waits for the atomic save before refreshing dates and reminders', async () => {
  const screen = await openReview();
  await fireEvent.press(screen.getByLabelText('Review date change'));
  await waitFor(() => expect(screen.getByLabelText('Confirm session date')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Confirm session date'));
  await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  expect(confirmLocalScheduleMove).toHaveBeenCalledWith(
    mockDb,
    expect.objectContaining({ move: expect.objectContaining({ toDate: '2026-10-15' }) }),
    expect.any(String),
    expect.any(Function),
  );
  expect(jest.mocked(confirmLocalScheduleMove).mock.invocationCallOrder[0]).toBeLessThan(
    mockRefresh.mock.invocationCallOrder[0]!,
  );
});
test('stale confirmation preserves entered date for a new review and does not refresh reminders', async () => {
  jest
    .mocked(confirmLocalScheduleMove)
    .mockRejectedValueOnce(new Error('The cycle or date changed. Review this move again.'));
  const screen = await openReview();
  await fireEvent.press(screen.getByLabelText('Review date change'));
  await waitFor(() => expect(screen.getByLabelText('Confirm session date')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Confirm session date'));
  await waitFor(() =>
    expect(screen.getByText('The cycle or date changed. Review this move again.')).toBeTruthy(),
  );
  expect(screen.getByDisplayValue('2026-10-15')).toBeTruthy();
  expect(screen.getByLabelText('Review date change')).toBeTruthy();
  expect(mockRefresh).not.toHaveBeenCalled();
});
test('editing the date invalidates a prior preview instead of confirming different input', async () => {
  const screen = await openReview();
  await fireEvent.press(screen.getByLabelText('Review date change'));
  await waitFor(() => expect(screen.getByLabelText('Confirm session date')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('New session date YYYY-MM-DD'), '2026-10-20');
  expect(screen.queryByLabelText('Confirm session date')).toBeNull();
  expect(confirmLocalScheduleMove).not.toHaveBeenCalled();
});
test('reminder failure reports the committed date and does not pretend its save failed', async () => {
  mockRefresh.mockRejectedValueOnce(new Error('notifications unavailable'));
  const screen = await openReview();
  await fireEvent.press(screen.getByLabelText('Review date change'));
  await waitFor(() => expect(screen.getByLabelText('Confirm session date')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Confirm session date'));
  await waitFor(() =>
    expect(
      screen.getByText(
        'Date saved. Device reminders could not be refreshed; check notification settings.',
      ),
    ).toBeTruthy(),
  );
  expect(confirmLocalScheduleMove).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('notifications unavailable')).toBeNull();
});
