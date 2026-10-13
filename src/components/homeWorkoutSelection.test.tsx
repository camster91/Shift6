import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '../../app/(tabs)/index';
import { createTrainingCycle } from '../domain/cycle';
import {
  demoProgram as mockProgram,
  demoProgramVersion,
  demoUser as mockUser,
} from '../domain/fixtures/home';
import { selectCoachWorkout } from '../domain/coachCapabilities';
import type { ProgramVersion, TrainingCycle, WorkoutScheduleSession } from '../domain/types';

const mockDatabase = {};
jest.mock('./artwork/ShiftArtwork', () => ({ ShiftArtwork: () => null }));
let mockVersion: ProgramVersion;
let mockCycle: TrainingCycle;
let mockSessions: WorkoutScheduleSession[];
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'owner' }));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: async () => ({ user: { ...mockUser, id: 'owner' } }),
}));
jest.mock('../db/cycleRepository', () => ({ getActiveTrainingCycle: async () => mockCycle }));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
}));
jest.mock('../db/progressRepository', () => ({
  getCompletedWorkoutIds: async () =>
    new Set(mockSessions.filter((s) => s.status === 'complete').map((s) => s.workoutId)),
}));
jest.mock('../db/calendarRepository', () => ({
  getWorkoutScheduleOverrides: async () => [],
  getWorkoutScheduleSessions: async () => mockSessions,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 13, 12));
  mockVersion = {
    ...demoProgramVersion,
    workouts: [
      { ...demoProgramVersion.workouts[0]!, id: 'first', title: 'Older session', dayOfWeek: 2 },
      { ...demoProgramVersion.workouts[0]!, id: 'second', title: 'Current session', dayOfWeek: 2 },
    ],
  };
  mockCycle = createTrainingCycle({
    id: 'cycle',
    userId: 'owner',
    programVersion: mockVersion,
    startedAt: new Date(2026, 9, 12, 12).toISOString(),
  });
  mockSessions = [];
});
afterEach(() => jest.useRealTimers());

test('Home and Coach choose newest unfinished workout; opening Home does not start it', async () => {
  mockSessions = [
    { cycleWeek: 1, workoutId: 'first', status: 'in-progress' },
    { cycleWeek: 1, workoutId: 'second', status: 'in-progress' },
  ];
  const chosen = selectCoachWorkout(mockCycle, mockVersion, [], mockSessions, new Date());
  expect(chosen?.workout.id).toBe('second');
  const screen = await render(<HomeScreen />);
  await waitFor(() => expect(screen.getByLabelText('Resume workout')).toBeTruthy());
  expect(screen.getByText('Continue where you left off.')).toBeTruthy();
  expect(screen.getAllByText('Resume workout')).toHaveLength(2);
  expect(screen.queryByText('Start workout')).toBeNull();
  expect(router.push).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Resume workout'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/workout',
    params: { workoutId: chosen!.workout.id },
  });
});

test('completed first workout on same date does not replace current second workout', async () => {
  mockSessions = [{ cycleWeek: 1, workoutId: 'first', status: 'complete' }];
  const chosen = selectCoachWorkout(mockCycle, mockVersion, [], mockSessions, new Date());
  expect(chosen?.workout.id).toBe('second');
  const screen = await render(<HomeScreen />);
  await waitFor(() => expect(screen.getByLabelText('Start workout')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Start workout'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/workout',
    params: { workoutId: chosen!.workout.id },
  });
});

test('completed training keeps the cycle visible without a fabricated start action', async () => {
  mockSessions = mockVersion.workouts.map((w) => ({
    cycleWeek: 1,
    workoutId: w.id,
    status: 'complete',
  }));
  const screen = await render(<HomeScreen />);
  await waitFor(() => expect(screen.getByText('No workout scheduled now')).toBeTruthy());
  expect(screen.getByText('Week 1 of 6')).toBeTruthy();
  expect(screen.queryByLabelText('Start workout')).toBeNull();
  expect(screen.queryByLabelText('Resume workout')).toBeNull();
  expect(router.push).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Check training calendar'));
  expect(router.push).toHaveBeenCalledWith('/calendar');
});
