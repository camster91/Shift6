import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PersonalGoalScreen from '../../app/goal';
import { getActiveTrainingCycle, getLatestTrainingCycle } from '../db/cycleRepository';
import {
  appendPersonalObservation,
  createPersonalGoal,
  getPersonalGoal,
  getPersonalGoalDraft,
  getPersonalObservations,
  savePersonalGoalDraft,
  revisePersonalTarget,
} from '../db/personalGoalRepository';
import { getOnboardingProfile } from '../db/profileRepository';
import type { Shift } from '../domain/shift';
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'owner' }));
jest.mock('../db/cycleRepository', () => ({
  getActiveTrainingCycle: jest.fn(),
  getLatestTrainingCycle: jest.fn(),
}));
jest.mock('../db/personalGoalRepository', () => ({
  appendPersonalObservation: jest.fn(),
  createPersonalGoal: jest.fn(),
  getPersonalGoal: jest.fn(),
  getPersonalGoalDraft: jest.fn(),
  getPersonalObservations: jest.fn(),
  savePersonalGoalDraft: jest.fn(),
  revisePersonalTarget: jest.fn(),
  savePersonalReview: jest.fn(),
  setPersonalBaselineState: jest.fn(),
}));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: jest.fn() }));
const mockDb = {};
const goal: Shift = {
  id: 'goal',
  userId: 'owner',
  cycleId: 'cycle',
  programVersionId: 'plan',
  templateId: 'personal-entry-v1',
  blockObjective: 'My hold',
  protocol: {
    id: 'setup',
    version: 1,
    exerciseId: 'hold',
    variantId: 'hold',
    assistance: 'none',
    equipmentSetup: 'mat',
    metric: 'hold-duration',
    canonicalUnit: 'seconds',
    direction: 'higher',
  },
  target: 60,
  baseline: { state: 'deferred' },
  reviewState: 'missing',
  nextChoice: 'undecided',
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getActiveTrainingCycle).mockResolvedValue({
    id: 'cycle',
    userId: 'owner',
    programVersionId: 'plan',
    status: 'active',
    currentWeek: 1,
    startedAt: '2026-10-12T00:00:00Z',
    weeks: [],
  });
  jest.mocked(getPersonalGoal).mockResolvedValue(null);
  jest.mocked(getPersonalGoalDraft).mockResolvedValue(null);
  jest.mocked(getPersonalObservations).mockResolvedValue([]);
  jest.mocked(savePersonalGoalDraft).mockResolvedValue(undefined);
});
test('restores a local draft and does not accept a blank target as zero', async () => {
  jest
    .mocked(getPersonalGoalDraft)
    .mockResolvedValue({ objective: 'My recovered goal', target: '' });
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByDisplayValue('My recovered goal')).toBeTruthy());
  await fireEvent.press(screen.getByText('Save personal goal'));
  await waitFor(() => expect(screen.getByText('Enter a measurement using numbers.')).toBeTruthy());
  expect(createPersonalGoal).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Target (reps)'), '10');
  await waitFor(() =>
    expect(savePersonalGoalDraft).toHaveBeenCalledWith(
      mockDb,
      'owner',
      'cycle',
      expect.objectContaining({ target: '10' }),
    ),
  );
});
test('requires actual input and explicitly records a zero baseline', async () => {
  jest.mocked(getPersonalGoal).mockResolvedValue(goal);
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByText('My hold')).toBeTruthy());
  await fireEvent.press(screen.getByText('Save measurement'));
  await waitFor(() => expect(screen.getByText('Enter a measurement using numbers.')).toBeTruthy());
  expect(appendPersonalObservation).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Actual value (seconds)'), '0');
  await fireEvent.press(screen.getByText('Save as baseline'));
  await waitFor(() =>
    expect(appendPersonalObservation).toHaveBeenCalledWith(
      mockDb,
      'owner',
      expect.objectContaining({ shiftId: 'goal', value: 0, unit: 'seconds', source: 'assessment' }),
      true,
      expect.any(String),
    ),
  );
});

test('completion measurements require an explicit result and preserve a failed attempt', async () => {
  jest.mocked(getPersonalGoal).mockResolvedValue({
    ...goal,
    target: true,
    protocol: {
      ...goal.protocol,
      metric: 'completion',
      canonicalUnit: 'completed',
      direction: 'complete',
    },
  });
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByText('My hold')).toBeTruthy());
  await fireEvent.press(screen.getByText('Save measurement'));
  await waitFor(() => expect(screen.getByText('Choose completed or not completed.')).toBeTruthy());
  expect(appendPersonalObservation).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Not completed'));
  await fireEvent.press(screen.getByText('Save as baseline'));
  await waitFor(() =>
    expect(appendPersonalObservation).toHaveBeenCalledWith(
      mockDb,
      'owner',
      expect.objectContaining({ value: false, unit: 'completed' }),
      true,
      expect.any(String),
    ),
  );
});

