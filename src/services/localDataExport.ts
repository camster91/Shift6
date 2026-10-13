import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { LocalDataExport } from '../db/privacyRepository';

function exportDirectory(userId: string): Directory {
  if (!userId || userId.length > 256) throw new Error('A valid local owner is required.');
  // Encode every UTF-16 unit, including separators, without collisions or traversal.
  // The terminal segment keeps a shorter owner from being an ancestor of another.
  const encoded = userId
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  return new Directory(
    Paths.cache,
    'shift6-exports',
    ...(encoded.match(/.{1,128}/g) ?? []),
    'records',
  );
}

/** File URIs keep large histories out of Android's bounded Binder text payload. */
export async function shareLocalDataExport(data: LocalDataExport): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const directory = exportDirectory(data.userId);
  directory.create({ intermediates: true, idempotent: true });
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const entry of directory.list()) {
    if (entry instanceof File && entry.modificationTime !== null && entry.modificationTime < cutoff)
      entry.delete();
  }
  const file = new File(
    directory,
    `shift6-export-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  file.create();
  file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'SHIFT6 data export',
  });
  // The receiving app may read after the share sheet closes. Retain this private
  // cache copy until a later export ages it out or local deletion removes it.
}

export async function clearLocalExportFiles(userId: string): Promise<void> {
  const directory = exportDirectory(userId);
  if (directory.exists) directory.delete();
}
