import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import CycleScreen from '../../app/cycle';
import type { ButtonProps } from './ui/Button';
import type { ScreenProps } from './ui/Screen';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
let mockDb = {};
let mockOwner = 'guest-user';
let mockStatus = 'active';
const originalWindow = Dimensions.get('window');
const originalScreen = Dimensions.get('screen');
let mockSelection: string | undefined;
let mockOtherActive: string | null = null;
const mockAppend = jest.fn();
const mockRefresh = jest.fn();
const mockLatest = jest.fn();
let mockBlur: (() => void) | undefined;
const mockButtonHandlers = new Map<string, (() => void) | undefined>();
let mockRenderedOrder: string[] = [];
function mockLabels(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(mockLabels);
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (
      node as { props: { label?: string; accessibilityLabel?: string; children?: unknown } }
    ).props;
    return [props.label, props.accessibilityLabel]
      .filter((label): label is string => !!label)
      .concat(mockLabels(props.children));
  }
  return [];
}
jest.mock('./ui', () => {
  const actual = jest.requireActual('./ui'),
    React = jest.requireActual('react');
  return {
    ...actual,
    Button: (props: ButtonProps) => {
      mockButtonHandlers.set(props.label, props.onPress);
      return React.createElement(actual.Button, props);
    },
    Screen: (props: ScreenProps) => {
      mockRenderedOrder = mockLabels(props.children);
      return React.createElement(actual.Screen, props);
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
  mockRenderedOrder = [];
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
afterEach(async () => {
  await act(async () => Dimensions.set({ window: originalWindow, screen: originalScreen }));
  jest.restoreAllMocks();
});

test('large-text preference widens the cycle heading without changing phase, badge, or review navigation', async () => {
  await act(async () =>
    Dimensions.set({
      window: { ...originalWindow, fontScale: 1 },
      screen: { ...originalScreen, fontScale: 1 },
    }),
  );
  mockStatus = 'complete';
  mockSelection = mockCycle.id;
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
  const phase = mockCycle.weeks[mockCycle.currentWeek - 1]!.phase;
  expect(screen.getByText(`${phase} · Ready for review`)).toBeTruthy();
  const badge = screen.getByText(/✓ \d+\/\d+ done/).props.children;
  expect(screen.getByTestId('cycle-heading')).toHaveStyle({ flex: 1 });
  await act(async () =>
    Dimensions.set({
      window: { ...originalWindow, fontScale: 2 },
      screen: { ...originalScreen, fontScale: 2 },
    }),
  );
  expect(screen.getByTestId('cycle-heading')).toHaveStyle({ width: '100%' });
  expect(screen.getByText(`${phase} · Ready for review`)).toBeTruthy();
  expect(screen.getByText(/✓ \d+\/\d+ done/).props.children).toEqual(badge);
  expect(mockLatest).toHaveBeenCalledTimes(1);
  expect(mockAppend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Open six-week review'));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/review',
      params: {
        expectedCycleId: mockCycle.id,
        expectedProgramVersionId: mockCycle.programVersionId,
      },
    }),
  );
  await act(async () =>
    Dimensions.set({
      window: { ...originalWindow, fontScale: 1 },
      screen: { ...originalScreen, fontScale: 1 },
    }),
  );
  expect(screen.getByTestId('cycle-heading')).toHaveStyle({ flex: 1 });
  expect(screen.getByTestId('cycle-heading')).not.toHaveStyle({ width: '100%' });
  expect(mockLatest).toHaveBeenCalledTimes(2);
});

test('selected latest completed cycle opens six-week review after a fresh owned identity read', async () => {
  mockStatus = 'complete';
  mockSelection = mockCycle.id;
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Open six-week review'));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/review',
      params: {
        expectedCycleId: mockCycle.id,
        expectedProgramVersionId: mockCycle.programVersionId,
      },
    }),
  );
  expect(mockLatest).toHaveBeenCalledTimes(2);
  expect(mockLatest).toHaveBeenLastCalledWith(mockDb, 'guest-user');
  expect(mockAppend).not.toHaveBeenCalled();
});

test('latest completed review appears once before the cycle card and timing form', async () => {
  mockStatus = 'complete';
  mockSelection = mockCycle.id;
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
  expect(screen.getAllByLabelText('Open six-week review')).toHaveLength(1);
  expect(mockRenderedOrder).toContain('Current six-week cycle');
  expect(mockRenderedOrder).toContain('Planned review date');
  expect(mockRenderedOrder.indexOf('Open six-week review')).toBeLessThan(
    mockRenderedOrder.indexOf('Current six-week cycle'),
  );
  expect(mockRenderedOrder.indexOf('Open six-week review')).toBeLessThan(
    mockRenderedOrder.indexOf('Planned review date'),
  );
  expect(mockRenderedOrder.indexOf('Open six-week review')).toBeLessThan(
    mockRenderedOrder.indexOf('Read saved reflection'),
  );
});

test('retained review callback invoked only after blur cannot read or navigate', async () => {
  mockStatus = 'complete';
  mockSelection = mockCycle.id;
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getByLabelText('Open six-week review')).toBeTruthy());
  const retained = mockButtonHandlers.get('Open six-week review')!;
  await act(async () => mockBlur?.());
  await act(async () => retained());
  expect(mockLatest).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
});

test('older selected completed cycle reads only its exact saved reflection', async () => {
  mockStatus = 'complete';
  mockSelection = 'older-complete';
  const screen = await render(<CycleScreen />);
  await waitFor(() => expect(screen.getAllByLabelText('Read saved reflection')).toHaveLength(1));
  expect(screen.queryByLabelText('Open six-week review')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Read saved reflection'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/cycle-reflection',
    params: { cycleId: 'older-complete' },
  });
  expect(mockLatest).toHaveBeenCalledTimes(1);
  expect(mockAppend).not.toHaveBeenCalled();
});

test.each(['active', 'paused'])(
  'default %s cycle keeps progress and one history link without an end-of-cycle action',
  async (status) => {
    mockStatus = status;
    const screen = await render(<CycleScreen />);
    await waitFor(() => expect(screen.getByLabelText('Open progress')).toBeTruthy());
    expect(screen.getAllByLabelText('Open progress')).toHaveLength(1);
    expect(screen.getAllByLabelText('Read saved reflection')).toHaveLength(1);
    expect(screen.queryByLabelText('Open six-week review')).toBeNull();
    expect(screen.queryByLabelText('Open cycle review')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Open progress'));
    expect(router.push).toHaveBeenCalledWith('/progress');
    expect(mockAppend).not.toHaveBeenCalled();
  },
);

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
