import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('vendor');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(target)));
    else if (entry.name !== 'manifest.json')
      result.push(path.relative(root, target).replaceAll(path.sep, '/'));
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
console.log(`Verified ${Object.keys(manifest.files).length} vendored source and license files.`);
