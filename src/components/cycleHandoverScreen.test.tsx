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
const mockBlurCallbacks = new Set<() => void>();
let mockRecovery: unknown = null;
const mockPrepare = jest.fn(),
  mockConfirm = jest.fn(),
  mockSave = jest.fn();
let mockRequest: CycleHandoverRequest;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
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
  getLatestTrainingCycle: async () => ({ ...mockCycle, status: mockStatus, userId: mockOwner }),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
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
