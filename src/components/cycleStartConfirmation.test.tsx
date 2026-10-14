import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import ProgramDetailScreen from '../../app/program';
import CycleReviewScreen from '../../app/review';
import type { ButtonProps } from './ui/Button';
import type { CycleHandoverRequest } from '../domain/cycleHandover';
import { programLibrary } from '../domain/programLibrary';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
const mockDb = {},
  mockStart = jest.fn(),
  mockSaveVersion = jest.fn(),
  mockSaveReview = jest.fn(),
  mockPrepareHandover = jest.fn(),
  mockConfirmHandover = jest.fn();
let mockGate = true;
let mockOwner = 'guest-user';
let mockFocusCleanup: (() => void) | void;
let mockFocusCallback: (() => (() => void) | void) | undefined;
const mockFocusEntries = new Map<() => (() => void) | void, (() => void) | void>();
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
  useFocusEffect: (callback: () => (() => void) | void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocusCallback = callback;
      const cleanup = callback();
      mockFocusCleanup = cleanup;
      mockFocusEntries.set(callback, cleanup);
      return () => {
        mockFocusEntries.delete(callback);
        cleanup?.();
      };
    }, [callback]);
  },
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({
    programId: jest.requireActual('../domain/programLibrary').programLibrary[0].program.id,
  }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../domain/runtimeContentGates', () => ({
  isProgramStartAllowed: () => mockGate,
  getProgramRuntimeStatusLabel: () => 'Synthetic test gate',
}));
jest.mock('../db/cycleRepository', () => ({
  getLatestTrainingCycle: async () => ({
    ...mockCycle,
    userId: mockOwner,
    currentWeek: 6,
    status: 'complete',
  }),
  saveTrainingCycleWithSchedule: (...args: unknown[]) => mockStart(...args),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({
    program: { ...mockProgram, ownerId: mockOwner, isTemplate: false },
    version: mockVersion,
  }),
  saveProgramVersion: (...args: unknown[]) => mockSaveVersion(...args),
}));
jest.mock('../db/cycleReviewRepository', () => ({
  getCycleReview: async () => null,
  saveCycleReview: (...args: unknown[]) => mockSaveReview(...args),
}));
jest.mock('../db/progressRepository', () => ({
  getCycleProgressSummary: async () =>
    jest.requireActual('../domain/progression').buildCycleProgressSummary(18, []),
}));

jest.mock('../db/personalGoalRepository', () => ({ getPersonalGoal: async () => null }));
jest.mock('../db/cycleHandoverRepository', () => ({
  getCycleHandoverReceipt: async () => null,
  prepareCycleHandover: (...args: unknown[]) => mockPrepareHandover(...args),
  confirmCycleHandover: (...args: unknown[]) => mockConfirmHandover(...args),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockButtonHandlers.clear();
  mockFocusEntries.clear();
  mockGate = true;
  mockOwner = 'guest-user';
  mockStart.mockResolvedValue(undefined);
  mockSaveVersion.mockResolvedValue(undefined);
  mockSaveReview.mockResolvedValue(undefined);
  mockPrepareHandover.mockImplementation(async (_db, owner, _cycle, options) => ({
    ...options,
    userId: owner,
    source: {
      cycle: { ...mockCycle, userId: owner, currentWeek: 6, status: 'complete' },
      program: mockProgram,
      version: mockVersion,
      goal: null,
    },
  }));
  mockConfirmHandover.mockImplementation(async (_db, _owner, request) => ({
    request,
    confirmedAt: request.preparedAt,
  }));
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());
test('catalogue Start preview freezes timezone/date and Cancel does not save a private copy or cycle', async () => {
  const screen = await render(<ProgramDetailScreen />);
  await fireEvent.press(screen.getByLabelText('Start six-week cycle'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Start a new six-week cycle?',
    expect.stringContaining(Intl.DateTimeFormat().resolvedOptions().timeZone),
    expect.any(Array),
  );
  const choices = jest.mocked(Alert.alert).mock.calls[0]![2]!;
  await act(async () => choices.find((choice) => choice.text === 'Cancel')?.onPress?.());
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockSaveVersion).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Start six-week cycle'));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[1]![2]!.find((choice) => choice.text === 'Start cycle')
      ?.onPress?.(),
  );
  await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
  expect(mockStart.mock.calls[0]![1]).toMatchObject({ userId: 'guest-user', currentWeek: 1 });
  expect(mockStart.mock.calls[0]![2].workouts.length).toBe(
    programLibrary[0]!.version!.workouts.length,
  );
});
test('qualified-public-content gate is rechecked when the catalogue Start is confirmed', async () => {
  const screen = await render(<ProgramDetailScreen />);
  await fireEvent.press(screen.getByLabelText('Start six-week cycle'));
  mockGate = false;
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]![2]!.find((choice) => choice.text === 'Start cycle')
      ?.onPress?.(),
  );
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockSaveVersion).not.toHaveBeenCalled();
});
test('owner change after catalogue preview prevents the old confirmation from writing', async () => {
  const screen = await render(<ProgramDetailScreen />);
  await fireEvent.press(screen.getByLabelText('Start six-week cycle'));
  const choices = jest.mocked(Alert.alert).mock.calls[0]![2]!;
  mockOwner = 'other-owner';
  await screen.rerender(<ProgramDetailScreen />);
  await act(async () => choices.find((choice) => choice.text === 'Start cycle')?.onPress?.());
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockSaveVersion).not.toHaveBeenCalled();
});
test('blur and return to the same owner permanently invalidates the old Start preview', async () => {
  const screen = await render(<ProgramDetailScreen />);
  await fireEvent.press(screen.getByLabelText('Start six-week cycle'));
  const choices = jest.mocked(Alert.alert).mock.calls[0]![2]!;
  await act(async () => {
    mockFocusCleanup?.();
    mockFocusCallback?.();
  });
  await act(async () => choices.find((choice) => choice.text === 'Start cycle')?.onPress?.());
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockSaveVersion).not.toHaveBeenCalled();
});
async function prepareReview(screen: Awaited<ReturnType<typeof render>>) {
  await waitFor(() =>
    expect(screen.getByLabelText('Start a new cycle with these targets')).toBeTruthy(),
  );
  await fireEvent.press(screen.getByLabelText('Start without a new personal goal'));
  await fireEvent.press(screen.getByLabelText('Start a new cycle with these targets'));
  await waitFor(() => expect(screen.getByLabelText('Confirm new cycle')).toBeTruthy());
}
async function blurAndReturnReview() {
  await act(async () => {
    for (const cleanup of mockFocusEntries.values()) cleanup?.();
    for (const callback of mockFocusEntries.keys()) mockFocusEntries.set(callback, callback());
  });
}

