import type * as ReactModule from 'react';
import type * as WorkoutRepository from '../db/workoutRepository';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, Keyboard, Platform } from 'react-native';
import type { KeyboardEvent, ScrollView, TextInput } from 'react-native';
import type { ScreenProps } from './ui/Screen';
import type { VoiceSetEntry } from './VoiceSetEntry';
import ActiveWorkoutScreen from '../../app/workout';
import { demoCycle, demoProgram, demoProgramVersion, demoUser } from '../domain/fixtures/home';
import type { CompletedSet, WorkoutSession, WorkoutDraftValues } from '../domain/types';
let mockFocusEnter: (() => () => void) | null = null;
let mockFocusLeave: (() => void) | null = null;
let mockResumed: WorkoutSession | null = null;
let mockSavedActuals: CompletedSet[] = [];
let mockPreviousActuals: CompletedSet[] = [];
let mockRecoveredDraft: WorkoutDraftValues | null = null;
let mockWorkoutScreenProps: ScreenProps | undefined;
let mockVoiceProps: Parameters<typeof VoiceSetEntry>[0] | undefined;
jest.mock('./ui', () => {
  const actual = jest.requireActual('./ui'),
    React = jest.requireActual<typeof ReactModule>('react');
  return {
    ...actual,
    Screen: (props: ScreenProps) => {
      if (props.scrollViewRef) mockWorkoutScreenProps = props;
      return React.createElement(actual.Screen, props);
    },
  };
});
jest.mock('./VoiceSetEntry', () => {
  const actual = jest.requireActual('./VoiceSetEntry'),
    React = jest.requireActual<typeof ReactModule>('react');
  return {
    VoiceSetEntry: (props: Parameters<typeof VoiceSetEntry>[0]) => {
      mockVoiceProps = props;
      return React.createElement(actual.VoiceSetEntry, props);
    },
  };
});
const mockVoiceAdapter = {
  capability: jest.fn(async () => ({ available: true })),
  listen: jest.fn<Promise<string>, unknown[]>(),
  cancel: jest.fn(),
};
jest.mock('../services/localVoice', () => ({
  createPlatformLocalVoiceAdapter: () => mockVoiceAdapter,
}));
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
      let leave = callback();
      mockFocusEnter = () => {
        leave = callback();
        return leave;
      };
      mockFocusLeave = leave;
      return () => leave();
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
jest.mock('../db/progressRepository', () => ({
  getLatestCompletedWorkoutSets: async () => mockPreviousActuals,
}));
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
let mockCycle = demoCycle,
  mockProgram = demoProgram,
  mockVersion = demoProgramVersion;
