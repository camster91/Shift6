import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import MemoryScreen from '../../app/coach-memory';
import { demoUser as mockUser } from '../domain/fixtures/home';
import type { CoachMemorySnapshot } from '../db/coachMemoryRepository';
const mockDb = {},
  mockConfirm = jest.fn(),
  mockForget = jest.fn(),
  mockEnable = jest.fn();
let mockOwner = 'owner',
  mockSnapshot: CoachMemorySnapshot;
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDb }));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => mockOwner }));
jest.mock('../db/coachMemoryRepository', () => ({
  getCoachMemorySnapshot: async () => mockSnapshot,
  confirmCoachMemoryFact: (...args: unknown[]) => mockConfirm(...args),
  forgetCoachMemoryFact: (...args: unknown[]) => mockForget(...args),
  setCoachMemoryEnabled: (...args: unknown[]) => mockEnable(...args),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockOwner = 'owner';
  mockSnapshot = {
    owner: 'owner',
    enabled: false,
    preferenceUpdatedAt: null,
    facts: [],
    profile: {
      user: { ...mockUser, id: 'owner' },
      coachTone: 'concise',
      coachIntervention: 'balanced',
      healthConnection: 'not-now',
      completedAt: '2026-10-13T12:00:00.000Z',
    },
  };
  mockConfirm.mockResolvedValue({});
  mockForget.mockResolvedValue(true);
  mockEnable.mockResolvedValue(undefined);
});
test('preview does not save, confirm callback is consumed once, and memory stays off', async () => {
  const screen = await render(<MemoryScreen />);
  await waitFor(() => expect(screen.getByLabelText('Preview practical preference')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Remember evening'));
  await fireEvent.press(screen.getByLabelText('Preview practical preference'));
  expect(mockConfirm).not.toHaveBeenCalled();
  const press = screen
    .getByLabelText('Confirm local memory change')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await act(async () => {
    press();
    press();
  });
  expect(mockConfirm).toHaveBeenCalledTimes(1);
  expect(mockConfirm.mock.calls[0]![1]).toEqual(
    expect.objectContaining({
      owner: 'owner',
      value: { kind: 'training-time', value: 'evening' },
      expectedRevision: 0,
      expectedPreferenceUpdatedAt: null,
    }),
  );
  expect(mockEnable).not.toHaveBeenCalled();
});
test('changed input or changed owner invalidates captured confirmation callbacks', async () => {
  const screen = await render(<MemoryScreen />);
  await waitFor(() => expect(screen.getByLabelText('Preview practical preference')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Preview practical preference'));
  const old = screen
    .getByLabelText('Confirm local memory change')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  await fireEvent.press(screen.getByLabelText('Remember evening'));
  await fireEvent.press(screen.getByLabelText('Preview practical preference'));
  await act(async () => old());
  expect(mockConfirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Preview practical preference'));
  const priorOwner = screen
    .getByLabelText('Confirm local memory change')
    .props.onStartShouldSetResponder.testOnly_pressabilityConfig().onPress;
  mockOwner = 'other';
  mockSnapshot = {
    ...mockSnapshot,
    owner: 'other',
    profile: { ...mockSnapshot.profile!, user: { ...mockSnapshot.profile!.user, id: 'other' } },
  };
  await screen.rerender(<MemoryScreen />);
  await act(async () => priorOwner());
  expect(mockConfirm).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Confirm local memory change')).toBeNull();
});
test('inspect conflict, enable preview and forget preview keep canonical records separate', async () => {
  mockSnapshot.facts = [
    {
      id: 'fact',
      userId: 'owner',
      value: { kind: 'training-time', value: 'evening' },
      revision: 1,
      operationId: 'op',
      confirmedAt: '2026-10-13T12:00:00.000Z',
      updatedAt: '2026-10-13T12:00:00.000Z',
    },
  ];
  mockSnapshot.profile!.user.preferredTrainingTime = 'morning';
  const screen = await render(<MemoryScreen />);
  await waitFor(() => expect(screen.getByLabelText('Review enabling local memory')).toBeTruthy());
  expect(screen.getByText(/Differs from your current setup/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Review enabling local memory'));
  expect(mockEnable).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Cancel memory preview'));
  await fireEvent.press(screen.getByLabelText('Review forgetting Training time'));
  expect(mockForget).not.toHaveBeenCalled();
  expect(
    screen.getByText(/Canonical records and previously exported files will not be deleted/),
  ).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Confirm local memory change'));
  expect(mockForget).toHaveBeenCalledWith(
    mockDb,
    'owner',
    'fact',
    1,
    null,
    expect.any(String),
    expect.any(Function),
  );
});
