import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { ShiftArtwork } from './ShiftArtwork';

const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  addListener: jest.fn((_event: string, _listener: (event: { status: string }) => void) => ({
    remove: jest.fn(),
  })),
};

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: number, setup: (player: typeof mockPlayer) => void) => {
    setup(mockPlayer);
    return mockPlayer;
  },
  VideoView: 'MockVideoView',
}));

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});
afterEach(() => jest.restoreAllMocks());

test('does not load or autoplay motion until the user requests it', async () => {
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  await waitFor(() => expect(screen.getByLabelText('Play animation')).toBeTruthy());
  expect(mockPlayer.play).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Play animation'));
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByLabelText('Stop animation'));
  expect(mockPlayer.pause).toHaveBeenCalled();
});

test('keeps the still and suppresses motion when reduced motion is enabled', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  expect(screen.queryByLabelText('Play animation')).toBeNull();
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test('backgrounding stops playback and foregrounding does not restart it', async () => {
  let onState: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    onState = listener;
    return { remove: jest.fn() };
  });
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  await waitFor(() => expect(screen.getByLabelText('Play animation')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Play animation'));
  await act(() => onState?.('background'));
  expect(mockPlayer.pause).toHaveBeenCalled();
  await act(() => onState?.('active'));
  expect(screen.getByLabelText('Play animation')).toBeTruthy();
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

test('a newer accessibility change wins over a stale initial preference read', async () => {
  let resolve: ((value: boolean) => void) | undefined;
  let onPreference: ((value: boolean) => void) | undefined;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockImplementation((_event: string, listener: unknown) => {
      onPreference = listener as (value: boolean) => void;
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof AccessibilityInfo.addEventListener
      >;
    });
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  await act(() => {
    onPreference?.(true);
    resolve?.(false);
  });
  expect(screen.queryByLabelText('Play animation')).toBeNull();
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test('a media decoding error restores the still without blocking the screen', async () => {
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  await waitFor(() => expect(screen.getByLabelText('Play animation')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Play animation'));
  const onStatus = mockPlayer.addListener.mock.calls.find(
    ([event]) => event === 'statusChange',
  )?.[1];
  await act(() => onStatus?.({ status: 'error' }));
  expect(screen.queryByLabelText('Stop animation')).toBeNull();
  expect(screen.getByText('Still artwork is available.')).toBeTruthy();
  expect(mockPlayer.pause).toHaveBeenCalled();
});

test('completion returns to the still without looping', async () => {
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  await waitFor(() => expect(screen.getByLabelText('Play animation')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Play animation'));
  const onEnd = mockPlayer.addListener.mock.calls.find(([event]) => event === 'playToEnd')?.[1];
  await act(() => onEnd?.({ status: 'readyToPlay' }));
  expect(screen.getByLabelText('Play animation')).toBeTruthy();
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
});

test('leaving the screen pauses its player', async () => {
  const screen = await render(<ShiftArtwork poster={1} motionSource={2} />);
  await waitFor(() => expect(screen.getByLabelText('Play animation')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Play animation'));
  await screen.unmount();
  expect(mockPlayer.pause).toHaveBeenCalled();
});
