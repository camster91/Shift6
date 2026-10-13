import { fireEvent, render, waitFor } from '@testing-library/react-native';
import NotificationsSettingsScreen from '../../app/notifications';
import { createDefaultNotificationPreferences as mockCreatePreferences } from '../domain/notifications';

let mockReleaseMode = 'guest-only';
const mockDatabase = {};
const mockRequestPermission = jest.fn(async () => 'denied');
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../db/context', () => ({ useLocalDatabase: () => mockDatabase }));
jest.mock('../config/env', () => ({
  runtimeConfig: {
    get releaseMode() {
      return mockReleaseMode;
    },
  },
}));
jest.mock('../services/UserIdentityProvider', () => ({ useCurrentUserId: () => 'guest-user' }));
jest.mock('../services/NotificationRuntimeProvider', () => ({
  useNotificationRuntime: () => ({
    refreshNow: jest.fn(async () => ({ status: 'permission-required' })),
  }),
}));
jest.mock('../services/notifications', () => ({
  createExpoNotificationProvider: () => ({
    getPermissionStatus: async () => 'denied',
    requestPermission: () => mockRequestPermission(),
  }),
}));
jest.mock('../db/notificationRepository', () => ({
  getNotificationPreferences: async () =>
    mockCreatePreferences('guest-user', '2026-10-12T12:00:00.000Z'),
  saveNotificationPreferences: jest.fn(async () => undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockReleaseMode = 'guest-only';
});

test('guest settings explain local storage and show a denial with an explicit retry', async () => {
  const screen = await render(<NotificationsSettingsScreen />);
  await waitFor(() => expect(screen.getByText('Denied')).toBeTruthy());
  expect(screen.getByText(/Notification choices stay on this device/)).toBeTruthy();
  expect(screen.queryByText(/queued for authenticated sync/)).toBeNull();
  expect(screen.queryByText('Not requested')).toBeNull();
  expect(mockRequestPermission).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Try allowing device notifications'));
  await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(1));
  expect(screen.getByText('Denied')).toBeTruthy();
});

test('connected settings retain the authenticated sync disclosure', async () => {
  mockReleaseMode = 'connected';
  const screen = await render(<NotificationsSettingsScreen />);
  await waitFor(() => expect(screen.getByText(/queued for authenticated sync/)).toBeTruthy());
});
