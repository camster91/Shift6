import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../../app/onboarding';
import type { OnboardingRecoveryState } from '../domain/onboardingRecovery';
import { createOnboardingDraft } from '../domain/onboarding';

const mockDatabase = {};
let mockOwner = 'guest-user';
let mockRecovery: OnboardingRecoveryState | null = null;
const mockSaveDraft = jest.fn(
  async (_database: unknown, _owner: string, state: OnboardingRecoveryState) => {
    mockRecovery = JSON.parse(JSON.stringify(state));
  },
);
const mockClearDraft = jest.fn(async (_database: unknown, _owner: string) => {
  mockRecovery = null;
});
const mockSaveProfile = jest.fn(async (_database: unknown, _profile: unknown) => undefined);
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('./artwork/ShiftArtwork', () => ({ ShiftArtwork: () => null }));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: async () => null,
  saveOnboardingProfile: (database: unknown, profile: unknown) =>
    mockSaveProfile(database, profile),
}));
jest.mock('../db/considerationsRepository', () => ({
  getUserConsiderations: async (_database: unknown, owner: string) => ({
    userId: owner,
    movementConsiderations: [],
    accessibilityNeeds: [],
    updatedAt: 'now',
  }),
  saveUserConsiderations: async () => undefined,
}));
jest.mock('../db/onboardingDraftRepository', () => ({
  getOnboardingDraft: async () => mockRecovery,
  saveOnboardingDraft: (database: unknown, owner: string, state: OnboardingRecoveryState) =>
    mockSaveDraft(database, owner, state),
  clearOnboardingDraft: (database: unknown, owner: string) => mockClearDraft(database, owner),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockOwner = 'guest-user';
  mockRecovery = null;
  mockSaveDraft.mockImplementation(async (_database, _owner, state) => {
    mockRecovery = JSON.parse(JSON.stringify(state));
  });
});

const ready = async () => {
  const screen = await render(<OnboardingScreen />);
  await waitFor(() => expect(screen.getByText('What do you want to work toward?')).toBeTruthy());
  return screen;
};

test('does not create phantom guest data just by opening setup', async () => {
  await ready();
  expect(mockSaveDraft).not.toHaveBeenCalled();
  expect(mockSaveProfile).not.toHaveBeenCalled();
});

test('fresh setup restore entry leaves the installation empty until file confirmation', async () => {
  const screen = await ready();
  await fireEvent.press(screen.getByLabelText('Restore a local export instead'));
  expect(mockPush).toHaveBeenCalledWith('/restore');
  expect(mockSaveDraft).not.toHaveBeenCalled();
  expect(mockSaveProfile).not.toHaveBeenCalled();
});

test('shows persistent required-choice guidance and clears it after selecting a goal', async () => {
  const screen = await ready();
  expect(
    screen.getByLabelText('Required to continue: primary goal. Scroll to find these choices.'),
  ).toBeTruthy();
  expect(screen.getByLabelText('Continue')).toBeDisabled();
  await fireEvent.press(
    screen.getByLabelText('General health. Build a balanced, sustainable routine.'),
  );
  expect(
    screen.queryByText('To continue, choose: primary goal. Scroll to find these choices.'),
  ).toBeNull();
  expect(screen.getByLabelText('Continue')).toBeEnabled();
});

test('restores step four and explains the training-time choice until it is saved', async () => {
  mockRecovery = {
    version: 1,
    flow: 'essential',
    step: 3,
    draft: {
      ...createOnboardingDraft('You'),
      goals: ['general-health'],
      experience: 'beginner',
      equipmentIds: ['equipment-bodyweight'],
      trainingDaysPerWeek: 3,
      preferredSessionMinutes: 30,
      coachTone: 'supportive',
      coachIntervention: 'conservative',
      healthConnection: 'not-now',
    },
    movementConsiderations: [],
    accessibilityNeeds: [],
  };
  const screen = await render(<OnboardingScreen />);
  const hint =
    'Required to continue: usual training time (Morning, Afternoon or Evening). Scroll to find these choices.';
  await waitFor(() => expect(screen.getByLabelText(hint)).toBeTruthy());
  expect(screen.getByLabelText('Continue')).toBeDisabled();
  await fireEvent.press(
    screen.getByLabelText('Evening. Make training part of your wind-down routine.'),
  );
  expect(screen.queryByLabelText(hint)).toBeNull();
  expect(screen.getByLabelText('Continue')).toBeEnabled();
  await fireEvent.press(screen.getByLabelText('Continue'));
  await waitFor(() => expect(screen.getByText('Which units feel natural?')).toBeTruthy());
  expect(mockRecovery?.draft.preferredTrainingTime).toBe('evening');
  expect(mockRecovery?.step).toBe(4);
});

test('persists a completed step before advancing and restores it after remount', async () => {
  const first = await ready();
  await fireEvent.press(
    first.getByLabelText('General health. Build a balanced, sustainable routine.'),
  );
  await fireEvent.press(first.getByLabelText('Continue'));
  await waitFor(() => expect(first.getByText('Where are you starting from?')).toBeTruthy());
  expect(mockRecovery?.step).toBe(1);
  expect(mockRecovery?.draft.goals).toEqual(['general-health']);
  expect(mockSaveProfile).not.toHaveBeenCalled();
  await first.unmount();
  const restored = await render(<OnboardingScreen />);
  await waitFor(() => expect(restored.getByText('Where are you starting from?')).toBeTruthy());
  expect(mockSaveDraft.mock.calls.every((call) => call[1] === 'guest-user')).toBe(true);
});

test('keeps a failed checkpoint on the current question with a reachable alert', async () => {
  const screen = await ready();
  mockSaveDraft.mockRejectedValue(new Error('Disk unavailable'));
  await fireEvent.press(
    screen.getByLabelText('General health. Build a balanced, sustainable routine.'),
  );
  await fireEvent.press(screen.getByLabelText('Continue'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getByText('What do you want to work toward?')).toBeTruthy();
  expect(screen.queryByText('Where are you starting from?')).toBeNull();
  expect(mockSaveProfile).not.toHaveBeenCalled();
});

test('clears recovery only after a successful explicit setup save', async () => {
  mockRecovery = {
    version: 1,
    flow: 'essential',
    step: 5,
    draft: {
      ...createOnboardingDraft('You'),
      goals: ['general-health'],
      experience: 'beginner',
      equipmentIds: ['equipment-barbell'],
      trainingDaysPerWeek: 3,
      preferredSessionMinutes: 30,
      preferredTrainingTime: 'evening',
      unitSystem: 'metric',
      coachTone: 'supportive',
      coachIntervention: 'conservative',
      healthConnection: 'not-now',
    },
    movementConsiderations: [],
    accessibilityNeeds: [],
  };
  const screen = await render(<OnboardingScreen />);
  await waitFor(() => expect(screen.getByLabelText('Save setup')).toBeTruthy());
  expect(screen.getByText(/No account or cloud backup is available in this release/)).toBeTruthy();
  expect(screen.queryByText(/can be migrated when you create an account/)).toBeNull();
  await fireEvent.press(screen.getByLabelText('Save setup'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/programs'));
  expect(mockSaveProfile).toHaveBeenCalledTimes(1);
  expect(mockClearDraft).toHaveBeenCalledTimes(1);
  expect(mockSaveProfile.mock.invocationCallOrder[0]).toBeLessThan(
    mockClearDraft.mock.invocationCallOrder[0]!,
  );
  expect(mockRecovery).toBeNull();
});
