import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import CycleReviewScreen from '../../app/review';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
import type { CycleHandoverRequest } from '../domain/cycleHandover';
let mockDb = {};
let mockOwner = 'guest-user';
let mockStatus = 'complete';
let mockParams: { expectedCycleId?: unknown; expectedProgramVersionId?: unknown } = {};
const mockLatest = jest.fn(),
  mockReadProgram = jest.fn();
const mockBlurCallbacks = new Set<() => void>();
let mockRecovery: unknown = null;
const mockPrepare = jest.fn(),
  mockConfirm = jest.fn(),
  mockSave = jest.fn();
let mockRequest: CycleHandoverRequest;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      const cleanup = callback();
      if (typeof cleanup === 'function') mockBlurCallbacks.add(cleanup);
      return () => {
        if (typeof cleanup === 'function') {
          mockBlurCallbacks.delete(cleanup);
          cleanup();
        }
      };
    }, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../services/AppServicesProvider', () => ({ useAppServices: () => ({ analytics: {} }) }));
jest.mock('../services/analytics', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('../db/cycleRepository', () => ({
  getLatestTrainingCycle: (...args: unknown[]) => mockLatest(...args),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: (...args: unknown[]) => mockReadProgram(...args),
}));
jest.mock('../db/personalGoalRepository', () => ({
  getPersonalGoal: async () => ({ blockObjective: 'My goal' }),
}));
jest.mock('../db/cycleReviewRepository', () => ({
  getCycleReview: async () => null,
  saveCycleReview: (...args: unknown[]) => mockSave(...args),
}));
jest.mock('../db/progressRepository', () => ({
  getCycleProgressSummary: async () => ({
    facts: {
      completedWorkoutCount: 1,
      completionRate: 1,
      totalTrainingVolume: 100,
      completedTrainingDays: 1,
      readinessCounts: { ready: 1, limited: 0, rest: 0 },
    },
    loggedSetCount: 1,
  }),
}));
jest.mock('../db/cycleHandoverRepository', () => ({
  prepareCycleHandover: (...args: unknown[]) => mockPrepare(...args),
  confirmCycleHandover: (...args: unknown[]) => mockConfirm(...args),
  getCycleHandoverReceipt: async () => mockRecovery,
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockLatest
    .mockReset()
    .mockImplementation(async () => ({ ...mockCycle, status: mockStatus, userId: mockOwner }));
  mockReadProgram.mockReset().mockResolvedValue({ program: mockProgram, version: mockVersion });
  mockBlurCallbacks.clear();
  mockDb = {};
  mockOwner = 'guest-user';
  mockStatus = 'complete';
  mockRecovery = null;
  mockPrepare.mockImplementation(async (_db, owner, _cycle, options) => {
    mockRequest = {
      ...options,
      userId: owner,
      source: {
        cycle: mockCycle,
        program: mockProgram,
        version: mockVersion,
        goal: {
          blockObjective: 'My goal',
          target: 10,
          protocol: {
            metric: 'reps',
            canonicalUnit: 'reps',
            equipmentSetup: 'Dumbbells',
            assistance: 'none',
          },
        },
      },
    };
    return mockRequest;
  });
  mockConfirm.mockImplementation(async (_db, _owner, request) => ({
    request,
    confirmedAt: request.preparedAt,
  }));
});
test.each(['newer-cycle', 'changed-version'])(
  'bound destination rejects changed latest identity before private reads: %s',
  async (change) => {
    mockParams = {
      expectedCycleId: mockCycle.id,
      expectedProgramVersionId: mockCycle.programVersionId,
    };
    mockLatest.mockResolvedValue({
      ...mockCycle,
      userId: mockOwner,
      status: 'complete',
      id: change === 'newer-cycle' ? 'newer-cycle' : mockCycle.id,
      programVersionId:
        change === 'changed-version' ? 'changed-version' : mockCycle.programVersionId,
    });
    const screen = await render(<CycleReviewScreen />);
    await waitFor(() =>
      expect(
        screen.getByText(
          'The selected cycle changed. Return to its cycle or Progress to open a fresh review.',
        ),
      ).toBeTruthy(),
    );
    expect(mockReadProgram).not.toHaveBeenCalled();
    expect(mockPrepare).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  },
);

test.each([
  { expectedCycleId: mockCycle.id },
  { expectedProgramVersionId: mockCycle.programVersionId },
  { expectedCycleId: [mockCycle.id], expectedProgramVersionId: mockCycle.programVersionId },
  { expectedCycleId: mockCycle.id, expectedProgramVersionId: [mockCycle.programVersionId] },
  { expectedCycleId: '', expectedProgramVersionId: mockCycle.programVersionId },
])('invalid partial or array review binding fails closed (%p)', async (params) => {
  mockParams = params;
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() =>
    expect(
      screen.getByText(
        'This review link is invalid. Return to its cycle or Progress to open a fresh review.',
      ),
    ).toBeTruthy(),
  );
  expect(mockLatest).not.toHaveBeenCalled();
  expect(mockReadProgram).not.toHaveBeenCalled();
  expect(mockPrepare).not.toHaveBeenCalled();
});

test('matching paired destination binding retains explicit preview without saving', async () => {
  mockParams = {
    expectedCycleId: mockCycle.id,
    expectedProgramVersionId: mockCycle.programVersionId,
  };
  await preview();
  expect(mockPrepare).toHaveBeenCalledTimes(1);
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});

test.each(['route', 'owner', 'database'])(
  'delayed reflection result cannot mark the new context saved (%s)',
  async (change) => {
    let release!: () => void;
    mockSave.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const screen = await render(<CycleReviewScreen />);
    await waitFor(() => expect(screen.getByLabelText('Save reflection')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Save reflection'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    const committedRecord = mockSave.mock.calls[0]![1];
    if (change === 'route')
      mockParams = {
        expectedCycleId: mockCycle.id,
        expectedProgramVersionId: mockCycle.programVersionId,
      };
    if (change === 'owner') mockOwner = 'new-owner';
    if (change === 'database') mockDb = {};
    await screen.rerender(<CycleReviewScreen />);
    await waitFor(() => expect(screen.getByLabelText('Save reflection')).not.toBeDisabled());
    await act(async () => release());
    expect(screen.queryByLabelText('Reflection saved')).toBeNull();
    expect(screen.getByLabelText('Save reflection')).not.toBeDisabled();
    expect(committedRecord.userId).toBe('guest-user');
    expect(committedRecord.cycleId).toBe(mockCycle.id);
  },
);

test.each(['Adjust a private copy', 'Build a progression copy'])(
  'delayed %s save cannot navigate an obsolete builder after route change',
  async (label) => {
    let release!: () => void;
    mockSave.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const screen = await render(<CycleReviewScreen />);
    await waitFor(() => expect(screen.getByLabelText(label)).toBeTruthy());
    await fireEvent.press(screen.getByLabelText(label));
    expect(mockSave).toHaveBeenCalledTimes(1);
    mockParams = {
      expectedCycleId: mockCycle.id,
      expectedProgramVersionId: mockCycle.programVersionId,
    };
    await screen.rerender(<CycleReviewScreen />);
    await waitFor(() => expect(screen.getByLabelText(label)).not.toBeDisabled());
    await act(async () => release());
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Reflection saved')).toBeNull();
  },
);

test('obsolete reflection rejection cannot display its error in the new route context', async () => {
  let rejectOld!: (error: Error) => void;
  mockSave.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, reject) => {
        rejectOld = reject;
      }),
  );
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save reflection')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Save reflection'));
  mockParams = {
    expectedCycleId: mockCycle.id,
    expectedProgramVersionId: mockCycle.programVersionId,
  };
  await screen.rerender(<CycleReviewScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save reflection')).not.toBeDisabled());
  await act(async () => rejectOld(new Error('Obsolete reflection failure')));
  expect(screen.queryByText('Obsolete reflection failure')).toBeNull();
  expect(screen.getByLabelText('Save reflection')).not.toBeDisabled();
});

