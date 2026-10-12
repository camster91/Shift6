import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PersonalGoalScreen from '../../app/goal';
import { getActiveTrainingCycle } from '../db/cycleRepository';
import {
  appendPersonalObservation,
  createPersonalGoal,
  getPersonalGoal,
  getPersonalGoalDraft,
  getPersonalObservations,
  savePersonalGoalDraft,
} from '../db/personalGoalRepository';
import type { Shift } from '../domain/shift';
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'owner' }));
jest.mock('../db/cycleRepository', () => ({ getActiveTrainingCycle: jest.fn() }));
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
