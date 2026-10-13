import { render, waitFor } from '@testing-library/react-native';
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
const mockSummary = buildCycleProgressSummary(6, []);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../db/cycleRepository', () => ({
  getLatestTrainingCycle: async () => ({ ...mockCycle, userId: 'guest-user' }),
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
  getCycleProgressSummary: async () => mockSummary,
  getLatestCompletedWorkoutSets: async () => mockCompleted,
  getExerciseProgress: async () => null,
  getCycleCompletedSetRecords: async () => [],
  getCycleCardioRecords: async () => [],
}));

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
