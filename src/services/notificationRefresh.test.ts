import { createTrailingRefresh } from './notificationRefresh';
test('a date saved during an in-flight refresh gets a fresh trailing read before callers resolve', async () => {
  let release: (value: string) => void = () => undefined;
  const task = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    )
    .mockResolvedValueOnce('new saved date');
  const refresh = createTrailingRefresh(task);
  const first = refresh();
  await Promise.resolve();
  const afterSave = refresh();
  expect(afterSave).toBe(first);
  release('old date');
  await expect(afterSave).resolves.toBe('new saved date');
  expect(task).toHaveBeenCalledTimes(2);
});
test('synchronous and asynchronous failures do not strand later refreshes', async () => {
  const task = jest
    .fn()
    .mockImplementationOnce(() => {
      throw new Error('failed');
    })
    .mockRejectedValueOnce(new Error('native failed'))
    .mockResolvedValueOnce('recovered');
  const refresh = createTrailingRefresh(task);
  await expect(refresh()).rejects.toThrow('failed');
  await expect(refresh()).rejects.toThrow('native failed');
  await expect(refresh()).resolves.toBe('recovered');
});
