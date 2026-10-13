import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import OnboardingScreen, { SetupScreen } from '../../app/onboarding';
import type { OnboardingRecoveryState } from '../domain/onboardingRecovery';
import {
  createOnboardingDraft,
  toOnboardingProfile,
  type OnboardingDraft,
} from '../domain/onboarding';
import type { OnboardingProfile } from '../domain/types';

const mockDatabase = {};
let mockCurrentDatabase = mockDatabase;
let mockBlur: () => void;
let mockFocus: () => void;
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
const mockSaveProfile = jest.fn(
  async (_database: unknown, _profile: unknown): Promise<void> => undefined,
);
const mockGetProfile = jest.fn<Promise<OnboardingProfile | null>, []>(async () => null);
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => () => void) => {
    jest.requireActual('react').useEffect(() => {
      let cleanup = callback();
      mockBlur = () => cleanup();
      mockFocus = () => {
        cleanup = callback();
      };
      return () => cleanup();
    }, [callback]);
  },
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockCurrentDatabase }));
jest.mock('../db/onboardingConfirmation', () => ({
  setupChoiceSnapshot: jest.requireActual('../db/onboardingConfirmation').setupChoiceSnapshot,
  confirmOnboardingSetup: async (
    database: unknown,
    owner: string,
    state: OnboardingRecoveryState,
    _expected: unknown,
    date: string,
    current: () => boolean,
  ) => {
    if (!current()) throw new Error('Cancelled');
    await mockSaveProfile(
      database,
      jest.requireActual('../domain/onboarding').toOnboardingProfile(state.draft, date, owner),
    );
    if (!current()) throw new Error('Cancelled');
    await mockClearDraft(database, owner);
  },
}));
jest.mock('../config/env', () => ({ runtimeConfig: { releaseMode: 'guest-only' } }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({ analytics: { track: jest.fn() } }),
}));
jest.mock('./artwork/ShiftArtwork', () => ({ ShiftArtwork: () => null }));
jest.mock('../db/profileRepository', () => ({
  getOnboardingProfile: () => mockGetProfile(),
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
  mockCurrentDatabase = mockDatabase;
  mockRecovery = null;
  mockGetProfile.mockReset().mockResolvedValue(null);
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

const completeGuidedDraft = () => ({
  ...createOnboardingDraft('Sam'),
  goals: ['strength'] as ['strength'],
  experience: 'beginner' as const,
  equipmentIds: ['equipment-bodyweight'],
  trainingDaysPerWeek: 3,
  preferredSessionMinutes: 30,
  preferredTrainingTime: 'evening' as const,
  unitSystem: 'imperial' as const,
  coachTone: 'supportive' as const,
  coachIntervention: 'conservative' as const,
  healthConnection: 'not-now' as const,
});
const guidedRecovery = (
  draft: OnboardingDraft = completeGuidedDraft(),
): OnboardingRecoveryState => ({
  version: 1,
  flow: 'detailed',
  step: 9,
  draft,
  movementConsiderations: [],
  accessibilityNeeds: [],
});

test('guided setup reuses answers, reviews defaults explicitly and saves only after confirmation', async () => {
  mockRecovery = guidedRecovery();
  const screen = await render(<SetupScreen guided />);
  await waitFor(() => expect(screen.getByText('Units: Imperial')).toBeTruthy());
  expect(screen.getByText('Experience (self-described): Beginner')).toBeTruthy();
  expect(mockSaveProfile).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Edit Units'));
  await fireEvent.press(screen.getByLabelText('Metric. Kilograms, kilometres, and metres.'));
  await fireEvent.press(screen.getByLabelText('Continue'));
  await waitFor(() => expect(screen.getByText('Units: Metric')).toBeTruthy());
  expect(mockSaveProfile).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Confirm and save reviewed setup'));
  await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
  expect(mockSaveProfile.mock.calls[0]?.[1]).toMatchObject({
    user: { id: 'guest-user', unitSystem: 'metric' },
  });
});

test('guided missing choices survive interruption in the standard owner-scoped draft', async () => {
  mockRecovery = guidedRecovery({ ...completeGuidedDraft(), preferredTrainingTime: null });
  const screen = await render(<SetupScreen guided />);
  await waitFor(() => expect(screen.getByText('What fits your week?')).toBeTruthy());
  expect(screen.getByLabelText('Continue')).toBeDisabled();
  await fireEvent.press(
    screen.getByLabelText('Morning. Start the day with a clear training window.'),
  );
  await fireEvent.press(screen.getByLabelText('Continue'));
  await waitFor(() =>
    expect(screen.getByText(/Schedule: 3 days\/week.*30 minutes.*Morning/)).toBeTruthy(),
  );
  expect(mockRecovery?.flow).toBe('detailed');
  await screen.unmount();
  const reopened = await render(<SetupScreen guided />);
  await waitFor(() =>
    expect(reopened.getByText(/Schedule: 3 days\/week.*30 minutes.*Morning/)).toBeTruthy(),
  );
  expect(mockSaveProfile).not.toHaveBeenCalled();
});

test('guided confirmation is single-flight and failed save retains draft', async () => {
  mockRecovery = guidedRecovery();
  let rejectSave!: (error: Error) => void;
  mockSaveProfile.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectSave = reject;
      }),
  );
  const screen = await render(<SetupScreen guided />);
  await waitFor(() => expect(screen.getByText('Units: Imperial')).toBeTruthy());
  const confirm = screen.getByLabelText('Confirm and save reviewed setup');
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
  rejectSave(new Error('Disk unavailable'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(mockClearDraft).not.toHaveBeenCalled();
  expect(mockRecovery).not.toBeNull();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('returning guided user reviews the confirmed profile without repeating questions or saving', async () => {
  mockGetProfile.mockResolvedValue(
    toOnboardingProfile(completeGuidedDraft(), '2026-10-13T12:00:00.000Z', mockOwner),
  );
  const screen = await render(<SetupScreen guided />);
  await waitFor(() => expect(screen.getByText('Name: Sam')).toBeTruthy());
  expect(screen.getByText('Units: Imperial')).toBeTruthy();
  expect(screen.queryByText('Where are you starting from?')).toBeNull();
  expect(screen.getByText(/No reviewed program matches your setup yet/)).toBeTruthy();
  expect(mockSaveProfile).not.toHaveBeenCalled();
  expect(mockSaveDraft).not.toHaveBeenCalled();
});

test('late owner load cannot populate guided setup for a different owner', async () => {
  let finishOldLoad!: (profile: OnboardingProfile) => void;
  mockGetProfile.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishOldLoad = resolve;
      }),
  );
  const screen = await render(<SetupScreen guided />);
  mockOwner = 'second-owner';
  await screen.rerender(<SetupScreen guided />);
  await waitFor(() => expect(screen.getByText('What do you want to work toward?')).toBeTruthy());
  finishOldLoad(
    toOnboardingProfile(completeGuidedDraft(), '2026-10-13T12:00:00.000Z', 'guest-user'),
  );
  await waitFor(() => expect(screen.queryByText('Name: Sam')).toBeNull());
  expect(mockSaveProfile).not.toHaveBeenCalled();
  expect(mockSaveDraft).not.toHaveBeenCalled();
});

test.each(['owner', 'database', 'blur', 'unmount'] as const)(
  'pending confirmed save cannot clear recovery or navigate after %s changes',
  async (change) => {
    mockRecovery = guidedRecovery();
    let finish!: () => void;
    mockSaveProfile.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const screen = await render(<SetupScreen guided />);
    await waitFor(() => expect(screen.getByText('Units: Imperial')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Confirm and save reviewed setup'));
    await waitFor(() => expect(mockSaveProfile).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Back')).toBeDisabled();
    expect(screen.getByLabelText('Edit Units')).toBeDisabled();
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.queryByText('How should Coach show up?')).toBeNull();
    if (change === 'owner') {
      mockOwner = 'second-owner';
      await screen.rerender(<SetupScreen guided />);
    }
    if (change === 'database') {
      mockCurrentDatabase = {};
      await screen.rerender(<SetupScreen guided />);
    }
    if (change === 'blur')
      await act(async () => {
        mockBlur();
      });
    if (change === 'unmount') await screen.unmount();
    await act(async () => {
      finish();
    });
    expect(mockClearDraft).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    if (change === 'blur') {
      await act(async () => {
        mockFocus();
      });
      expect(screen.getByLabelText('Confirm and save reviewed setup')).toBeEnabled();
    }
  },
);

test('pending checkpoint freezes choice controls and retains the confirmed answer', async () => {
  const screen = await render(<SetupScreen guided />);
  await waitFor(() => expect(screen.getByText('What do you want to work toward?')).toBeTruthy());
  await fireEvent.press(
    screen.getByLabelText('General health. Build a balanced, sustainable routine.'),
  );
  await waitFor(() => expect(mockSaveDraft).toHaveBeenCalled());
  let finish!: () => void;
  mockSaveDraft.mockImplementationOnce(async (_db, _owner, state) => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    mockRecovery = JSON.parse(JSON.stringify(state));
  });
  await fireEvent.press(screen.getByLabelText('Continue'));
  await waitFor(() =>
    expect(
      screen.getByLabelText('Strength. Get stronger with progressive training.'),
    ).toBeDisabled(),
  );
  await fireEvent.press(screen.getByLabelText('Strength. Get stronger with progressive training.'));
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(screen.getByText('Where are you starting from?')).toBeTruthy());
  expect(mockRecovery?.draft.goals).toEqual(['general-health']);
  expect(mockSaveProfile).not.toHaveBeenCalled();
});
