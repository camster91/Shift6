import type * as ReactModule from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActiveWorkoutScreen from '../../app/workout';
import { demoCycle, demoProgram, demoProgramVersion, demoUser } from '../domain/fixtures/home';
import type { CompletedSet, WorkoutSession, WorkoutDraftValues } from '../domain/types';
let mockFocusEnter: (() => () => void) | null = null;
let mockFocusLeave: (() => void) | null = null;
let mockResumed: WorkoutSession | null = null;
let mockSavedActuals: CompletedSet[] = [];
let mockRecoveredDraft: WorkoutDraftValues | null = null;
const mockDb = {},
  mockSaveSet = jest.fn(),
  mockUpdateSet = jest.fn(),
  mockSaveNote = jest.fn(),
  mockPartial = jest.fn(),
  mockSkip = jest.fn(),
  mockSaveDraft = jest.fn();
jest.mock('expo-network', () => ({
  getNetworkStateAsync: async () => ({ isConnected: false, isInternetReachable: false }),
  addNetworkStateListener: () => ({ remove: () => undefined }),
}));
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => () => void) =>
    jest.requireActual<typeof ReactModule>('react').useEffect(() => {
      mockFocusEnter = callback;
      mockFocusLeave = callback();
      return () => mockFocusLeave?.();
    }, [callback]),
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ workoutId: 'workout-barbell-30-strength-a' }),
}));
jest.mock('../services/notifications', () => ({ createExpoNotificationProvider: () => ({}) }));
jest.mock('../services/notificationScheduler', () => ({
  cancelRestTimerCue: async () => undefined,
  refreshRestTimerCue: async () => ({ outcome: 'disabled' }),
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('../services/SyncRuntimeProvider', () => ({
  useSyncRuntime: () => ({ flushNow: jest.fn(), state: 'idle' }),
}));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: async () => ({ ...mockCycle, userId: 'guest-user' }),
}));
jest.mock('../db/programRepository', () => ({
  getUserProgramVersion: async () => ({ program: mockProgram, version: mockVersion }),
  getUserExercises: async () => [],
}));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: async () => ({ user: mockUser }),
}));
jest.mock('../db/notificationRepository', () => ({
  getNotificationPreferences: async () => ({ restTimer: false }),
}));
jest.mock('../db/progressRepository', () => ({ getLatestCompletedWorkoutSets: async () => [] }));
jest.mock('../db/workoutRepository', () => ({
  getInProgressWorkoutSession: async () => mockResumed,
  saveWorkoutSession: async () => undefined,
  getCompletedSets: async () => mockSavedActuals,
  getWorkoutDraft: async () => mockRecoveredDraft,
  saveWorkoutDraft: (...args: unknown[]) => mockSaveDraft(...args),
  saveCompletedSet: (...args: unknown[]) => mockSaveSet(...args),
  updateCompletedSet: (...args: unknown[]) => mockUpdateSet(...args),
  updateWorkoutSessionNote: (...args: unknown[]) => mockSaveNote(...args),
  updateWorkoutSessionReadiness: jest.fn(),
  saveActiveWorkoutRevision: jest.fn(),
  completeWorkoutSessionAndAdvanceCycle: jest.fn(),
  finishWorkoutSessionPartially: (...args: unknown[]) => mockPartial(...args),
  finishWorkoutSessionSkipped: (...args: unknown[]) => mockSkip(...args),
}));
const mockCycle = demoCycle,
  mockProgram = demoProgram,
  mockVersion = demoProgramVersion;