let mockUser = demoUser;
beforeEach(() => {
  mockWorkoutScreenProps = undefined;
  mockVoiceProps = undefined;
  jest.clearAllMocks();
  // A timed-out async case may finish after the next case starts. Keep its
  // mutated target reference separate from every later test's fixture graph.
  mockCycle = JSON.parse(JSON.stringify(demoCycle)) as typeof demoCycle;
  mockProgram = JSON.parse(JSON.stringify(demoProgram)) as typeof demoProgram;
  mockVersion = JSON.parse(JSON.stringify(demoProgramVersion)) as typeof demoProgramVersion;
  mockUser = demoUser;
  mockRecoveredDraft = null;
  mockVoiceAdapter.listen.mockResolvedValue('8 reps, 40 pounds');
  mockResumed = null;
  mockSavedActuals = [];
  mockPreviousActuals = [];
  mockSaveSet.mockResolvedValue('saved');
  mockUpdateSet.mockResolvedValue('updated');
  mockSaveNote.mockReset().mockResolvedValue(undefined);
  mockSaveDraft.mockResolvedValue(undefined);
  mockPartial.mockResolvedValue({ status: 'partial' });
  mockSkip.mockResolvedValue({ status: 'skipped' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});
const originalKeyboardSubscribe = jest.isMockFunction(Keyboard.addListener)
  ? jest.mocked(Keyboard.addListener).getMockImplementation()
  : undefined;
afterEach(() => {
  jest.restoreAllMocks();
  if (originalKeyboardSubscribe)
    jest.mocked(Keyboard.addListener).mockImplementation(originalKeyboardSubscribe);
});

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
test('recovered populated actuals retain visible field names and canonical units, including zero reps and RIR', async () => {
  const exercise = mockVersion.workouts[0]!.exercises[0]!;
  exercise.sets[0]!.target.durationSeconds = 30;
  exercise.sets[0]!.target.distanceMeters = 500;
  mockRecoveredDraft = {
    [`${exercise.id}:1`]: {
      load: '35',
      loadUnit: 'kg',
      reps: '0',
      duration: '26',
      distance: '450',
      rpe: '7',
      rir: '0',
    },
  };
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() =>
    expect(screen.getByLabelText('Back squat set 1 reps')).toHaveDisplayValue('0'),
  );
  for (const [caption, accessibilityLabel, value] of [
    ['Reps', 'reps', '0'],
    ['Duration (seconds)', 'duration in seconds', '26'],
    ['Distance (meters)', 'distance in meters', '450'],
    ['RPE (1–10)', 'RPE from 1 to 10', '7'],
    ['RIR (0–10)', 'RIR from 0 to 10', '0'],
  ]) {
    expect(screen.getByText(caption!)).toBeTruthy();
    expect(screen.getByLabelText(`Back squat set 1 ${accessibilityLabel}`)).toHaveDisplayValue(
      value!,
    );
  }
  expect(screen.getByText('Actual load: kg')).toBeTruthy();
  expect(screen.getByLabelText('Back squat set 1 load')).toHaveDisplayValue('35');
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 duration in seconds'), '28');
  expect(screen.getByText('Duration (seconds)')).toBeTruthy();
  expect(screen.getByLabelText('Back squat set 1 duration in seconds')).toHaveDisplayValue('28');
  expect(mockSaveSet).not.toHaveBeenCalled();
  expect(mockUpdateSet).not.toHaveBeenCalled();
});

test('actual field captions follow existing conditional inputs and remain after manual entry', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  expect(screen.getByText('Reps')).toBeTruthy();
  expect(screen.queryByText('Duration (seconds)')).toBeNull();
  expect(screen.queryByText('Distance (meters)')).toBeNull();
  expect(screen.queryByText('RPE (1–10)')).toBeNull();
  expect(screen.queryByText('RIR (0–10)')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Show optional effort fields'));
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '8');
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 RPE from 1 to 10'), '7.5');
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 RIR from 0 to 10'), '0');
  expect(screen.getByText('Reps')).toBeTruthy();
  expect(screen.getByText('RPE (1–10)')).toBeTruthy();
  expect(screen.getByText('RIR (0–10)')).toBeTruthy();
  expect(screen.getByLabelText('Back squat set 1 reps')).toHaveDisplayValue('8');
  expect(screen.getByLabelText('Back squat set 1 RIR from 0 to 10')).toHaveDisplayValue('0');
  expect(mockSaveSet).not.toHaveBeenCalled();
});

test('focused fields precede optional details and bodyweight never requires owned gear', async () => {
  const workout = mockVersion.workouts[0]!;
  const beforeEquipment = workout.equipmentIds;
  workout.equipmentIds = ['equipment-bodyweight'];
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
    workout.equipmentIds = beforeEquipment;
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
    completedAt: original.completedAt,
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

test('hydrated unchanged session notes do not start an unsolicited note save', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  expect(mockSaveNote).not.toHaveBeenCalled();
});

test('a rejected old note save cannot show an error after blur and same-session reentry', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  mockSaveNote.mockClear();
  let reject!: (error: Error) => void;
  mockSaveNote.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      }),
  );
  await fireEvent.press(screen.getByText('Review all sets and adjustments'));
  await fireEvent.changeText(screen.getByLabelText('Optional session note'), 'Actual changed note');
  await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
  await act(async () => {
    mockFocusLeave?.();
    mockFocusLeave = mockFocusEnter?.() ?? null;
    reject(new Error('Synthetic delayed note failure'));
  });
  expect(screen.queryByText('We could not save the workout note locally.')).toBeNull();
  expect(screen.getByLabelText('Optional session note').props.value).toBe('Actual changed note');
});