test('obsolete save finally cannot release a new context pending reflection save', async () => {
  let releaseOld!: () => void, releaseNew!: () => void;
  mockSave
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseOld = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseNew = resolve;
        }),
    );
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save reflection')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Save reflection'));
  mockOwner = 'new-owner';
  await screen.rerender(<CycleReviewScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save reflection')).not.toBeDisabled());
  await fireEvent.press(screen.getByLabelText('Save reflection'));
  expect(mockSave).toHaveBeenCalledTimes(2);
  expect(mockSave.mock.calls[0]![1].userId).toBe('guest-user');
  expect(mockSave.mock.calls[1]![1].userId).toBe('new-owner');
  await act(async () => releaseOld());
  expect(screen.getByLabelText('Save reflection')).toBeDisabled();
  expect(screen.queryByLabelText('Reflection saved')).toBeNull();
  await act(async () => releaseNew());
  expect(screen.getByLabelText('Reflection saved')).toBeTruthy();
});

test('a destination binding change clears the old private preview and prevents confirmation', async () => {
  mockParams = {
    expectedCycleId: mockCycle.id,
    expectedProgramVersionId: mockCycle.programVersionId,
  };
  const screen = await preview();
  mockParams = {
    expectedCycleId: 'newer-cycle',
    expectedProgramVersionId: mockCycle.programVersionId,
  };
  await screen.rerender(<CycleReviewScreen />);
  await waitFor(() => expect(screen.getByText(/The selected cycle changed/)).toBeTruthy());
  expect(screen.queryByText('Confirm new cycle')).toBeNull();
  expect(screen.queryByText(/My goal/)).toBeNull();
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});