let mockUser = demoUser;
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = demoUser;
  mockRecoveredDraft = null;
  mockResumed = null;
  mockSavedActuals = [];
  mockSaveSet.mockResolvedValue('saved');
  mockUpdateSet.mockResolvedValue('updated');
  mockSaveNote.mockResolvedValue(undefined);
  mockSaveDraft.mockResolvedValue(undefined);
  mockPartial.mockResolvedValue({ status: 'partial' });
  mockSkip.mockResolvedValue({ status: 'skipped' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test.each([
  ['metric', 'imperial', 'kg', 'lb'],
  ['imperial', 'metric', 'lb', 'kg'],
] as const)(
  'actual units follow %s target under %s preferences; unit conversion requires confirmation',
  async (targetUnit, preference, actualUnit, otherUnit) => {
    const target = mockVersion.workouts[0]!.exercises[0]!.sets[0]!.target;
    const oldLoad = target.load;
    target.load = { value: 40, unit: targetUnit };
    mockUser = { ...demoUser, unitSystem: preference };
    try {
      const screen = await render(<ActiveWorkoutScreen />);
      await waitFor(() => expect(screen.getByLabelText('Back squat set 1 load')).toBeTruthy());
      expect(screen.getByLabelText('Back squat set 1 load').props.placeholder).toBe(actualUnit);
      await fireEvent.changeText(screen.getByLabelText('Back squat set 1 load'), '40');
      await fireEvent.press(
        screen.getByLabelText(`Back squat set 1 actual load unit ${otherUnit}`),
      );
      expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe('40');
      expect(mockSaveSet).not.toHaveBeenCalled();
      await act(async () => {
        jest
          .mocked(Alert.alert)
          .mock.calls.at(-1)?.[2]
          ?.find((button) => button.text === 'Confirm')
          ?.onPress?.();
      });
      expect(Number(screen.getByLabelText('Back squat set 1 load').props.value)).toBeCloseTo(
        actualUnit === 'kg' ? 40 / 0.45359237 : 40 * 0.45359237,
      );
      await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
      await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
      expect(mockSaveSet.mock.calls[0]?.[1]).toMatchObject({ loadUnit: otherUnit });
      expect(mockSaveSet.mock.calls[0]?.[2]).toBe('guest-user');
    } finally {
      target.load = oldLoad;
    }
  },
);

test('legacy recovered load stays unknown and cannot save until explicitly declared', async () => {
  const exercise = mockVersion.workouts[0]!.exercises[0]!;
  mockRecoveredDraft = {
    [`${exercise.id}:1`]: { load: '35', reps: '8', duration: '', distance: '', rpe: '', rir: '' },
  };
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() =>
    expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe('35'),
  );
  expect(screen.getByLabelText('Back squat set 1 load').props.placeholder).toBe('Unit unknown');
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  expect(mockSaveSet).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Back squat set 1 actual load unit kg'));
  await act(async () => {
    jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find((button) => button.text === 'Confirm')
      ?.onPress?.();
  });
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
  expect(mockSaveSet.mock.calls[0]?.[1]).toMatchObject({ load: 35, loadUnit: 'kg' });
});
test('focused fields precede optional details and bodyweight never requires owned gear', async () => {
  const beforeEquipment = mockVersion.workouts[0]!.equipmentIds;
  mockVersion.workouts[0]!.equipmentIds = ['equipment-bodyweight'];
  mockUser = { ...demoUser, equipmentIds: ['equipment-dumbbells'] };
  try {
    const screen = await render(<ActiveWorkoutScreen />);
    await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
    expect(screen.queryByText('WORKOUT PREFLIGHT')).toBeNull();
    expect(screen.queryByText('Set your context.')).toBeNull();
    expect(screen.queryByText(/Missing Bodyweight/)).toBeNull();
    expect(screen.queryByText('Saved on this device')).toBeNull();
    expect(
      screen.getByLabelText(
        'Offline mode. Workout logging stays on this device. Cloud sync is not enabled.',
      ),
    ).toBeTruthy();
    const serialized = JSON.stringify(screen.toJSON());
    expect(serialized.indexOf('Back squat set 1 reps')).toBeLessThan(
      serialized.indexOf('Review all sets and adjustments'),
    );
    expect(serialized.indexOf('Back squat set 1 reps')).toBeLessThan(
      serialized.indexOf('Show optional effort fields'),
    );
    await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '4');
    await fireEvent.press(screen.getByLabelText('Review all sets and adjustments'));
    expect(screen.getByText('WORKOUT PREFLIGHT')).toBeTruthy();
    expect(screen.getByText('No equipment required.')).toBeTruthy();
    expect(screen.getByLabelText('Back squat set 1 reps').props.value).toBe('4');
    expect(screen.getByRole('radio', { name: 'Ready to train', selected: false })).toBeTruthy();
    expect(mockSaveSet).not.toHaveBeenCalled();
  } finally {
    mockVersion.workouts[0]!.equipmentIds = beforeEquipment;
  }
});