test('measurement choices expose the selected state to assistive technology', async () => {
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Repetitions', selected: true })).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Hold in seconds' }));
  expect(screen.getByRole('button', { name: 'Hold in seconds', selected: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Repetitions', selected: false })).toBeTruthy();
});

test('the goal remains reviewable after its training cycle has completed', async () => {
  jest.mocked(getActiveTrainingCycle).mockResolvedValue(null);
  jest.mocked(getLatestTrainingCycle).mockResolvedValue({
    id: 'cycle',
    userId: 'owner',
    programVersionId: 'plan',
    status: 'complete',
    currentWeek: 6,
    startedAt: '2026-10-12T00:00:00Z',
    weeks: [],
  });
  jest.mocked(getPersonalGoal).mockResolvedValue(goal);
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByText('My hold')).toBeTruthy());
  expect(screen.getByText('Review and next step')).toBeTruthy();
  expect(getLatestTrainingCycle).toHaveBeenCalledWith(mockDb, 'owner');
});

test('a completed cycle without a goal offers a new plan instead of an unusable creation form', async () => {
  jest.mocked(getActiveTrainingCycle).mockResolvedValue(null);
  jest.mocked(getLatestTrainingCycle).mockResolvedValue({
    id: 'cycle',
    userId: 'owner',
    programVersionId: 'plan',
    status: 'complete',
    currentWeek: 6,
    startedAt: '2026-10-12T00:00:00Z',
    weeks: [],
  });
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByText('Choose a plan')).toBeTruthy());
  expect(screen.queryByLabelText('What do you want to track?')).toBeNull();
});

test('imperial load creation stores a canonical target and tags its recoverable draft', async () => {
  jest
    .mocked(getOnboardingProfile)
    .mockResolvedValue({ user: { unitSystem: 'imperial' } } as Awaited<
      ReturnType<typeof getOnboardingProfile>
    >);
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByText('Load for a fixed rep count (lb)')).toBeTruthy());
  await fireEvent.press(screen.getByText('Load for a fixed rep count (lb)'));
  await fireEvent.changeText(screen.getByLabelText('What do you want to track?'), 'My press');
  await fireEvent.changeText(screen.getByLabelText('Fixed rep count'), '5');
  await fireEvent.changeText(screen.getByLabelText('Target (lb)'), '100');
  await fireEvent.press(screen.getByText('Save personal goal'));
  await waitFor(() => expect(createPersonalGoal).toHaveBeenCalled());
  expect(jest.mocked(createPersonalGoal).mock.calls[0]![3]).toEqual(
    expect.objectContaining({
      target: 45.359237,
      protocol: expect.objectContaining({ canonicalUnit: 'kg', repCount: 5 }),
    }),
  );
  expect(savePersonalGoalDraft).toHaveBeenLastCalledWith(
    mockDb,
    'owner',
    'cycle',
    expect.objectContaining({ inputUnits: 'imperial', target: '100' }),
  );
});

test('old canonical drafts keep kg even when the profile prefers imperial', async () => {
  jest
    .mocked(getOnboardingProfile)
    .mockResolvedValue({ user: { unitSystem: 'imperial' } } as Awaited<
      ReturnType<typeof getOnboardingProfile>
    >);
  jest.mocked(getPersonalGoalDraft).mockResolvedValue({
    objective: 'Old draft',
    metric: 'load-for-reps',
    target: '50',
    repCount: '5',
  });
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByDisplayValue('Old draft')).toBeTruthy());
  expect(screen.getByLabelText('Target (kg)').props.value).toBe('50');
  await fireEvent.press(screen.getByText('Save personal goal'));
  await waitFor(() => expect(createPersonalGoal).toHaveBeenCalled());
  expect(jest.mocked(createPersonalGoal).mock.calls[0]![3].target).toBe(50);
});

