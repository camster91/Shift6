import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import ProgressScreen from '../../app/(tabs)/progress';
import {
  demoCycle as mockCycle,
  demoProgram as mockProgram,
  demoProgramVersion,
  demoUser as mockUser,
} from '../domain/fixtures/home';
import { createCustomExercise } from '../domain/programBuilder';
import { buildCycleProgressSummary } from '../domain/progression';
import type { CompletedSet, ProgramVersion } from '../domain/types';

const mockDatabase = {};
const mockVersion: ProgramVersion = {
  ...demoProgramVersion,
  progressionRuleIds: [],
  workouts: [
    {
      ...demoProgramVersion.workouts[0]!,
      exercises: ['kg', 'lb'].map((unit, index) => ({
        ...demoProgramVersion.workouts[0]!.exercises[0]!,
        id: `owned-occurrence-${unit}`,
        exerciseId: `program-blank-guest-user-1791918797497-custom-exercise-${index + 2}`,
        sets: [
          {
            id: `set-${unit}`,
            setNumber: 1,
            restSeconds: 0,
            target: {
              reps: 5,
              load: { value: unit === 'kg' ? 40 : 90, unit: unit === 'kg' ? 'metric' : 'imperial' },
            },
          },
        ],
      })),
    },
  ],
};
const mockOwnedExercises = mockVersion.workouts[0]!.exercises.map((movement, index) =>
  createCustomExercise({
    id: movement.exerciseId,
    name: index === 0 ? 'QA KG' : 'QA LB',
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    equipmentIds: ['equipment-bodyweight'],
    trackingType: 'reps',
  }),
);
const mockCompleted: CompletedSet[] = mockVersion.workouts[0]!.exercises.map((movement, index) => ({
  id: `actual-${index}`,
  sessionId: 'owned-session',
  workoutExerciseId: movement.id,
  exerciseId: movement.exerciseId,
  setNumber: 1,
  reps: 5,
  load: index === 0 ? 40 : 90,
  loadUnit: index === 0 ? 'kg' : 'lb',
  completedAt: '2026-10-13T12:00:00.000Z',
  idempotencyKey: `actual-${index}`,
}));
const mockEmptySummary = buildCycleProgressSummary(6, []);
let mockSummary = mockEmptySummary;
let mockOwner = 'guest-user';
let mockFocusCleanup: (() => void) | void;
let mockFocusCallback: (() => (() => void) | void) | undefined;
const mockLatestCycle = jest.fn();
const mockGetSummary = jest.fn();
const mockGetExercise = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => (() => void) | void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocusCallback = callback;
      mockFocusCleanup = callback();
      return mockFocusCleanup;
    }, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../db/cycleRepository', () => ({
  getLatestTrainingCycle: (...args: unknown[]) => mockLatestCycle(...args),
  getPreviousTrainingCycle: async () => null,
}));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: async () => ({ user: mockUser }),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
  getUserExercises: jest.fn(async () => mockOwnedExercises),
}));
jest.mock('../db/progressRepository', () => ({
  getCycleProgressSummary: (...args: unknown[]) => mockGetSummary(...args),
  getLatestCompletedWorkoutSets: async () => mockCompleted,
  getExerciseProgress: (...args: unknown[]) => mockGetExercise(...args),
  getCycleCompletedSetRecords: async () => [],
  getCycleCardioRecords: async () => [],
}));

beforeEach(() => {
  mockOwner = 'guest-user';
  mockSummary = { ...mockEmptySummary, loggedSetCount: 1 };
  mockLatestCycle.mockReset().mockImplementation(async () => ({ ...mockCycle, userId: mockOwner }));
  mockGetSummary.mockReset().mockImplementation(async () => mockSummary);
  mockGetExercise.mockReset().mockResolvedValue(null);
});

function refocus() {
  mockFocusCleanup?.();
  mockFocusCleanup = mockFocusCallback?.();
}
function completedSummary() {
  return {
    ...mockEmptySummary,
    loggedSetCount: 2,
    facts: { ...mockEmptySummary.facts, completedWorkoutCount: 1, totalTrainingVolume: 552 },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('next-session targets use owned custom movement names already used by movement trends', async () => {
  const screen = await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('NEXT SESSION TARGETS')).toBeTruthy());
  expect(screen.getByLabelText('QA KG')).toBeTruthy();
  expect(screen.getByLabelText('QA LB')).toBeTruthy();
  expect(screen.getAllByText('QA KG').length).toBeGreaterThan(0);
  expect(screen.getAllByText('QA LB').length).toBeGreaterThan(0);
  expect(screen.queryByText(/Program Blank Guest User .* Custom Exercise/)).toBeNull();
  expect(screen.getByText('45 kg · 5 reps')).toBeTruthy();
  expect(screen.getByText('95 lb · 5 reps')).toBeTruthy();
});

