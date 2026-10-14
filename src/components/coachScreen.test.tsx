import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import CoachScreen from '../../app/(tabs)/coach';
import { router } from 'expo-router';
import { resolveCoachNavigation } from '../services/coachNavigation';
import { demoUser, demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createTrainingCycle } from '../domain/cycle';
import type { CoachMemorySnapshot } from '../db/coachMemoryRepository';
let mockFocus: (() => void) | null = null;
let mockCompleted = 0,
  mockPrecycle = false;
const mockDatabase = {},
  mockRemote = jest.fn();
const mockNavigation = jest.fn();
let mockMemorySnapshot: CoachMemorySnapshot;
let mockPrivacyEnabled = false;
const mockMemoryRead = jest.fn();
jest.mock('../db/coachMemoryRepository', () => ({
  getCoachMemorySnapshot: (...args: unknown[]) => mockMemoryRead(...args),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => {
      mockFocus = callback;
      return callback();
    }, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'owner' }));
jest.mock('../services/AppServicesProvider', () => ({
  useAppServices: () => ({
    analytics: { track: jest.fn() },
    coach: { generateMessage: mockRemote },
  }),
}));
jest.mock('../services/coachNavigation', () => ({
  loadCoachNavigationSnapshot: (...args: unknown[]) => mockNavigation(...args),
  resolveCoachNavigation: jest.fn(),
}));
jest.mock('../db/coachPrivacyRepository', () => ({
  getCoachPrivacyPreference: async () => ({ providerCoachEnabled: mockPrivacyEnabled }),
}));
jest.mock('../db/coachRepository', () => ({ getPendingCoachProposals: async () => [] }));
jest.mock('../db/progressRepository', () => ({
  getCycleProgressSummary: async () => ({
    facts: {
      completedWorkoutCount: mockCompleted,
      plannedWorkoutCount: 6,
      completionRate: mockCompleted / 6,
      cardioMinutes: 0,
      personalRecordIds: [],
    },
  }),
}));
beforeEach(() => {
  jest.clearAllMocks();
  (resolveCoachNavigation as jest.Mock).mockResolvedValue({
    status: 'ready-to-open',
    owner: 'owner',
    route: '/coach-review',
  });
  mockCompleted = 0;
  mockPrecycle = false;
  mockPrivacyEnabled = false;
  mockMemoryRead.mockImplementation(async () => mockMemorySnapshot);
  mockMemorySnapshot = {
    owner: 'owner',
    profile: null,
    enabled: false,
    preferenceUpdatedAt: null,
    facts: [],
  };
  mockNavigation.mockImplementation(async () => {
    const workout = { ...demoProgramVersion.workouts[0]!, title: 'Actually scheduled session' };
    const version = { ...demoProgramVersion, workouts: [workout] };
    const cycle = createTrainingCycle({
      id: 'cycle',
      userId: 'owner',
      programVersion: version,
      startedAt: '2026-10-12T12:00:00.000Z',
    });
    return {
      owner: 'owner',
      profile: mockPrecycle ? null : { user: { ...demoUser, id: 'owner' } },
      cycle: mockPrecycle ? null : cycle,
      snapshot: mockPrecycle ? null : { program: demoProgram, version },
      selection: mockPrecycle ? null : { workout, basis: 'scheduled', scheduledDate: '2026-10-12' },
      guidanceId: null,
      hasProfile: !mockPrecycle,
      hasCycle: !mockPrecycle,
    };
  });
});
test('local Coach explains the selected workout and refreshes facts when its tab returns', async () => {
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByLabelText("Explain today's workout")).toBeTruthy());
  expect(
    screen.getByText('Coach guidance will stay grounded in your saved plan and logged training.'),
  ).toBeTruthy();
  expect(screen.queryByText(/approved plan/)).toBeNull();
  await fireEvent.press(screen.getByLabelText("Explain today's workout"));
  await waitFor(() =>
    expect(screen.getAllByText(/Actually scheduled session is a/).length).toBeGreaterThan(0),
  );
  mockCompleted = 2;
  await act(async () => {
    mockFocus?.();
  });
  await waitFor(() => expect(screen.getByLabelText('Review recent training')).toBeTruthy());
  expect(screen.queryByLabelText('Review my progress')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Review recent training'));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/coach-review'));
  expect(resolveCoachNavigation).toHaveBeenCalledWith(mockDatabase, 'owner', 'open-local-review');
  expect(mockRemote).not.toHaveBeenCalled();
  expect(mockNavigation.mock.calls.length).toBeGreaterThan(1);
});
test('pre-cycle Coach offers setup controls without invented training context', async () => {
  mockPrecycle = true;
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByLabelText('Continue setup')).toBeTruthy());
  expect(screen.getByText('No active plan yet')).toBeTruthy();
  expect(screen.queryByLabelText("Explain today's workout")).toBeNull();
  expect(mockRemote).not.toHaveBeenCalled();
});