test('imperial fixed distance uses miles while measured time remains seconds', async () => {
  jest
    .mocked(getOnboardingProfile)
    .mockResolvedValue({ user: { unitSystem: 'imperial' } } as Awaited<
      ReturnType<typeof getOnboardingProfile>
    >);
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByText('Distance in miles')).toBeTruthy());
  await fireEvent.press(screen.getByText('Time for a fixed distance (seconds)'));
  await fireEvent.changeText(screen.getByLabelText('Fixed distance (miles)'), '1');
  await fireEvent.changeText(screen.getByLabelText('Target (seconds)'), '600');
  await fireEvent.press(screen.getByText('Save personal goal'));
  await waitFor(() => expect(createPersonalGoal).toHaveBeenCalled());
  expect(jest.mocked(createPersonalGoal).mock.calls[0]![3]).toEqual(
    expect.objectContaining({
      target: 600,
      protocol: expect.objectContaining({
        fixedDistanceMeters: 1609.344,
        canonicalUnit: 'seconds',
      }),
    }),
  );
});

test('imperial baseline, correction and target revision all persist kilograms', async () => {
  jest
    .mocked(getOnboardingProfile)
    .mockResolvedValue({ user: { unitSystem: 'imperial' } } as Awaited<
      ReturnType<typeof getOnboardingProfile>
    >);
  jest.mocked(getPersonalGoal).mockResolvedValue({
    ...goal,
    target: 45.359237,
    protocol: {
      ...goal.protocol,
      metric: 'load-for-reps',
      canonicalUnit: 'kg',
      repCount: 5,
      direction: 'higher',
    },
  });
  jest.mocked(getPersonalObservations).mockResolvedValue([
    {
      id: 'old',
      shiftId: 'goal',
      protocolId: 'setup',
      protocolVersion: 1,
      measuredAt: '2026-10-12T00:00:00Z',
      source: 'assessment',
      unit: 'lb',
      value: 90,
    },
  ]);
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByLabelText('Actual value (lb)')).toBeTruthy());
  expect(screen.getByText('Target: 100 lb')).toBeTruthy();
  expect(screen.getByText(/Latest: 90 lb/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Actual value (lb)'), '95');
  await fireEvent.press(screen.getByText('Save as baseline'));
  await waitFor(() => expect(appendPersonalObservation).toHaveBeenCalled());
  expect(jest.mocked(appendPersonalObservation).mock.calls[0]![2].value).toBeCloseTo(
    43.09127515,
    8,
  );
  await fireEvent.press(screen.getByText('Correct this entry'));
  expect(Number(screen.getByLabelText('Actual value (lb)').props.value)).toBeCloseTo(90, 10);
  await fireEvent.changeText(screen.getByLabelText('Actual value (lb)'), '100');
  await fireEvent.press(screen.getByText('Save correction'));
  await waitFor(() => expect(appendPersonalObservation).toHaveBeenCalledTimes(2));
  expect(jest.mocked(appendPersonalObservation).mock.calls[1]![2]).toEqual(
    expect.objectContaining({
      value: 45.359237,
      unit: 'kg',
      correctsObservationId: 'old',
      measuredAt: '2026-10-12T00:00:00Z',
    }),
  );
  await fireEvent.changeText(screen.getByLabelText('New target (lb)'), '110');
  await fireEvent.changeText(screen.getByLabelText('Reason for changing target'), 'Next goal');
  await fireEvent.press(screen.getByText('Save target revision'));
  await waitFor(() => expect(revisePersonalTarget).toHaveBeenCalled());
  expect(jest.mocked(revisePersonalTarget).mock.calls[0]![3]).toBeCloseTo(49.8951607, 8);
});

test('imperial distance targets and measured results share the same conversion', async () => {
  jest
    .mocked(getOnboardingProfile)
    .mockResolvedValue({ user: { unitSystem: 'imperial' } } as Awaited<
      ReturnType<typeof getOnboardingProfile>
    >);
  jest.mocked(getPersonalGoal).mockResolvedValue({
    ...goal,
    target: 3218.688,
    protocol: {
      ...goal.protocol,
      metric: 'distance',
      canonicalUnit: 'meters',
      direction: 'higher',
    },
  });
  const screen = await render(<PersonalGoalScreen />);
  await waitFor(() => expect(screen.getByLabelText('Actual value (miles)')).toBeTruthy());
  expect(screen.getByText('Target: 2 miles')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Actual value (miles)'), '1');
  await fireEvent.press(screen.getByText('Save measurement'));
  await waitFor(() => expect(appendPersonalObservation).toHaveBeenCalled());
  expect(jest.mocked(appendPersonalObservation).mock.calls[0]![2]).toEqual(
    expect.objectContaining({ value: 1609.344, unit: 'meters' }),
  );
});
