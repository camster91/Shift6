import type { SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import { exportLocalUserData } from '../db/privacyRepository';
import { clearLocalExportFiles, shareLocalDataExport } from './localDataExport';
const mockFiles = new Map<string, { content: string; modifiedAt: number }>();
const mockDirectories = new Set<string>();
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = directory.uri + name;
    }
    create() {
      mockFiles.set(this.uri, { content: '', modifiedAt: Date.now() });
    }
    write(content: string) {
      mockFiles.set(this.uri, { content, modifiedAt: Date.now() });
    }
    get modificationTime() {
      return mockFiles.get(this.uri)?.modifiedAt ?? null;
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri =
        parts.map((p) => (typeof p === 'string' ? p : p.uri).replace(/\/$/, '')).join('/') + '/';
    }
    create() {
      mockDirectories.add(this.uri);
    }
    get exists() {
      return mockDirectories.has(this.uri);
    }
    list() {
      return [...mockFiles.keys()]
        .filter((p) => p.startsWith(this.uri))
        .map((p) => new File(this, p.slice(this.uri.length)));
    }
    delete() {
      for (const path of mockFiles.keys()) if (path.startsWith(this.uri)) mockFiles.delete(path);
      mockDirectories.delete(this.uri);
    }
  }
  return { File, Directory, Paths: { cache: 'file:///cache' } };
});
async function data(owner = 'guest-user', notes = 'test') {
  const db = {
    withExclusiveTransactionAsync: async (operation: (tx: SQLiteDatabase) => Promise<void>) =>
      operation(db as unknown as SQLiteDatabase),
    getAllAsync: async (sql: string) =>
      sql.includes('FROM workout_sessions') ? [{ id: 'session', notes }] : [],
  } as unknown as SQLiteDatabase;
  return exportLocalUserData(db, owner, '2026-10-12T12:00:00.000Z');
}
beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
  jest.clearAllMocks();
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Sharing.shareAsync).mockResolvedValue(undefined);
});
test('large histories are complete files, with a small URI passed to native sharing', async () => {
  const exportData = await data('guest-user', 'x'.repeat(2_000_000));
  await shareLocalDataExport(exportData);
  const [uri, options] = jest.mocked(Sharing.shareAsync).mock.calls[0]!;
  expect(uri.length).toBeLessThan(512);
  expect(options).toMatchObject({ mimeType: 'application/json', UTI: 'public.json' });
  expect(JSON.parse(mockFiles.get(uri)!.content)).toEqual(exportData);
  expect(mockFiles.get(uri)!.content.length).toBeGreaterThan(2_000_000);
});
test('unavailable sharing does not create a misleading export or write a cache copy', async () => {
  jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
  await expect(shareLocalDataExport(await data())).rejects.toThrow('unavailable');
  expect(mockFiles.size).toBe(0);
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});
test('deletion is owner scoped even when one long ID is a prefix of another', async () => {
  const first = 'a'.repeat(32),
    second = first + 'b';
  await shareLocalDataExport(await data(first));
  await shareLocalDataExport(await data(second));
  const secondUri = jest.mocked(Sharing.shareAsync).mock.calls[1]![0];
  await clearLocalExportFiles(first);
  expect(mockFiles.size).toBe(1);
  expect(mockFiles.has(secondUri)).toBe(true);
});
test('later exports age out old private copies while preserving the current receiver file', async () => {
  await shareLocalDataExport(await data('../owner'));
  const firstUri = jest.mocked(Sharing.shareAsync).mock.calls[0]![0];
  expect(firstUri).not.toContain('../');
  mockFiles.get(firstUri)!.modifiedAt = Date.now() - 2 * 24 * 60 * 60 * 1000;
  await shareLocalDataExport(await data('../owner'));
  const newestUri = jest.mocked(Sharing.shareAsync).mock.calls[1]![0];
  expect(mockFiles.has(firstUri)).toBe(false);
  expect(mockFiles.has(newestUri)).toBe(true);
});