function enablePracticalMemory() {
  mockMemorySnapshot = {
    ...mockMemorySnapshot,
    enabled: true,
    profile: {
      user: { ...demoUser, id: 'owner' },
      coachTone: 'concise',
      coachIntervention: 'balanced',
      healthConnection: 'not-now',
      completedAt: '2026-10-13T12:00:00.000Z',
    },
    facts: [
      {
        id: 'local-fact',
        userId: 'owner',
        value: { kind: 'training-time', value: 'evening' },
        revision: 1,
        operationId: 'confirmed',
        confirmedAt: '2026-10-13T12:00:00.000Z',
        updatedAt: '2026-10-13T12:00:00.000Z',
      },
    ],
  };
}
test('enabled local memory is discarded on a focus refresh after disabling', async () => {
  enablePracticalMemory();
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByText(/Training time: evening/)).toBeTruthy());
  mockMemorySnapshot = { ...mockMemorySnapshot, enabled: false };
  await act(async () => {
    mockFocus?.();
  });
  await waitFor(() => expect(screen.getByLabelText("Explain today's workout")).toBeTruthy());
  expect(screen.queryByText(/Training time: evening/)).toBeNull();
});
test('provider context receives no confirmed preference value or local memory identifier', async () => {
  enablePracticalMemory();
  mockPrivacyEnabled = true;
  mockRemote.mockResolvedValue({ kind: 'message', text: 'Synthetic remote note', factsUsed: [] });
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByText('Provider-backed Coach enabled')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Explain today's workout"));
  await waitFor(() => expect(screen.getByText('Synthetic remote note')).toBeTruthy());
  expect(JSON.stringify(mockRemote.mock.calls[0]![0])).not.toMatch(
    /evening|local-fact|confirmed local practical preferences/,
  );
});

test('returning to Coach invalidates an old pending request without leaving Ask disabled', async () => {
  mockPrivacyEnabled = true;
  let release!: (value: unknown) => void;
  mockRemote.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByText('Provider-backed Coach enabled')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Explain today's workout"));
  await waitFor(() => expect(screen.getByLabelText(/^Coach is thinking/)).toBeDisabled());
  expect(screen.getByLabelText('Review recent training')).not.toBeDisabled();
  await act(async () => {
    mockFocus?.();
  });
  await waitFor(() => expect(screen.getByLabelText('Review recent training')).not.toBeDisabled());
  await act(async () => {
    release({ kind: 'message', text: 'Stale pending answer', factsUsed: [] });
  });
  expect(screen.queryByText('Stale pending answer')).toBeNull();
  expect(screen.getByLabelText('Review recent training')).not.toBeDisabled();
});

test('an urgent response never waits for optional memory and immediately releases Ask controls', async () => {
  mockPrivacyEnabled = true;
  mockRemote.mockResolvedValue({
    kind: 'safety-route',
    text: 'Synthetic urgent guidance: stop exercising.',
    factsUsed: ['deterministic safety classifier'],
  });
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByText('Provider-backed Coach enabled')).toBeTruthy());
  const initialReads = mockMemoryRead.mock.calls.length;
  mockMemoryRead.mockImplementation(() => new Promise(() => {}));
  await fireEvent.press(screen.getByLabelText("Explain today's workout"));
  await waitFor(() =>
    expect(screen.getByText('Synthetic urgent guidance: stop exercising.')).toBeTruthy(),
  );
  expect(mockMemoryRead).toHaveBeenCalledTimes(initialReads);
  expect(screen.getByLabelText('Review recent training')).not.toBeDisabled();
});

test('initial optional memory read cannot block canonical Coach controls or explanations', async () => {
  mockMemoryRead.mockImplementation(() => new Promise(() => {}));
  const screen = await render(<CoachScreen />);
  await waitFor(() => expect(screen.getByLabelText("Explain today's workout")).toBeTruthy());
  await fireEvent.press(screen.getByLabelText("Explain today's workout"));
  await waitFor(() =>
    expect(screen.getAllByText(/Actually scheduled session is a/).length).toBeGreaterThan(1),
  );
  expect(screen.getByLabelText('Review recent training')).not.toBeDisabled();
});
