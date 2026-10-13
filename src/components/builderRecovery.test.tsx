import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import ProgramBuilderScreen from '../../app/builder';
import { builderRecoveryId, builderRouteKey } from '../domain/builderRecovery';
import {
  addWorkoutToProgram,
  createBlankProgram,
  createCustomExercise,
} from '../domain/programBuilder';
import type { BuilderRecoveryDraft, BuilderRecoverySnapshot } from '../domain/localPersistence';
let mockOwner = 'guest-user';
const mockDatabase = {};
let mockRecord: BuilderRecoveryDraft | null = null;
const mockGet = jest.fn(async (_db: unknown, owner: string, _route: string) =>
  mockRecord?.userId === owner ? mockRecord : null,
);
const mockWrite = jest.fn(
  async (
    _db: unknown,
    owner: string,
    route: string,
    snapshot: BuilderRecoverySnapshot,
    revision: number,
    id: string,
  ) => {
    if ((mockRecord?.revision ?? 0) !== revision) throw new Error('Conflict');
    mockRecord = {
      id,
      userId: owner,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      revision: revision + 1,
      updatedAt: '2026-10-13T12:00:00.000Z',
    };
    return mockRecord;
  },
);
const mockClear = jest.fn(async (_db: unknown, _owner: string, id: string, revision: number) => {
  if (mockRecord?.id !== id || mockRecord.revision !== revision) throw new Error('Conflict');
  mockRecord = null;
});
const mockCanonical = jest.fn(async (..._args: unknown[]): Promise<void> => undefined);
const mockSource = jest.fn(
  async (
    ..._args: unknown[]
  ): Promise<Pick<BuilderRecoverySnapshot, 'program' | 'version'> | null> => null,
);
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ mode: 'blank' }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../db/programRepository', () => ({
  getUserExercises: async () => [],
  getUserProgramVersion: (...args: unknown[]) => mockSource(...args),
  saveCustomExercise: async () => undefined,
  saveProgramVersion: (...args: unknown[]) => mockCanonical(...args),
}));
jest.mock('../db/builderRecoveryRepository', () => ({
  getBuilderRecovery: (...args: Parameters<typeof mockGet>) => mockGet(...args),
  saveBuilderRecovery: (...args: Parameters<typeof mockWrite>) => mockWrite(...args),
  clearBuilderRecovery: (...args: Parameters<typeof mockClear>) => mockClear(...args),
}));
function recovered(): BuilderRecoveryDraft {
  const draft = createBlankProgram({
    userId: 'guest-user',
    newProgramId: 'recovered-program',
    newVersionId: 'recovered-version',
    createdAt: '2026-10-13T12:00:00.000Z',
  });
  const workout = addWorkoutToProgram(draft.version, {
    id: 'recovered-version-workout-extra-1',
    title: 'Recovered day',
    dayOfWeek: 1,
    focus: 'mixed',
    estimatedDurationMinutes: 20,
  });
  const movement = createCustomExercise({
    id: 'private-squat',
    name: 'Private squat',
    movementPattern: 'squat',
    primaryMuscles: ['quadriceps'],
    equipmentIds: ['equipment-bodyweight'],
    trackingType: 'reps',
  });
  const original = 'Private squat | sets=2 | reps=8 | load=40 | rest=45s';
  return {
    id: builderRecoveryId('guest-user', builderRouteKey('blank')),
    userId: 'guest-user',
    revision: 4,
    updatedAt: '2026-10-13T12:00:00.000Z',
    snapshot: {
      program: { ...draft.program, title: 'Recovered plan' },
      version: workout,
      customExercises: [movement],
      imports: [{ workoutId: workout.workouts[0]!.id, text: original, previewText: original }],
    },
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockRecord = null;
  mockOwner = 'guest-user';
  mockCanonical.mockResolvedValue(undefined);
  mockSource.mockResolvedValue(null);
  mockGet.mockImplementation(async (_db, owner) =>
    mockRecord?.userId === owner ? mockRecord : null,
  );
});
test('explicit resume restores the same draft and original preview, recomputes unresolved fields, never applies or starts it', async () => {
  mockRecord = recovered();
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByText('Resume your private draft?')).toBeTruthy());
  expect(screen.queryByLabelText('Program name')).toBeNull();
  expect(mockCanonical).not.toHaveBeenCalled();
  expect(mockWrite).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Resume private draft'));
  expect(screen.getByDisplayValue('Recovered plan')).toBeTruthy();
  expect(screen.getByDisplayValue('Recovered day')).toBeTruthy();
  expect(screen.getByLabelText('Add reviewed rows to this workout')).toBeDisabled();
  expect(screen.getByText(/Load needs an explicit/)).toBeTruthy();
  expect(
    screen.getByText('No exercises yet. Add a starter movement, then configure its target below.'),
  ).toBeTruthy();
  expect(mockCanonical).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText('Required workout name'),
    'Another recovered day',
  );
  await fireEvent.press(screen.getByLabelText('Add required workout'));
  expect(screen.getByDisplayValue('Another recovered day')).toBeTruthy();
});
test('discard removes only recovery and returns to a fresh blank draft without saving a plan', async () => {
  mockRecord = recovered();
  const prior = mockRecord;
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByLabelText('Discard private recovery')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Discard private recovery'));
  await waitFor(() => expect(screen.getByLabelText('Program name')).toBeTruthy());
  expect(mockClear).toHaveBeenCalledWith(mockDatabase, 'guest-user', prior.id, prior.revision);
  expect(mockRecord).toBeNull();
  expect(mockCanonical).not.toHaveBeenCalled();
});