test('pending-session preparation refusal is visible in a native alert and preserves the inline reason', async () => {
  mockPrepareHandover.mockRejectedValueOnce(
    new Error('Finish or save pending sessions before handover.'),
  );
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() =>
    expect(screen.getByLabelText('Start without a new personal goal')).toBeTruthy(),
  );
  await fireEvent.press(screen.getByLabelText('Start without a new personal goal'));
  await fireEvent.press(screen.getByLabelText('Start a new cycle with these targets'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'New cycle not prepared',
      'Finish the unfinished workout, or end it with Save partial or Skip before starting a new cycle. Pausing saves its draft and keeps it unfinished.',
      [{ text: 'OK' }],
    ),
  );
  expect(screen.getByText(/Pausing saves its draft/)).toBeTruthy();
  expect(mockConfirmHandover).not.toHaveBeenCalled();
  expect(mockSaveReview).not.toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
});

test('confirmation failure alerts without changing the exact retry request', async () => {
  mockConfirmHandover.mockRejectedValueOnce(new Error('Confirmation readback interrupted'));
  const screen = await render(<CycleReviewScreen />);
  await prepareReview(screen);
  await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      'New cycle confirmation needs attention',
      'Confirmation readback interrupted',
      [{ text: 'OK' }],
    ),
  );
  const request = mockConfirmHandover.mock.calls[0]![2];
  expect(screen.getByText('Confirmation readback interrupted')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
  await waitFor(() => expect(screen.getByLabelText('Open new cycle')).toBeTruthy());
  expect(mockConfirmHandover.mock.calls[1]![2]).toBe(request);
  expect(mockPrepareHandover).toHaveBeenCalledTimes(1);
});

test('retained confirmation invoked after blur cannot raise an inactive-screen alert', async () => {
  mockConfirmHandover.mockRejectedValueOnce(new Error('Review focus changed'));
  const screen = await render(<CycleReviewScreen />);
  await prepareReview(screen);
  const retained = mockButtonHandlers.get('Confirm new cycle')!;
  await act(async () => {
    for (const cleanup of mockFocusEntries.values()) cleanup?.();
  });
  await act(async () => retained());
  await waitFor(() => expect(mockConfirmHandover).toHaveBeenCalledTimes(1));
  expect(mockConfirmHandover.mock.calls[0]![3].isContextCurrent()).toBe(false);
  expect(Alert.alert).not.toHaveBeenCalled();
});

