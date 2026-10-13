import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import CoachScreen from '../../app/(tabs)/coach';
import { demoUser, demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { createTrainingCycle } from '../domain/cycle';
let mockFocus: (() => void) | null = null;
let mockCompleted = 0,
  mockPrecycle = false;
const mockDatabase = {},
  mockRemote = jest.fn();
const mockNavigation = jest.fn();
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
  getCoachPrivacyPreference: async () => ({ providerCoachEnabled: false }),
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
  mockCompleted = 0;
  mockPrecycle = false;
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
  await fireEvent.press(screen.getByLabelText("Explain today's workout"));
  await waitFor(() =>
    expect(screen.getAllByText(/Actually scheduled session is a/).length).toBeGreaterThan(0),
  );
  mockCompleted = 2;
  await act(async () => {
    mockFocus?.();
  });
  await waitFor(() => expect(screen.getByLabelText('Review my progress')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Review my progress'));
  await waitFor(() => expect(screen.getByText(/2 of 6 workouts are recorded/)).toBeTruthy());
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
