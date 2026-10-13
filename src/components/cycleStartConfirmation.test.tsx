import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProgramDetailScreen from '../../app/program';
import CycleReviewScreen from '../../app/review';
import { programLibrary } from '../domain/programLibrary';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
const mockDb = {},
  mockStart = jest.fn(),
  mockSaveVersion = jest.fn(),
  mockSaveReview = jest.fn();
let mockGate = true;
let mockOwner = 'guest-user';
let mockFocusCleanup: (() => void) | void;
let mockFocusCallback: (() => (() => void) | void) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => (() => void) | void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocusCallback = callback;
      const cleanup = callback();
      mockFocusCleanup = cleanup;
      return cleanup;
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
beforeEach(() => {
  jest.clearAllMocks();
  mockGate = true;
  mockOwner = 'guest-user';
  mockStart.mockResolvedValue(undefined);
  mockSaveVersion.mockResolvedValue(undefined);
  mockSaveReview.mockResolvedValue(undefined);
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
test('review action explicitly starts a new cycle with the same targets; Cancel does not save reflection or cycle', async () => {
  const screen = await render(<CycleReviewScreen />);
  await waitFor(() =>
    expect(screen.getByLabelText('Start a new cycle with these targets')).toBeTruthy(),
  );
  await fireEvent.press(screen.getByLabelText('Start a new cycle with these targets'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Start a new six-week cycle?',
    expect.stringContaining('does not repeat a completed week'),
    expect.any(Array),
  );
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]![2]!.find((choice) => choice.text === 'Cancel')
      ?.onPress?.(),
  );
  expect(mockSaveReview).not.toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Start a new cycle with these targets'));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[1]![2]!.find((choice) => choice.text === 'Start new cycle')
      ?.onPress?.(),
  );
  await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
  expect(mockStart.mock.calls[0]![1]).toMatchObject({ currentWeek: 1, status: 'active' });
  expect(mockStart.mock.calls[0]![1].id).not.toBe(mockCycle.id);
  expect(
    mockStart.mock.calls[0]![2].workouts.map((workout: (typeof mockVersion.workouts)[number]) =>
      workout.exercises.map((entry) =>
        entry.sets.map(({ setNumber, target, restSeconds }) => ({
          setNumber,
          target,
          restSeconds,
        })),
      ),
    ),
  ).toEqual(
    mockVersion.workouts.map((workout) =>
      workout.exercises.map((entry) =>
        entry.sets.map(({ setNumber, target, restSeconds }) => ({
          setNumber,
          target,
          restSeconds,
        })),
      ),
    ),
  );
});
