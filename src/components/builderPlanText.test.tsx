import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProgramBuilderScreen from '../../app/builder';
import {
  demoProgram as mockProgram,
  demoProgramVersion as mockVersion,
} from '../domain/fixtures/home';
import { createCustomExercise as mockCreateExercise } from '../domain/programBuilder';
import type { ProgramVersion } from '../domain/types';
const mockDatabase = {};
const mockSave = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('../db/builderRecoveryRepository', () => ({
  getBuilderRecovery: async () => null,
  saveBuilderRecovery: async (
    _database: unknown,
    userId: string,
    _route: string,
    snapshot: unknown,
    revision: number,
    id: string,
  ) => ({ id, userId, snapshot, revision: revision + 1 }),
  clearBuilderRecovery: async () => undefined,
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ sourceVersionId: 'saved-source' }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({
    program: mockProgram,
    version: {
      ...mockVersion,
      id: 'saved-source',
      workouts: [{ ...mockVersion.workouts[0], title: 'My source workout', exercises: [] }],
    },
  }),
  getUserExercises: async () => [
    mockCreateExercise({
      id: 'my-movement',
      name: 'My squat',
      movementPattern: 'squat',
      primaryMuscles: ['quadriceps'],
      equipmentIds: ['equipment-bodyweight'],
      trackingType: 'reps',
    }),
  ],
  saveCustomExercise: jest.fn(async () => undefined),
  saveProgramVersion: (...args: unknown[]) => mockSave(...args),
}));

test('reviewed text appends to the selected private copy and its normal save retains actual targets and original source', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByDisplayValue('My source workout')).toBeTruthy());
  // Only the owner's saved custom movement is available; the public manifest stays gated.
  await fireEvent.press(screen.getByLabelText('Import pasted targets for My source workout'));
  const original = 'My squat | sets=2 | reps=6-8 | load=25lb | rest=45s';
  await fireEvent.changeText(
    screen.getByLabelText('User-owned workout text for My source workout'),
    original,
  );
  await fireEvent.press(screen.getByLabelText('Preview pasted targets'));
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Add reviewed rows to this workout')).toBeEnabled();
  await fireEvent.press(screen.getByLabelText('Add reviewed rows to this workout'));
  expect(screen.getByText(/Rows added to your unsaved plan/)).toBeTruthy();
  expect(mockSave).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  const saved = mockSave.mock.calls[0]![3] as ProgramVersion;
  const imported = saved.workouts[0]!.exercises.at(-1)!;
  expect(imported.sets).toHaveLength(2);
  expect(imported.sets[0]).toMatchObject({
    restSeconds: 45,
    target: { reps: { min: 6, max: 8 }, load: { value: 25, unit: 'imperial' } },
  });
  expect(imported.notes).toContain(original);
  expect(saved.id).not.toBe('saved-source');
});