test('returning to mounted Progress after workout completion reloads saved counts and volume', async () => {
  const screen = await render(<ProgressScreen />);
  await waitFor(() =>
    expect(
      screen.getByText('Your first completed sessions will populate this cycle scorecard.'),
    ).toBeTruthy(),
  );
  const priorTwos = screen.queryAllByText('2').length;
  mockSummary = completedSummary();
  await act(async () => refocus());
  await waitFor(() =>
    expect(screen.getByText('1 completed workout are reflected from local records.')).toBeTruthy(),
  );
  expect(screen.getByText('552')).toBeTruthy();
  expect(screen.getAllByText('2')).toHaveLength(priorTwos + 1);
  expect(
    screen.queryByText('Your first completed sessions will populate this cycle scorecard.'),
  ).toBeNull();
  expect(mockLatestCycle).toHaveBeenCalledTimes(2);
  expect(mockGetSummary).toHaveBeenCalledTimes(2);
});

test('obsolete focus refresh resolving after a newer refresh cannot replace current evidence', async () => {
  const old = deferred<typeof mockEmptySummary>();
  mockGetSummary.mockImplementationOnce(() => old.promise);
  const screen = await render(<ProgressScreen />);
  await waitFor(() => expect(mockGetSummary).toHaveBeenCalledTimes(1));
  mockSummary = completedSummary();
  await act(async () => refocus());
  await waitFor(() => expect(screen.getByText('552')).toBeTruthy());
  await act(async () => old.resolve(mockEmptySummary));
  expect(screen.getByText('552')).toBeTruthy();
  expect(screen.getByText('1 completed workout are reflected from local records.')).toBeTruthy();
});

test('old owner refresh resolving after an identity change cannot display private old-owner data', async () => {
  const old = deferred<typeof mockEmptySummary>();
  mockGetSummary.mockImplementationOnce(() => old.promise);
  const screen = await render(<ProgressScreen />);
  await waitFor(() => expect(mockGetSummary).toHaveBeenCalledTimes(1));
  mockOwner = 'new-owner';
  mockLatestCycle.mockResolvedValue(null);
  await screen.rerender(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('Progress unavailable')).toBeTruthy());
  await act(async () => old.resolve(completedSummary()));
  expect(screen.getByText('Progress unavailable')).toBeTruthy();
  expect(screen.queryByText('552')).toBeNull();
  expect(screen.queryByText(mockProgram.title.toUpperCase())).toBeNull();
});

test('unexpected cycle ownership is rejected before private program reads', async () => {
  mockLatestCycle.mockResolvedValue({ ...mockCycle, userId: 'another-owner' });
  const screen = await render(<ProgressScreen />);
  await waitFor(() =>
    expect(screen.getByText('We could not load local cycle progress.')).toBeTruthy(),
  );
  expect(mockGetSummary).not.toHaveBeenCalled();
});

test('obsolete movement error after a focus refresh cannot overwrite fresh evidence or show an error', async () => {
  const screen = await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByLabelText('QA LB')).toBeTruthy());
  let rejectOld!: (reason: Error) => void;
  mockGetExercise.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectOld = reject;
      }),
  );
  fireEvent.press(screen.getByLabelText('QA LB'));
  await waitFor(() => expect(mockGetExercise).toHaveBeenCalledTimes(2));
  mockSummary = completedSummary();
  await act(async () => refocus());
  await waitFor(() => expect(screen.getByText('552')).toBeTruthy());
  await act(async () => rejectOld(new Error('old request')));
  expect(screen.queryByText('We could not load this movement trend.')).toBeNull();
  expect(screen.getByText('552')).toBeTruthy();
});

test('obsolete movement success cannot replace the newly focused movement trend', async () => {
  const screen = await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByLabelText('QA LB')).toBeTruthy());
  const movementId = mockOwnedExercises[1]!.id;
  const trend = (reps: number) => ({
    exerciseId: movementId,
    personalRecords: [],
    points: [
      {
        sessionId: 'session-trend',
        exerciseId: movementId,
        completedAt: '2026-10-13T12:00:00.000Z',
        volume: 0,
        bestReps: reps,
      },
    ],
  });
  const old = deferred<ReturnType<typeof trend>>();
  mockGetExercise.mockImplementationOnce(() => old.promise).mockResolvedValue(trend(8));
  fireEvent.press(screen.getByLabelText('QA LB'));
  await waitFor(() => expect(mockGetExercise).toHaveBeenCalledTimes(2));
  await act(async () => refocus());
  await waitFor(() => expect(screen.getByText('Latest: 8 reps')).toBeTruthy());
  await act(async () => old.resolve(trend(99)));
  expect(screen.getByText('Latest: 8 reps')).toBeTruthy();
  expect(screen.queryByText('Latest: 99 reps')).toBeNull();
});
