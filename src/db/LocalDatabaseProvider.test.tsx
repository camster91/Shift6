import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { LocalDatabaseProvider } from './LocalDatabaseProvider';
import { useLocalDatabase } from './context';

const mockOpen = jest.fn(),
  mockInitialize = jest.fn();
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpen(...args),
}));
jest.mock('./migrations', () => ({
  migrateDatabase: (...args: unknown[]) => mockInitialize(...args),
}));

function Probe() {
  const database = useLocalDatabase();
  return <Text>{database ? 'Owned database ready' : 'No database'}</Text>;
}

test('provider retry gates children through failures and publishes only the successfully initialized handle', async () => {
  const first = { closeAsync: jest.fn(async () => undefined) };
  const second = { closeAsync: jest.fn(async () => undefined) };
  const third = { closeAsync: jest.fn(async () => undefined) };
  mockOpen.mockResolvedValueOnce(first).mockResolvedValueOnce(second).mockResolvedValueOnce(third);
  mockInitialize
    .mockRejectedValueOnce(new Error('AccessClosedResourceException private detail'))
    .mockRejectedValueOnce(new Error('SQLITE_BUSY private detail'))
    .mockResolvedValueOnce(undefined);
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const screen = await render(
    <LocalDatabaseProvider>
      <Probe />
    </LocalDatabaseProvider>,
  );
  try {
    await waitFor(() =>
      expect(screen.getByText('Your local record needs attention.')).toBeTruthy(),
    );
    expect(screen.queryByText('Owned database ready')).toBeNull();
    expect(screen.queryByText(/Your data was not changed/)).toBeNull();
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(mockInitialize).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Owned database ready')).toBeTruthy());
    expect(mockInitialize.mock.calls.map(([db]) => db)).toEqual([first, second, third]);
    expect(first.closeAsync).toHaveBeenCalledTimes(1);
    expect(second.closeAsync).toHaveBeenCalledTimes(1);
    expect(third.closeAsync).not.toHaveBeenCalled();
    await screen.rerender(
      <LocalDatabaseProvider>
        <Probe />
      </LocalDatabaseProvider>,
    );
    expect(screen.getByText('Owned database ready')).toBeTruthy();
    expect(mockOpen).toHaveBeenCalledTimes(3);
    expect(third.closeAsync).not.toHaveBeenCalled();
    expect(JSON.stringify(warning.mock.calls)).not.toContain('private detail');
  } finally {
    await screen.unmount();
    warning.mockRestore();
  }
  await waitFor(() => expect(third.closeAsync).toHaveBeenCalledTimes(1));
});