test('already saved recovery requires explicit new-copy resume, preserves original import text and never overwrites saved version', async () => {
  mockRecord = recovered();
  const original = mockRecord.snapshot;
  mockSource.mockResolvedValue({ program: original.program, version: original.version });
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByLabelText('Resume as a new private copy')).toBeTruthy());
  expect(mockCanonical).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Resume as a new private copy'));
  expect(screen.getByDisplayValue('Recovered plan copy')).toBeTruthy();
  expect(screen.getByDisplayValue(original.imports[0]!.text)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  expect(mockCanonical).toHaveBeenCalledTimes(1);
  const writtenVersion = mockCanonical.mock.calls[0]![3] as BuilderRecoverySnapshot['version'];
  expect(writtenVersion.id).not.toBe(original.version.id);
  expect(writtenVersion.workouts[0]!.id).not.toBe(original.version.workouts[0]!.id);
  expect(mockRecord?.snapshot.imports[0]?.workoutId).toBe(writtenVersion.workouts[0]!.id);
  expect(mockRecord?.snapshot.imports[0]?.text).toBe(original.imports[0]!.text);
  expect(mockClear).not.toHaveBeenCalled();
  expect(screen.getByText(/Unadded import text remains/)).toBeTruthy();
});
test('background flush and reopening preserve edited draft; failed canonical save retains recovery', async () => {
  const listeners: { callback: (state: AppStateStatus) => void; active: boolean }[] = [];
  const subscription = jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, callback) => {
      const listener = { callback, active: true };
      listeners.push(listener);
      return {
        remove: () => {
          listener.active = false;
        },
      };
    });
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByLabelText('Program name')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Program name'), 'My unsaved local plan');
  await act(async () => {
    listeners.filter((item) => item.active).forEach((item) => item.callback('background'));
  });
  await waitFor(() => expect(mockRecord?.snapshot.program.title).toBe('My unsaved local plan'));
  expect(screen.getByText(/Recovery saved locally/)).toBeTruthy();
  expect(mockCanonical).not.toHaveBeenCalled();
  await screen.unmount();
  const reopened = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(reopened.getByLabelText('Resume private draft')).toBeTruthy());
  await fireEvent.press(reopened.getByLabelText('Resume private draft'));
  mockCanonical.mockRejectedValueOnce(new Error('Synthetic canonical save failure'));
  await fireEvent.press(reopened.getByLabelText('Save draft program'));
  expect(reopened.getByText('Synthetic canonical save failure')).toBeTruthy();
  expect(mockRecord?.snapshot.program.title).toBe('My unsaved local plan');
  expect(mockClear).not.toHaveBeenCalled();
  await reopened.unmount();
  subscription.mockRestore();
});
test('successful explicit canonical save clears recovery only after the canonical write', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByLabelText('Program name')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Program name'), 'Save me');
  await fireEvent.press(screen.getByLabelText('Save draft program'));
  await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
  expect(mockCanonical.mock.invocationCallOrder[0]!).toBeLessThan(
    mockClear.mock.invocationCallOrder[0]!,
  );
  expect(mockRecord).toBeNull();
});
test('new edits during a delayed canonical save are retained, never overwritten by the saved snapshot', async () => {
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(screen.getByLabelText('Program name')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Program name'), 'Saved original');
  let complete!: () => void;
  mockCanonical.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const press = screen
    .getByLabelText('Save draft program')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    void press();
    void press();
  });
  expect(mockCanonical).toHaveBeenCalledTimes(1);
  await fireEvent.changeText(screen.getByLabelText('Program name'), 'Newer unsaved title');
  await act(async () => complete());
  await waitFor(() => expect(screen.getByLabelText('Save draft program')).toBeEnabled());
  expect(screen.getByDisplayValue('Newer unsaved title')).toBeTruthy();
  expect(mockRecord?.snapshot.program.title).toBe('Newer unsaved title');
  expect(mockClear).not.toHaveBeenCalled();
});
test('a delayed previous-owner recovery read cannot populate the next owner editor', async () => {
  let complete!: (value: BuilderRecoveryDraft) => void;
  mockGet.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const screen = await render(<ProgramBuilderScreen />);
  await waitFor(() => expect(mockGet).toHaveBeenCalled());
  mockOwner = 'other-owner';
  await screen.rerender(<ProgramBuilderScreen />);
  await act(async () => complete(recovered()));
  await waitFor(() => expect(screen.getByLabelText('Program name')).toBeTruthy());
  expect(screen.queryByText('Recovered plan')).toBeNull();
  expect(screen.queryByLabelText('Resume private draft')).toBeNull();
});
