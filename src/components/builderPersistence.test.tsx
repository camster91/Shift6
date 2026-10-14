import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProgramBuilderScreen from '../../app/builder';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createCustomExercise } from '../domain/programBuilder';
import {
  getUserExercises,
  getUserProgramVersion,
  saveCustomExercise,
} from '../db/programRepository';

let mockDatabase: object | null = {};
let mockReleaseMode = 'guest-only';
let mockParams: { mode?: string; sourceVersionId?: string } = { mode: 'blank' };
const mockSaveProgram = jest.fn(async (..._args: unknown[]) => undefined);
const mockStartSchedule = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('../db/cycleRepository', () => ({
  getLatestTrainingCycle: async () => null,
  saveTrainingCycleWithSchedule: (...args: unknown[]) => mockStartSchedule(...args),
}));
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
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
  router: { replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../config/env', () => ({
  runtimeConfig: {
    get releaseMode() {
      return mockReleaseMode;
    },
  },
}));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../db/programRepository', () => ({
  getUserExercises: jest.fn(async () => []),
  getUserProgramVersion: jest.fn(async () => null),
  saveCustomExercise: jest.fn(async () => undefined),
  saveProgramVersion: (...args: unknown[]) => mockSaveProgram(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDatabase = {};
  mockReleaseMode = 'guest-only';
  mockParams = { mode: 'blank' };
  jest.mocked(getUserExercises).mockResolvedValue([]);
  jest.mocked(getUserProgramVersion).mockResolvedValue(null);
  mockSaveProgram.mockResolvedValue(undefined);
  mockStartSchedule.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('a saved source opens an explicit copy with its actual workout and custom movement', async () => {
  mockParams = { sourceVersionId: 'saved-private-version' };
  const movement = createCustomExercise({
    id: 'custom-saved-movement',
    name: 'My saved movement',
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    equipmentIds: ['equipment-bodyweight'],
  });
  const sourceVersion = {
    ...demoProgramVersion,
    id: 'saved-private-version',
    workouts: [
      {
        ...demoProgramVersion.workouts[0]!,
        title: 'Saved private workout',
        exercises: [{ ...demoProgramVersion.workouts[0]!.exercises[0]!, exerciseId: movement.id }],
      },
    ],
  };
  jest.mocked(getUserProgramVersion).mockResolvedValue({
    program: { ...demoProgram, title: 'Saved private plan' },
    version: sourceVersion,
  });
  jest.mocked(getUserExercises).mockResolvedValue([movement]);
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByDisplayValue('Saved private plan copy')).toBeTruthy());
  expect(screen.getByDisplayValue('Saved private workout')).toBeTruthy();
  expect(screen.getByText('My saved movement')).toBeTruthy();
  expect(getUserProgramVersion).toHaveBeenCalledWith(
    mockDatabase,
    'guest-user',
    'saved-private-version',
  );
  expect(mockSaveProgram).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(mockSaveProgram).toHaveBeenCalled());
  const savedVersion = mockSaveProgram.mock.calls[0]![3] as typeof demoProgramVersion;
  expect(savedVersion.id).not.toBe(sourceVersion.id);
  expect(savedVersion.workouts[0]?.title).toBe('Saved private workout');
  expect(savedVersion.workouts[0]?.exercises[0]?.exerciseId).toBe(movement.id);
  expect(saveCustomExercise).toHaveBeenCalledWith(
    mockDatabase,
    'guest-user',
    movement,
    expect.any(String),
  );
});