test('focused logging keeps a compact real missing-gear cue without opening preflight', async () => {
  mockUser = { ...demoUser, equipmentIds: ['equipment-dumbbells'] };
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  expect(
    screen.getByText(/Missing Barbell, Plates, Rack, Bench in your equipment profile/),
  ).toBeTruthy();
  expect(screen.queryByText('WORKOUT PREFLIGHT')).toBeNull();
  expect(screen.getByText('Discomfort — stop session')).toBeTruthy();
});
test('focus saves the actual edited result before revealing the next set, preserving failure state', async () => {
  let release: (value: string) => void = () => undefined;
  mockSaveSet.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
  expect(screen.getByText(/Suggested values are not measurements/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '4');
  const pendingPress = fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalled());
  expect(mockSaveSet.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ reps: 4 }));
  expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
  release('saved');
  await pendingPress;
  await waitFor(() => expect(screen.getByLabelText('Back squat set 2 reps')).toBeTruthy());
  expect(screen.getByText(/How did Back squat set 1 feel/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Too hard'));
  await waitFor(() =>
    expect(mockSaveNote).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      'Set feeling · Back squat · set 1: Too hard',
    ),
  );
  expect(mockSaveSet).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Back squat set 2 reps').props.value).toBe('5');
});
test('a failed set save does not advance focus or manufacture a recorded result', async () => {
  mockSaveSet.mockRejectedValueOnce(new Error('disk full'));
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(screen.getByText('disk full')).toBeTruthy());
  expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy();
  expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
});
test('discomfort requires confirmation and an untouched session is skipped rather than completed', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByText('Discomfort — stop session')).toBeTruthy());
  await fireEvent.press(screen.getByText('Discomfort — stop session'));
  expect(mockSkip).not.toHaveBeenCalled();
  expect(mockSaveSet).not.toHaveBeenCalled();
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]?.[2]?.find((item) => item.text === 'Skip and stop')
      ?.onPress?.(),
  );
  await waitFor(() =>
    expect(mockSkip).toHaveBeenCalledWith(
      mockDb,
      expect.any(String),
      expect.any(String),
      'discomfort',
    ),
  );
  expect(mockPartial).not.toHaveBeenCalled();
  expect(mockSaveSet).not.toHaveBeenCalled();
});

test('pending feedback stays attached to the saved set and cannot advance or select another set', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 2')).toBeTruthy());
  let release: () => void = () => undefined;
  mockSaveNote.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const feedbackPress = fireEvent.press(screen.getByText('Too hard'));
  await waitFor(() =>
    expect(
      screen.getByLabelText('Complete Back squat set 2').props.accessibilityState.disabled,
    ).toBe(true),
  );
  expect(mockSaveSet).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/How did Back squat set 1 feel/)).toBeTruthy();
  await act(async () => {
    release();
  });
  await feedbackPress;
  await waitFor(() =>
    expect(
      screen.getByLabelText('Complete Back squat set 2').props.accessibilityState.disabled,
    ).toBe(false),
  );
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 2'));
  await waitFor(() => expect(screen.getByLabelText('Complete Back squat set 3')).toBeTruthy());
  expect(screen.getByText(/How did Back squat set 2 feel/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Too hard', selected: false })).toBeTruthy();
  expect(mockSaveNote).toHaveBeenCalledWith(
    mockDb,
    expect.any(String),
    'Set feeling · Back squat · set 1: Too hard',
  );
});

test('explicit saved-set correction supplies its original actual snapshot and an invalidated unmount guard', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '4');
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
  const original = mockSaveSet.mock.calls[0]![1];
  expect(original.loadUnit).toBeUndefined();
  await fireEvent.press(screen.getByText('Review all sets and adjustments'));
  await fireEvent.press(screen.getByLabelText('Edit Back squat set 1'));
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '6');
  let release!: (value: string) => void;
  mockUpdateSet.mockImplementationOnce(
    () =>
      new Promise<string>((resolve) => {
        release = resolve;
      }),
  );
  const pending = fireEvent.press(screen.getByLabelText('Save Back squat set 1'));
  await waitFor(() => expect(mockUpdateSet).toHaveBeenCalledTimes(1));
  expect(mockUpdateSet.mock.calls[0]![1]).toMatchObject({ reps: 6 });
  expect(mockUpdateSet.mock.calls[0]![3]).toEqual(original);
  const isCurrent = mockUpdateSet.mock.calls[0]![4];
  expect(isCurrent()).toBe(true);
  await screen.unmount();
  expect(isCurrent()).toBe(false);
  release('updated');
  await pending;
});

