import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProgramsScreen from '../../app/(tabs)/programs';
import { demoProgram, demoProgramVersion } from '../domain/fixtures/home';
import { getSavedUserPrograms } from '../db/programRepository';

const mockPush = jest.fn();
let mockProgramsAvailable = false;
let mockDatabase: object | null = null;
let mockOwner = 'guest-user';
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../db/profileRepository', () => ({ getOnboardingProfile: async () => null }));
jest.mock('../db/programRepository', () => ({ getSavedUserPrograms: jest.fn() }));
jest.mock('../domain/runtimeContentGates', () => ({
  isProgramStartAllowed: () => mockProgramsAvailable,
  getProgramRuntimeStatusLabel: () => 'Ready to start',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockProgramsAvailable = false;
  mockDatabase = null;
  mockOwner = 'guest-user';
  jest.mocked(getSavedUserPrograms).mockResolvedValue([]);
});

test('saved private plans remain discoverable after remount with public content gated', async () => {
  mockDatabase = {};
  const snapshot = {
    program: { ...demoProgram, title: 'My saved private draft' },
    version: {
      ...demoProgramVersion,
      workouts: [{ ...demoProgramVersion.workouts[0]!, title: 'My saved workout' }],
    },
  };
  jest.mocked(getSavedUserPrograms).mockResolvedValue([snapshot]);
  const first = await render(<ProgramsScreen />);
  await waitFor(() => expect(first.getByText('My saved private draft')).toBeTruthy());
  expect(first.getByText(/My saved workout/)).toBeTruthy();
  expect(first.getByText('Public programs are under review')).toBeTruthy();
  await fireEvent.press(first.getByLabelText('Edit or start a copy of My saved private draft'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/builder',
    params: { sourceVersionId: snapshot.version.id },
  });
  expect(getSavedUserPrograms).toHaveBeenLastCalledWith(mockDatabase, 'guest-user');
  await first.unmount();
  const reopened = await render(<ProgramsScreen />);
  await waitFor(() => expect(reopened.getByText('My saved private draft')).toBeTruthy());
});

test('an owner change does not keep the previous owners private plans visible', async () => {
  mockDatabase = {};
  jest
    .mocked(getSavedUserPrograms)
    .mockResolvedValue([
      { program: { ...demoProgram, title: 'First owner private' }, version: demoProgramVersion },
    ]);
  const screen = await render(<ProgramsScreen />);
  await waitFor(() => expect(screen.getByText('First owner private')).toBeTruthy());
  mockOwner = 'second-owner';
  jest.mocked(getSavedUserPrograms).mockResolvedValue([]);
  await screen.rerender(<ProgramsScreen />);
  await waitFor(() => expect(screen.getByText('No private plans saved yet.')).toBeTruthy());
  expect(screen.queryByText('First owner private')).toBeNull();
  expect(getSavedUserPrograms).toHaveBeenLastCalledWith(mockDatabase, 'second-owner');
});

test('a failed read shows a retry instead of claiming the private library is empty', async () => {
  mockDatabase = {};
  jest.mocked(getSavedUserPrograms).mockRejectedValue(new Error('Unavailable'));
  const screen = await render(<ProgramsScreen />);
  await waitFor(() => expect(screen.getByLabelText('Retry saved plans')).toBeTruthy());
  expect(screen.queryByText('No private plans saved yet.')).toBeNull();
  jest.mocked(getSavedUserPrograms).mockResolvedValue([]);
  await fireEvent.press(screen.getByLabelText('Retry saved plans'));
  await waitFor(() => expect(screen.getByText('No private plans saved yet.')).toBeTruthy());
});

test('an unavailable public catalogue explains review and opens the private blank builder', async () => {
  const screen = await render(<ProgramsScreen />);
  expect(screen.getByText('Public programs are under review')).toBeTruthy();
  expect(screen.getByText(/after qualified content review/)).toBeTruthy();
  expect(screen.queryByText(/full launch catalogue/)).toBeNull();
  expect(screen.queryByLabelText('Show all programs')).toBeNull();
  expect(screen.queryByLabelText('Create a custom copy')).toBeNull();
  expect(screen.queryByLabelText('Recommended')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Build a private plan'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/builder', params: { mode: 'blank' } });
});

test('available program recommendations retain the catalogue controls', async () => {
  mockProgramsAvailable = true;
  const screen = await render(<ProgramsScreen />);
  expect(screen.getByLabelText('Recommended')).toBeTruthy();
  expect(screen.getByLabelText('Create a custom copy')).toBeTruthy();
  expect(screen.queryByText('Public programs are under review')).toBeNull();
});
