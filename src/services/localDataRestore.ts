import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import {
  MAX_RESTORE_BYTES,
  validateLocalBackup,
  type RestorePreview,
} from '../domain/localRestore';

export interface PickedBackup {
  name: string;
  serialized: string;
  preview: RestorePreview;
}

/** Copies a selected file into app cache for bounded reading, then removes the
 * temporary copy. The original user's backup remains at its chosen location. */
export async function pickLocalBackup(): Promise<PickedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('No backup file was selected.');
  const file = new File(asset.uri);
  try {
    const size = asset.size ?? file.size;
    if (!Number.isFinite(size) || size < 1 || size > MAX_RESTORE_BYTES)
      throw new Error('Choose a SHIFT6 export smaller than 20 MiB.');
    const serialized = await file.text();
    return { name: asset.name, serialized, preview: validateLocalBackup(serialized) };
  } finally {
    // DocumentPicker's cache copy belongs to this operation. Never delete a
    // provider's content URI or an original source outside the app cache.
    if (asset.uri.startsWith(`${Paths.cache.uri.replace(/\/$/, '')}/`)) file.delete();
  }
}