test('pending handover cannot save or display a receipt after the destination binding changes', async () => {
  mockParams = {
    expectedCycleId: mockCycle.id,
    expectedProgramVersionId: mockCycle.programVersionId,
  };
  let release!: (value: unknown) => void;
  mockConfirm.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const screen = await preview();
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  const guards = mockConfirm.mock.calls[0]![3];
  mockParams = {
    expectedCycleId: 'newer-cycle',
    expectedProgramVersionId: mockCycle.programVersionId,
  };
  await screen.rerender(<CycleReviewScreen />);
  expect(guards.isOwnerCurrent()).toBe(false);
  expect(guards.isContextCurrent()).toBe(false);
  await act(async () => release({ request: mockRequest, confirmedAt: mockRequest.preparedAt }));
  expect(screen.queryByText('Open new cycle')).toBeNull();
  expect(mockSave).not.toHaveBeenCalled();
});
async function preview(choice = 'Start without a new personal goal') {
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() => expect(screen.getByText(choice)).toBeTruthy());
  await fireEvent.press(screen.getByText(choice));
  await fireEvent.press(screen.getByText('Start a new cycle with these targets'));
  await waitFor(() => expect(screen.getByText('Confirm new cycle')).toBeTruthy());
  return screen;
}
test('explicit no-goal preview and cancellation never save reflection or cycle', async () => {
  const screen = await preview();
  expect(mockRequest.choice).toBe('without-goal');
  expect(mockRequest.destination.goalId).toBeNull();
  expect(screen.getByText(/Nothing changes until you confirm/)).toBeTruthy();
  expect(screen.queryByText(new RegExp(mockRequest.destination.cycleId))).toBeNull();
  expect(screen.getByText(/New private cycle starting/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Cancel new cycle'));
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});
test('carry goal confirmation uses one atomic request and independent open action', async () => {
  const screen = await preview('Carry personal goal into a new block');
  expect(mockRequest.choice).toBe('continue-goal');
  expect(screen.getByText(/baseline is deferred/)).toBeTruthy();
  expect(screen.getByText(/Saved target: 10 reps/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  await waitFor(() => expect(screen.getByText('Open new cycle')).toBeTruthy());
  expect(mockSave).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(mockConfirm.mock.calls[0]![3].isOwnerCurrent()).toBe(true);
  await fireEvent.press(screen.getByText('Open new cycle'));
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/cycle',
    params: { cycleId: mockRequest.destination.cycleId },
  });
});
test('interrupted confirmation retries the exact frozen operation without preparation', async () => {
  mockConfirm.mockRejectedValueOnce(new Error('Readback interrupted'));
  const screen = await preview();
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  await waitFor(() => expect(screen.getByText('Readback interrupted')).toBeTruthy());
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  await waitFor(() => expect(screen.getByText('Open new cycle')).toBeTruthy());
  expect(mockPrepare).toHaveBeenCalledTimes(1);
  expect(mockConfirm.mock.calls[0]![2]).toBe(mockConfirm.mock.calls[1]![2]);
});
test('owner change hides prior preview and invalidates captured mutation guards', async () => {
  let release: ((value: unknown) => void) | undefined;
  mockConfirm.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const screen = await preview();
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  const guards = mockConfirm.mock.calls[0]![3];
  mockOwner = 'another-person';
  await screen.rerender(<CycleReviewScreen />);
  expect(guards.isOwnerCurrent()).toBe(false);
  expect(guards.isContextCurrent()).toBe(false);
  expect(screen.queryByText('Confirm new cycle')).toBeNull();
  await act(async () => release?.({ request: mockRequest, confirmedAt: mockRequest.preparedAt }));
  expect(screen.queryByText('Open new cycle')).toBeNull();
});
test('fresh active destination reload recovers its persisted receipt', async () => {
  const screen = await preview();
  await screen.unmount();
  mockStatus = 'active';
  mockRecovery = { request: mockRequest, confirmedAt: mockRequest.preparedAt };
  const fresh = await render(<CycleReviewScreen />);
  await waitFor(() => expect(fresh.getByText('Open new cycle')).toBeTruthy());
  expect(mockConfirm).not.toHaveBeenCalled();
});

test('changed reflection leaves the frozen request intact and invalidates context guard', async () => {
  const screen = await preview();
  const input = screen.getByLabelText('Optional cycle reflection');
  await fireEvent.changeText(input, 'A changed reflection');
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  expect(mockConfirm.mock.calls[0]![3].isContextCurrent()).toBe(false);
  expect(mockConfirm.mock.calls[0]![2]).toBe(mockRequest);
});

test('a completed destination can prepare its own next block instead of showing its incoming receipt', async () => {
  const screen = await preview();
  await screen.unmount();
  mockRecovery = {
    request: {
      ...mockRequest,
      source: { ...mockRequest.source, cycle: { ...mockRequest.source.cycle, id: 'older-source' } },
    },
    confirmedAt: mockRequest.preparedAt,
  };
  const fresh = await render(<CycleReviewScreen />);
  await waitFor(() => expect(fresh.getByText('Start without a new personal goal')).toBeTruthy());
  expect(fresh.queryByText('Open new cycle')).toBeNull();
});

test('database replacement invalidates pending confirmation owner and source guards', async () => {
  let release: ((value: unknown) => void) | undefined;
  mockConfirm.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const screen = await preview();
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  const guards = mockConfirm.mock.calls[0]![3];
  mockDb = {};
  await screen.rerender(<CycleReviewScreen />);
  expect(guards.isOwnerCurrent()).toBe(false);
  expect(guards.isContextCurrent()).toBe(false);
  await act(async () => release?.({ request: mockRequest, confirmedAt: mockRequest.preparedAt }));
  expect(screen.queryByText('Open new cycle')).toBeNull();
});

test('blur invalidates a frozen preview without changing its retry identity', async () => {
  const screen = await preview();
  await act(async () => {
    for (const cleanup of mockBlurCallbacks) cleanup();
  });
  await fireEvent.press(screen.getByText('Confirm new cycle'));
  expect(mockConfirm.mock.calls[0]![3].isContextCurrent()).toBe(false);
  expect(mockConfirm.mock.calls[0]![2]).toBe(mockRequest);
});