test('a current changed note save failure remains visible and retains its input', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  mockSaveNote.mockRejectedValueOnce(new Error('Synthetic current note failure'));
  await fireEvent.press(screen.getByText('Review all sets and adjustments'));
  await fireEvent.changeText(
    screen.getByLabelText('Optional session note'),
    'Keep this actual cue',
  );
  await waitFor(() =>
    expect(screen.getByText('We could not save the workout note locally.')).toBeTruthy(),
  );
  expect(screen.getByLabelText('Optional session note').props.value).toBe('Keep this actual cue');
});

test('dirty note retries with a fresh save after blur drops its debounce', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.press(screen.getByText('Review all sets and adjustments'));
  await fireEvent.changeText(screen.getByLabelText('Optional session note'), 'Persist on return');
  await act(async () => {
    mockFocusLeave?.();
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  expect(mockSaveNote).not.toHaveBeenCalled();
  await act(async () => {
    mockFocusLeave = mockFocusEnter?.() ?? null;
  });
  await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
  expect(mockSaveNote.mock.calls[0]![2]).toBe('Persist on return');
});

test('dirty note retries after an old rejected save and reads back from SQLite on reentry', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE workout_sessions (
    id TEXT PRIMARY KEY, cycle_id TEXT, cycle_week INTEGER, workout_id TEXT,
    program_version_id TEXT, workout_focus TEXT, status TEXT, started_at TEXT,
    completed_at TEXT, completion_reason TEXT, is_offline INTEGER, readiness TEXT, note TEXT);
    CREATE TABLE sync_outbox (id TEXT, idempotency_key TEXT, entity_type TEXT,
    entity_id TEXT, payload_json TEXT, created_at TEXT);`);
  const db = {
    withTransactionAsync: async (fn: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try {
        await fn();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    runAsync: async (sql: string, ...args: SQLInputValue[]) => {
      const result = sqlite.prepare(sql).run(...args);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...args: SQLInputValue[]) =>
      sqlite.prepare(sql).get(...args) ?? null,
  } as unknown as SQLiteDatabase;
  const actualNotes = jest.requireActual<typeof WorkoutRepository>('../db/workoutRepository');
  let reject!: (error: Error) => void;
  mockSaveNote.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      }),
  );
  mockSaveNote.mockImplementation(async (_db, id: string, note: string) => {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO workout_sessions
      (id,cycle_id,cycle_week,workout_id,program_version_id,workout_focus,status,started_at,is_offline)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        mockCycle.id,
        1,
        mockVersion.workouts[0]!.id,
        mockVersion.id,
        'strength',
        'in-progress',
        '2026-10-13T12:00:00Z',
        1,
      );
    return actualNotes.updateWorkoutSessionNote(db, id, note);
  });
  try {
    const screen = await render(<ActiveWorkoutScreen />);
    await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
    await fireEvent.press(screen.getByText('Review all sets and adjustments'));
    await fireEvent.changeText(screen.getByLabelText('Optional session note'), 'Retry this cue');
    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    await act(async () => {
      mockFocusLeave?.();
      mockFocusLeave = mockFocusEnter?.() ?? null;
      reject(new Error('Old operation failed'));
    });
    await waitFor(() =>
      expect(sqlite.prepare('SELECT note FROM workout_sessions').get()).toEqual({
        note: 'Retry this cue',
      }),
    );
    expect(mockSaveNote).toHaveBeenCalledTimes(2);
    await act(async () => {
      await mockSaveNote.mock.results[1]!.value;
    });
    expect(screen.queryByText('We could not save the workout note locally.')).toBeNull();
    await screen.unmount();
    expect(sqlite.prepare('SELECT note FROM workout_sessions').all()).toEqual([
      { note: 'Retry this cue' },
    ]);
  } finally {
    sqlite.close();
  }
});

test.each(['-5', 'not a number', 'Infinity'])(
  'nonempty invalid actual load %s stays editable and cannot silently save reps only',
  async (value) => {
    const screen = await render(<ActiveWorkoutScreen />);
    await waitFor(() => expect(screen.getByLabelText('Back squat set 1 load')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('Back squat set 1 load'), value);
    await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
    expect(mockSaveSet).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe(value);
    expect(
      screen.getByText(
        'Enter a valid nonnegative load, or clear the field if load was not recorded.',
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
  },
);

test.each([
  ['RPE', '-5'],
  ['RPE', 'not a number'],
  ['RPE', 'Infinity'],
  ['RIR', '-5'],
  ['RIR', 'not a number'],
  ['RIR', 'Infinity'],
] as const)(
  'nonempty invalid optional %s %s cannot silently disappear from a saved set',
  async (field, value) => {
    const screen = await render(<ActiveWorkoutScreen />);
    await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Show optional effort fields'));
    await fireEvent.changeText(
      screen.getByLabelText(`Back squat set 1 ${field} from ${field === 'RPE' ? 1 : 0} to 10`),
      value,
    );
    await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
    expect(mockSaveSet).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText(`Back squat set 1 ${field} from ${field === 'RPE' ? 1 : 0} to 10`).props
        .value,
    ).toBe(value);
    expect(
      screen.getByText(
        `Enter a valid ${field} from ${field === 'RPE' ? 1 : 0} to 10, or clear the field if ${field} was not recorded.`,
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Back squat set 2 reps')).toBeNull();
  },
);

test.each(['-5', 'not a number', 'Infinity'])(
  'nonempty optional reps %s cannot silently disappear when no reps target is prescribed',
  async (value) => {
    const target = mockVersion.workouts[0]!.exercises[0]!.sets[0]!.target;
    const previous = target.reps;
    delete target.reps;
    try {
      const screen = await render(<ActiveWorkoutScreen />);
      await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
      await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), value);
      await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
      expect(mockSaveSet).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Back squat set 1 reps').props.value).toBe(value);
      expect(
        screen.getByText(
          'Enter valid nonnegative reps, or clear the field if reps were not recorded.',
        ),
      ).toBeTruthy();
    } finally {
      target.reps = previous;
    }
  },
);

test('blank optional effort is omitted while explicitly recorded zero RIR is preserved', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Show optional effort fields'));
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 RIR from 0 to 10'), '0');
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
  expect(mockSaveSet.mock.calls[0]?.[1]).toMatchObject({ rir: 0 });
  expect(mockSaveSet.mock.calls[0]?.[1].rpe).toBeUndefined();
});

test.each([
  ['RPE', '0', 'RPE must be between 1 and 10.'],
  ['RPE', '11', 'RPE must be between 1 and 10.'],
  ['RIR', '11', 'RIR must be between 0 and 10.'],
] as const)('existing %s range refuses %s without saving', async (field, value, message) => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Show optional effort fields'));
  await fireEvent.changeText(
    screen.getByLabelText(`Back squat set 1 ${field} from ${field === 'RPE' ? 1 : 0} to 10`),
    value,
  );
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  expect(mockSaveSet).not.toHaveBeenCalled();
  expect(screen.getByText(message)).toBeTruthy();
});

test('valid fractional effort retains the existing numeric contract', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 reps')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Show optional effort fields'));
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 RPE from 1 to 10'), '7.5');
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 RIR from 0 to 10'), '1.5');
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
  expect(mockSaveSet.mock.calls[0]?.[1]).toMatchObject({ rpe: 7.5, rir: 1.5 });
});

test.each([
  ['kg', '40 kg'],
  ['lb', '40 lb'],
  [undefined, '40 (unit unknown)'],
] as const)(
  'previous actual load %s displays its own provenance beside current preferred inputs',
  async (unit, label) => {
    const movement = mockVersion.workouts[0]!.exercises[0]!;
    mockPreviousActuals = [
      {
        id: 'previous',
        sessionId: 'previous-session',
        workoutExerciseId: movement.id,
        exerciseId: movement.exerciseId,
        setNumber: 1,
        load: 40,
        loadUnit: unit,
        reps: 5,
        completedAt: '2026-10-12T12:00:00.000Z',
        idempotencyKey: 'previous',
      },
    ];
    const screen = await render(<ActiveWorkoutScreen />);
    await waitFor(() => expect(screen.getByLabelText('Back squat set 1 load')).toBeTruthy());
    await fireEvent.press(screen.getByText('Review all sets and adjustments'));
    expect(screen.getByText(new RegExp(`load ${label.replace(/[()]/g, '\\$&')}`))).toBeTruthy();
    expect(screen.queryByText(/saved units/)).toBeNull();
  },
);
test('optional voice review fills declared unsaved actuals and only normal Complete saves', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 load')).toBeTruthy());
  const actualUnit = screen.getByLabelText('Back squat set 1 load').props.placeholder;
  expect(screen.queryByLabelText('Speak a set entry')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Use optional voice set entry'));
  await fireEvent.press(screen.getByLabelText('Speak a set entry'));
  expect(mockSaveSet).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Use reviewed values in unsaved set'));
  expect(screen.getByLabelText('Back squat set 1 reps').props.value).toBe('8');
  expect(Number(screen.getByLabelText('Back squat set 1 load').props.value)).toBeCloseTo(
    actualUnit === 'kg' ? 40 * 0.45359237 : 40,
  );
  expect(mockSaveSet).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Complete Back squat set 1'));
  await waitFor(() => expect(mockSaveSet).toHaveBeenCalledTimes(1));
  expect(mockSaveSet.mock.calls[0]?.[1]).toMatchObject({ reps: 8, loadUnit: actualUnit });
});

test('an old voice review cannot overwrite a newer typed input before its next render', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 load')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Use optional voice set entry'));
  await fireEvent.press(screen.getByLabelText('Speak a set entry'));
  const staleApply = screen
    .getByLabelText('Use reviewed values in unsaved set')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  const type = screen.getByLabelText('Back squat set 1 load').props.onChangeText;
  await act(async () => {
    type('55');
    staleApply();
  });
  expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe('55');
  expect(mockSaveSet).not.toHaveBeenCalled();
});

test('same-event blur and focus return cannot revive a retained voice apply callback', async () => {
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Back squat set 1 load')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Back squat set 1 load'), '55');
  await fireEvent.press(screen.getByLabelText('Use optional voice set entry'));
  await fireEvent.press(screen.getByLabelText('Speak a set entry'));
  const staleApply = screen
    .getByLabelText('Use reviewed values in unsaved set')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    mockFocusLeave?.();
    mockFocusLeave = mockFocusEnter?.() ?? null;
    staleApply();
  });
  expect(screen.getByLabelText('Back squat set 1 load').props.value).toBe('55');
  expect(mockSaveSet).not.toHaveBeenCalled();
});

async function voiceGeometry() {
  jest.replaceProperty(Platform, 'OS', 'android');
  const events = new Map<string, (event: KeyboardEvent) => void>();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((name, callback) => {
    events.set(name, callback);
    return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
  jest.spyOn(Keyboard, 'metrics').mockReturnValue(undefined);
  const screen = await render(<ActiveWorkoutScreen />);
  await waitFor(() => expect(screen.getByLabelText('Use optional voice set entry')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Use optional voice set entry'));
  const input = {
    isFocused: jest.fn(() => true),
    measureInWindow: jest.fn((callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(0, 600, 320, 80),
    ),
  };
  const nativeViewport = {
    measureInWindow: jest.fn((callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(0, 80, 400, 500),
    ),
  };
  const content = {
    measureInWindow: jest.fn((callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(0, -120, 400, 1100),
    ),
  };
  const scroll = { getNativeScrollRef: () => nativeViewport, scrollTo: jest.fn() };
  (mockWorkoutScreenProps!.scrollViewRef as { current: ScrollView | null }).current =
    scroll as unknown as ScrollView;
  (mockWorkoutScreenProps!.scrollViewProps!.innerViewRef as { current: unknown }).current = content;
  const childCurrent = jest.fn(() => true);
  await act(() => mockVoiceProps!.onCorrectionFocus!(input as unknown as TextInput, childCurrent));
  const show = () =>
    events.get('keyboardDidShow')!({
      duration: 0,
      easing: 'keyboard',
      endCoordinates: { screenY: 420, screenX: 0, width: 400, height: 340 },
    });
  return { screen, input, nativeViewport, content, scroll, childCurrent, events, show };
}

test('voice correction reserves measured Android overlap before scrolling its whole edit area; native viewport resizing removes extra space', async () => {
  const { screen, scroll, nativeViewport, show, events } = await voiceGeometry();
  const before = screen.getByLabelText('Back squat set 1 reps').props.value;
  await act(() => show());
  expect(scroll.scrollTo).not.toHaveBeenCalled();
  expect(mockWorkoutScreenProps!.contentContainerStyle).toEqual({ paddingBottom: 160 });
  mockWorkoutScreenProps!.scrollViewProps!.onContentSizeChange!(400, 1260);
  expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 460, animated: false });
  await act(() => events.get('keyboardDidHide')!({} as KeyboardEvent));
  expect(mockWorkoutScreenProps!.contentContainerStyle).toBeUndefined();
  scroll.scrollTo.mockClear();
  await act(() => show());
  expect(mockWorkoutScreenProps!.contentContainerStyle).toEqual({ paddingBottom: 160 });
  mockWorkoutScreenProps!.scrollViewProps!.onContentSizeChange!(400, 1260);
  expect(scroll.scrollTo).toHaveBeenCalledWith({ y: 460, animated: false });
  nativeViewport.measureInWindow.mockImplementation((callback) => callback(0, 80, 400, 340));
  await act(() => mockWorkoutScreenProps!.scrollViewProps!.onContentSizeChange!(400, 1100));
  expect(mockWorkoutScreenProps!.contentContainerStyle).toBeUndefined();
  await act(() => events.get('keyboardDidHide')!({} as KeyboardEvent));
  expect(mockWorkoutScreenProps!.contentContainerStyle).toBeUndefined();
  expect(screen.getByLabelText('Back squat set 1 reps').props.value).toBe(before);
  expect(mockSaveSet).not.toHaveBeenCalled();
});

test.each([
  'field blur',
  'screen blur',
  'child reset',
  'set input change',
  'hide widget',
  'keyboard hide',
])('delayed correction geometry refuses %s and never writes an actual set', async (change) => {
  const { screen, input, scroll, childCurrent, show, events } = await voiceGeometry();
  let measured!: (x: number, y: number, w: number, h: number) => void;
  input.measureInWindow.mockImplementation((callback) => {
    measured = callback;
  });
  await act(() => show());
  mockWorkoutScreenProps!.scrollViewProps!.onContentSizeChange!(400, 1260);
  if (change === 'field blur')
    await act(() => mockVoiceProps!.onCorrectionBlur!(input as unknown as TextInput));
  if (change === 'screen blur') await act(() => mockFocusLeave?.());
  if (change === 'child reset') childCurrent.mockReturnValue(false);
  if (change === 'set input change')
    await fireEvent.changeText(screen.getByLabelText('Back squat set 1 reps'), '6');
  if (change === 'hide widget')
    await fireEvent.press(screen.getByLabelText('Hide voice set entry'));
  if (change === 'keyboard hide')
    await act(() => events.get('keyboardDidHide')!({} as KeyboardEvent));
  await act(() => measured(0, 600, 320, 80));
  expect(scroll.scrollTo).not.toHaveBeenCalled();
  if (change !== 'child reset')
    expect(mockWorkoutScreenProps!.contentContainerStyle).toBeUndefined();
  expect(mockSaveSet).not.toHaveBeenCalled();
});
