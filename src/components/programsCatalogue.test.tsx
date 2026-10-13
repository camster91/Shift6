import { fireEvent, render } from '@testing-library/react-native';
import ProgramsScreen from '../../app/(tabs)/programs';

const mockPush = jest.fn();
let mockProgramsAvailable = false;
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useFocusEffect: () => undefined,
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => null }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../domain/runtimeContentGates', () => ({
  isProgramStartAllowed: () => mockProgramsAvailable,
  getProgramRuntimeStatusLabel: () => 'Ready to start',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockProgramsAvailable = false;
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