test.each(['prepare', 'confirm'] as const)(
  'obsolete %s refusal cannot alert after focus has returned to a fresh review',
  async (phase) => {
    let reject!: (error: Error) => void;
    const deferred = () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      });
    if (phase === 'prepare') mockPrepareHandover.mockImplementationOnce(deferred);
    else mockConfirmHandover.mockImplementationOnce(deferred);
    const screen = await render(<CycleReviewScreen />);
    if (phase === 'confirm') {
      await prepareReview(screen);
      await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
    } else {
      await waitFor(() =>
        expect(screen.getByLabelText('Start without a new personal goal')).toBeTruthy(),
      );
      await fireEvent.press(screen.getByLabelText('Start without a new personal goal'));
      await fireEvent.press(screen.getByLabelText('Start a new cycle with these targets'));
    }
    await waitFor(() => expect(reject).toBeDefined());
    await blurAndReturnReview();
    await act(async () => reject(new Error('Obsolete private refusal')));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(screen.queryByText('Obsolete private refusal')).toBeNull();
    expect(screen.queryByLabelText('Confirm new cycle')).toBeNull();
  },
);
test('review explicitly previews an atomic new cycle; Cancel saves no reflection or cycle', async () => {
  const screen = await render(<CycleReviewScreen />);
  await prepareReview(screen);
  expect(screen.getByText(/does not repeat a completed week/)).toBeTruthy();
  expect(
    screen.getByText(new RegExp(Intl.DateTimeFormat().resolvedOptions().timeZone)),
  ).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Cancel new cycle'));
  expect(mockConfirmHandover).not.toHaveBeenCalled();
  expect(mockSaveReview).not.toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
  await prepareReview(screen);
  await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
  await waitFor(() => expect(screen.getByLabelText('Open new cycle')).toBeTruthy());
  const request = mockConfirmHandover.mock.calls[0]![2] as CycleHandoverRequest;
  expect(request.choice).toBe('without-goal');
  expect(request.destination.cycleId).not.toBe(mockCycle.id);
  expect(request.source.version.workouts).toEqual(mockVersion.workouts);
  expect(mockSaveReview).not.toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockSaveVersion).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

test.each([['catalogue', ProgramDetailScreen, 'Start six-week cycle', 'Start cycle']] as const)(
  '%s deferred Start releases its spinner after blur/return without stale navigation',
  async (_name, Component, label, confirmLabel) => {
    let resolve!: () => void;
    mockStart.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const screen = await render(<Component />);
    await waitFor(() => expect(screen.getByLabelText(label)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(label));
    await act(async () =>
      jest
        .mocked(Alert.alert)
        .mock.calls[0]![2]!.find((choice) => choice.text === confirmLabel)
        ?.onPress?.(),
    );
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText(label).props.accessibilityState.busy).toBe(true);
    await act(async () => {
      mockFocusCleanup?.();
      mockFocusCallback?.();
    });

    expect(mockStart.mock.calls[0]![5]()).toBe(false);
    await act(async () => resolve());
    await waitFor(() =>
      expect(screen.getByLabelText(label).props.accessibilityState.busy).toBe(false),
    );
    expect(router.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText(label));
    await act(async () =>
      jest
        .mocked(Alert.alert)
        .mock.calls[1]![2]!.find((choice) => choice.text === confirmLabel)
        ?.onPress?.(),
    );
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(2));
    expect(router.replace).toHaveBeenCalledTimes(1);
  },
);

test('review deferred confirmation releases its spinner after blur/return without a stale receipt', async () => {
  let resolve!: (value: unknown) => void;
  mockConfirmHandover.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const screen = await render(<CycleReviewScreen />);
  await prepareReview(screen);
  await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
  await waitFor(() => expect(mockConfirmHandover).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Confirm new cycle').props.accessibilityState.busy).toBe(true);
  const call = mockConfirmHandover.mock.calls[0]!;
  await blurAndReturnReview();
  expect(call[3].isContextCurrent()).toBe(false);
  await act(async () => resolve({ request: call[2], confirmedAt: call[2].preparedAt }));
  await waitFor(() =>
    expect(
      screen.getByLabelText('Start a new cycle with these targets').props.accessibilityState.busy,
    ).toBe(false),
  );
  expect(screen.queryByLabelText('Open new cycle')).toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
  await prepareReview(screen);
  await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
  await waitFor(() => expect(mockConfirmHandover).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Open new cycle')).toBeTruthy();
  expect(mockSaveReview).not.toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
});

test('obsolete deferred preparation cannot show a preview or block a fresh operation', async () => {
  const prepare = mockPrepareHandover.getMockImplementation()!;
  let resolve!: (value: unknown) => void;
  let pending: unknown;
  mockPrepareHandover.mockImplementationOnce(async (...args) => {
    pending = await prepare(...args);
    return new Promise((done) => {
      resolve = done;
    });
  });
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() =>
    expect(screen.getByLabelText('Start without a new personal goal')).toBeTruthy(),
  );
  await fireEvent.press(screen.getByLabelText('Start without a new personal goal'));
  await fireEvent.press(screen.getByLabelText('Start a new cycle with these targets'));
  await waitFor(() => expect(mockPrepareHandover).toHaveBeenCalledTimes(1));
  expect(
    screen.getByLabelText('Start a new cycle with these targets').props.accessibilityState.busy,
  ).toBe(true);
  await blurAndReturnReview();
  await act(async () => resolve(pending));
  await waitFor(() =>
    expect(
      screen.getByLabelText('Start a new cycle with these targets').props.accessibilityState.busy,
    ).toBe(false),
  );
  expect(screen.queryByLabelText('Confirm new cycle')).toBeNull();
  expect(mockConfirmHandover).not.toHaveBeenCalled();
  expect(mockSaveReview).not.toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
  await prepareReview(screen);
  await fireEvent.press(screen.getByLabelText('Confirm new cycle'));
  await waitFor(() => expect(mockConfirmHandover).toHaveBeenCalledTimes(1));
});
