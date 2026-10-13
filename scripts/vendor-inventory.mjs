import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

// Gradle writes into the local native module while compiling. Its shipped JS
// build/ files and android/build.gradle remain part of the verified inventory.
const generatedDirectories = new Set([
  'expo-speech-recognition/android/build',
  'expo-speech-recognition/android/.gradle',
]);

export async function validateVendorDirectory(root) {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  async function walk(directory) {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      const relative = path.relative(root, target).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        if (!generatedDirectories.has(relative)) result.push(...(await walk(target)));
      } else if (relative !== 'manifest.json') result.push(relative);
    }
    return result;
  }
  assert.deepEqual((await walk(root)).sort(), Object.keys(manifest.files).sort());
  for (const [file, expected] of Object.entries(manifest.files)) {
    assert.equal(
      createHash('sha256')
        .update(await readFile(path.join(root, file)))
        .digest('hex'),
      expected,
      file,
    );
  }
  return Object.keys(manifest.files).length;
}
