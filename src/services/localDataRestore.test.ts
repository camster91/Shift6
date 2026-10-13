import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pickLocalBackup } from './localDataRestore';
import { MAX_RESTORE_BYTES } from '../domain/localRestore';
const mockPick = jest.fn(),
  mockDelete = jest.fn();
let mockText = '',
  mockSize = 0;
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockPick(...args),
}));
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  File: class {
    get size() {
      return mockSize;
    }
    async text() {
      return mockText;
    }
    delete() {
      mockDelete();
    }
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockText = readFileSync(
    join(__dirname, '../../tests/fixtures/restore-schema12-synthetic.json'),
    'utf8',
  );
  mockSize = mockText.length;
  mockPick.mockResolvedValue({
    canceled: false,
    assets: [{ name: 'backup.json', uri: 'file:///cache/copied.json', size: mockSize }],
  });
});
test('picker cancellation never reads/restores or deletes a file', async () => {
  mockPick.mockResolvedValue({ canceled: true, assets: null });
  expect(await pickLocalBackup()).toBeNull();
  expect(mockDelete).not.toHaveBeenCalled();
});
test('selected backup returns a validated preview and removes only its cache copy', async () => {
  const result = await pickLocalBackup();
  expect(result?.preview.recordCount).toBe(22);
  expect(result?.serialized).toBe(mockText);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockPick).toHaveBeenCalledWith(
    expect.objectContaining({ copyToCacheDirectory: true, multiple: false }),
  );
});
test('oversized or invalid files fail before preview and cache copy is cleared', async () => {
  mockPick.mockResolvedValue({
    canceled: false,
    assets: [{ name: 'large.json', uri: 'file:///cache/large.json', size: MAX_RESTORE_BYTES + 1 }],
  });
  await expect(pickLocalBackup()).rejects.toThrow('20 MiB');
  expect(mockDelete).toHaveBeenCalledTimes(1);
  mockPick.mockResolvedValue({
    canceled: false,
    assets: [{ name: 'bad.json', uri: 'file:///cache/bad.json', size: 10 }],
  });
  mockText = 'bad JSON';
  await expect(pickLocalBackup()).rejects.toThrow('valid JSON');
  expect(mockDelete).toHaveBeenCalledTimes(2);
});
test('a provider original is never deleted by cache cleanup', async () => {
  mockPick.mockResolvedValue({
    canceled: false,
    assets: [{ name: 'backup.json', uri: 'content://provider/backup', size: mockSize }],
  });
  await pickLocalBackup();
  expect(mockDelete).not.toHaveBeenCalled();
});
