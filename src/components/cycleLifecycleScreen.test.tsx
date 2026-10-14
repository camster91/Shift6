import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import CycleScreen from '../../app/cycle';
import type { ButtonProps } from './ui/Button';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
let mockDb = {};
let mockOwner = 'guest-user';
let mockStatus = 'active';
let mockSelection: string | undefined;
let mockOtherActive: string | null = null;
const mockAppend = jest.fn();
const mockRefresh = jest.fn();
const mockLatest = jest.fn();
let mockBlur: (() => void) | undefined;
const mockButtonHandlers = new Map<string, (() => void) | undefined>();
jest.mock('./ui', () => {
  const actual = jest.requireActual('./ui'),
    React = jest.requireActual('react');
  return {
    ...actual,
    Button: (props: ButtonProps) => {
      mockButtonHandlers.set(props.label, props.onPress);
      return React.createElement(actual.Button, props);
    },
  };
});
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ cycleId: mockSelection }),
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockBlur = callback() as (() => void) | undefined;
      return mockBlur;
    }, [callback]);
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
  getLatestTrainingCycle: (...args: unknown[]) => mockLatest(...args),
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
  mockButtonHandlers.clear();
  mockOwner = 'guest-user';
  mockStatus = 'active';
  mockSelection = undefined;
  mockOtherActive = null;
  mockDb = {};
  mockBlur = undefined;
  mockLatest.mockReset();
  mockLatest.mockImplementation(async () => ({
    ...mockCycle,
    userId: mockOwner,
    status: mockStatus,
  }));
  mockAppend.mockResolvedValue({});
  mockRefresh.mockResolvedValue({ status: 'disabled' });
});
afterEach(() => jest.restoreAllMocks());

test('selected latest completed cycle opens six-week review after a fresh owned identity read', async () => {
  mockStatus = 'complete';
  mockSelection = mockCycle.id;
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Open six-week review'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/review'));
  expect(mockLatest).toHaveBeenCalledTimes(2);
  expect(mockLatest).toHaveBeenLastCalledWith(mockDb, 'guest-user');
  expect(mockAppend).not.toHaveBeenCalled();
});

test('older selected completed cycle reads only its exact saved reflection', async () => {
  mockStatus = 'complete';
  mockSelection = 'older-complete';
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getAllByLabelText('Read saved reflection')).toHaveLength(2));
  expect(screen.queryByLabelText('Open six-week review')).toBeNull();
  await fireEvent.press(screen.getAllByLabelText('Read saved reflection')[1]!);
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/cycle-reflection',
    params: { cycleId: 'older-complete' },
  });
  expect(mockLatest).toHaveBeenCalledTimes(1);
  expect(mockAppend).not.toHaveBeenCalled();
});

test.each(['newer-cycle', 'active', 'different-version', 'foreign-owner'])(
  'fresh review identity mismatch refuses another cycle: %s',
  async (change) => {
    mockStatus = 'complete';
    mockSelection = mockCycle.id;
    const screen = await render(<CycleScreen />);
    await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
    mockLatest.mockResolvedValueOnce({
      ...mockCycle,
      userId: change === 'foreign-owner' ? 'other' : mockOwner,
      id: change === 'newer-cycle' ? 'newer' : mockCycle.id,
      status: change === 'active' ? 'active' : 'complete',
      programVersionId: change === 'different-version' ? 'new-version' : mockCycle.programVersionId,
    });
    await fireEvent.press(screen.getByLabelText('Open six-week review'));
    await waitFor(() => expect(screen.getByText(/latest cycle changed/)).toBeTruthy());
    expect(router.push).not.toHaveBeenCalled();
  },
);

test.each(['owner', 'database', 'selection', 'blur'])(
  'pending review navigation cannot survive changed context: %s',
  async (change) => {
    mockStatus = 'complete';
    mockSelection = mockCycle.id;
    const screen = await render(<CycleScreen />);
    await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
    const retained = mockButtonHandlers.get('Open six-week review')!;
    let release!: (value: unknown) => void;
    mockLatest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    await act(async () => retained());
    const originalDb = mockDb;
    if (change === 'owner') mockOwner = 'other';
    if (change === 'database') mockDb = {};
    if (change === 'selection') mockSelection = 'older-complete';
    if (change === 'blur') await act(async () => mockBlur?.());
    else await screen.rerender(<CycleScreen />);
    const callsAfterChange = mockLatest.mock.calls.length;
    await act(async () => {
      retained();
      release({ ...mockCycle, userId: 'guest-user', status: 'complete' });
    });
    expect(router.push).not.toHaveBeenCalled();
    expect(mockLatest).toHaveBeenCalledTimes(callsAfterChange);
    expect(mockLatest.mock.calls[1]).toEqual([originalDb, 'guest-user']);
  },
);
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