async function startablePrivatePlan() {
  mockParams = { sourceVersionId: 'start-private-version' };
  const movement = createCustomExercise({
    id: 'start-custom',
    name: 'My start movement',
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    equipmentIds: ['equipment-bodyweight'],
  });
  const version = {
    ...demoProgramVersion,
    id: 'start-private-version',
    workouts: [
      {
        ...demoProgramVersion.workouts[0]!,
        title: 'My start workout',
        exercises: [{ ...demoProgramVersion.workouts[0]!.exercises[0]!, exerciseId: movement.id }],
      },
    ],
  };
  jest.mocked(getUserProgramVersion).mockResolvedValue({
    program: { ...demoProgram, title: 'My start plan', isTemplate: false, ownerId: 'guest-user' },
    version,
  });
  jest.mocked(getUserExercises).mockResolvedValue([movement]);
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByDisplayValue('My start plan copy')).toBeTruthy());
  return screen;
}
test('Start displays the frozen date and timezone, Cancel writes nothing, confirmation saves one anchored cycle', async () => {
  const screen = await startablePrivatePlan();
  await fireEvent.press(screen.getByLabelText('Start this six-week cycle'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Start this six-week cycle?',
    expect.stringContaining('Start date'),
    expect.any(Array),
  );
  expect(mockSaveProgram).not.toHaveBeenCalled();
  expect(mockStartSchedule).not.toHaveBeenCalled();
  const choices = jest.mocked(Alert.alert).mock.calls[0]![2]!;
  await act(async () => choices.find((choice) => choice.text === 'Cancel')?.onPress?.());
  expect(mockStartSchedule).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Start this six-week cycle'));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[1]![2]!.find((choice) => choice.text === 'Start cycle')
      ?.onPress?.(),
  );
  await waitFor(() => expect(mockStartSchedule).toHaveBeenCalledTimes(1));
  expect(mockStartSchedule).toHaveBeenCalledWith(
    mockDatabase,
    expect.objectContaining({ userId: 'guest-user', currentWeek: 1 }),
    expect.objectContaining({ workouts: expect.any(Array) }),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    expect.stringMatching(/^\d{4}-\d\d-\d\d$/),
    expect.any(Function),
  );
});
test('editing after Start preview rejects the old confirmation without writing its cycle', async () => {
  const screen = await startablePrivatePlan();
  await fireEvent.press(screen.getByLabelText('Start this six-week cycle'));
  const choices = jest.mocked(Alert.alert).mock.calls[0]![2]!;
  await fireEvent.changeText(
    screen.getByDisplayValue('My start plan copy'),
    'Changed after preview',
  );
  await act(async () => choices.find((choice) => choice.text === 'Start cycle')?.onPress?.());
  expect(mockStartSchedule).not.toHaveBeenCalled();
  expect(mockSaveProgram).not.toHaveBeenCalled();
  expect(
    screen.getByText('The plan or date changed. Review Start again before confirming.'),
  ).toBeTruthy();
});

test('an unavailable or foreign saved source cannot silently become a blank saved plan', async () => {
  mockParams = { sourceVersionId: 'foreign-version' };
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() =>
    expect(screen.getByText(/could not find the saved program version/)).toBeTruthy(),
  );
  expect(screen.queryByLabelText('Save draft program')).toBeNull();
  expect(mockSaveProgram).not.toHaveBeenCalled();
});

test('confirmed guest writes explain device storage and never promise cloud sync', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText('Draft saved locally.')).toBeTruthy());
  expect(mockSaveProgram).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/They are not backed up to the cloud/)).toBeTruthy();
  expect(screen.queryByText(/queued for sync/)).toBeNull();
});

test('a failed save clears an earlier success and shows the write error', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText('Draft saved locally.')).toBeTruthy());
  mockSaveProgram.mockRejectedValue(new Error('Disk unavailable'));
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText('Disk unavailable')).toBeTruthy());
  expect(screen.queryByText('Draft saved locally.')).toBeNull();
});

test('missing local storage never claims a preview draft was saved', async () => {
  mockDatabase = null;
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText(/Your plan has not been saved/)).toBeTruthy());
  expect(mockSaveProgram).not.toHaveBeenCalled();
  expect(screen.queryByText('Draft saved locally.')).toBeNull();
});

test('connected mode retains the queued synchronization disclosure after a write', async () => {
  mockReleaseMode = 'connected';
  const screen = await render(<ProgramBuilderScreen />);
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(screen.getByText(/queued for sync/)).toBeTruthy());
  expect(mockSaveProgram).toHaveBeenCalledTimes(1);
});