test('correction keeps restored canonical set ID and operation identity rather than generating replacements', async () => {
  const movement = mockVersion.workouts[0]!.exercises[0]!;
  mockResumed = {
    id: 'restored-session',
    cycleId: mockCycle.id,
    cycleWeek: mockCycle.currentWeek,
    workoutId: mockVersion.workouts[0]!.id,
    programVersionId: mockVersion.id,
    workoutFocus: 'strength',
    status: 'in-progress',
    startedAt: '2026-10-13T12:00:00.000Z',
    isOffline: true,
  };
  const original: CompletedSet = {
    id: 'restored-original-set',
    sessionId: mockResumed.id,
    workoutExerciseId: movement.id,
    exerciseId: movement.exerciseId,
    setNumber: 1,
    reps: 4,
    completedAt: '2026-10-13T12:01:00.000Z',
    idempotencyKey: 'restored-original-operation',
  };
  mockSavedActuals = [original];
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 2 reps')).toBeTruthy());
  await fireEvent.press(screen.getByText('Review all sets and adjustments'));
  await fireEvent.press(screen.getByLabelText('Edit Back squat set 1'));
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '6');
  await fireEvent.press(screen.getByLabelText('Save Back squat set 1'));
  await waitFor(() => expect(mockUpdateSet).toHaveBeenCalledTimes(1));
  expect(mockUpdateSet.mock.calls[0]![1]).toMatchObject({
    id: original.id,
    idempotencyKey: original.idempotencyKey,
    reps: 6,
  });
  expect(mockUpdateSet.mock.calls[0]![3]).toEqual(original);
});

test('pending correction freezes numeric and unit mutation immediately and displays only confirmed actuals', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 load'), '40');
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '4');
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByText('Review all sets and adjustments'));
  await fireEvent.press(screen.getByLabelText('Edit Back squat set 1'));
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 load'), '45');
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '6');
  let release!: (value: string) => void;
  let canonical: CompletedSet | null = null;
  mockUpdateSet.mockImplementationOnce(
    (...args: unknown[]) =>
      new Promise<string>((resolve) => {
        release = (value) => {
          canonical = args[1] as CompletedSet;
          resolve(value);
        };
      }),
  );
  const pending = fireEvent.press(screen.getByLabelText('Save Back squat set 1'));
  await waitFor(() => expect(mockUpdateSet).toHaveBeenCalledTimes(1));
  const load = screen.getByLabelText('Back squat set 1 load');
  const reps = screen.getByLabelText('Back squat set 1 reps');
  expect(load.props.editable).toBe(false);
  expect(reps.props.editable).toBe(false);
  await act(async () => {
    load.props.onChangeText('999');
    reps.props.onChangeText('999');
  });
  await fireEvent.press(screen.getByLabelText('Back squat set 1 actual load unit kg'));
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe('45');
  expect(screen.getByLabelText('Back squat set 1 reps').props.value).toBe('6');
  await act(async () => {
    release('updated');
    await pending;
  });
  await waitFor(() => expect(screen.getByLabelText('Edit Back squat set 1')).toBeTruthy());
  expect(canonical).toMatchObject({ load: 45, loadUnit: 'lb', reps: 6 });
  expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe('45');
  expect(screen.getByLabelText('Back squat set 1 reps').props.value).toBe('6');
  expect(screen.getByLabelText('Edit Back squat set 1')).toBeTruthy();
});

test('queued draft context stays invalid after blur then same-owner focus return', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '7');
  await waitFor(() => expect(mockSaveDraft).toHaveBeenCalled());
  const oldGuard = mockSaveDraft.mock.calls.at(-1)![5] as () => boolean;
  expect(oldGuard()).toBe(true);
  await act(async () => {
    mockFocusLeave?.();
  });
  expect(oldGuard()).toBe(false);
  await act(async () => {
    mockFocusLeave = mockFocusEnter?.() ?? null;
  });
  expect(oldGuard()).toBe(false);
});
