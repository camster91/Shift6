import { readAllHealthPages } from './healthPagination';

test('collects every page in order, passing only the continuation token to the reader', async () => {
  const readPage = jest
    .fn()
    .mockResolvedValueOnce({ records: [1], pageToken: 'two' })
    .mockResolvedValueOnce({ records: [2], pageToken: 'three' })
    .mockResolvedValueOnce({ records: [3] });
  await expect(readAllHealthPages(readPage)).resolves.toEqual([1, 2, 3]);
  expect(readPage.mock.calls).toEqual([[undefined], ['two'], ['three']]);
});

test('accepts empty intermediate pages and an empty terminal token', async () => {
  const readPage = jest
    .fn()
    .mockResolvedValueOnce({ records: [], pageToken: 'two' })
    .mockResolvedValueOnce({ records: [1], pageToken: '' });
  await expect(readAllHealthPages(readPage)).resolves.toEqual([1]);
});

test('rejects a repeated token without exposing partial records', async () => {
  const readPage = jest.fn().mockResolvedValue({ records: [1], pageToken: 'same' });
  await expect(readAllHealthPages(readPage)).rejects.toThrow('repeated');
  expect(readPage).toHaveBeenCalledTimes(2);
});

test('rejects page-two failure or permission revocation without returning page one', async () => {
  const readPage = jest
    .fn()
    .mockResolvedValueOnce({ records: [1], pageToken: 'two' })
    .mockRejectedValueOnce(new Error('permission revoked'));
  await expect(readAllHealthPages(readPage)).rejects.toThrow('permission revoked');
});

test('rejects page and record bounds rather than truncating successfully', async () => {
  await expect(
    readAllHealthPages(async () => ({ records: [1], pageToken: 'next' }), {
      maxPages: 1,
      maxRecords: 10,
    }),
  ).rejects.toThrow('page limit');
  await expect(
    readAllHealthPages(async () => ({ records: [1, 2] }), { maxPages: 2, maxRecords: 1 }),
  ).rejects.toThrow('record limit');
});

test('allows a complete response exactly at the page and record bounds', async () => {
  await expect(
    readAllHealthPages(async () => ({ records: [1] }), { maxPages: 1, maxRecords: 1 }),
  ).resolves.toEqual([1]);
});

test('accepts the native nullable terminal token despite the JavaScript declaration', async () => {
  await expect(
    readAllHealthPages(async () => ({ records: [1], pageToken: null })),
  ).resolves.toEqual([1]);
});
