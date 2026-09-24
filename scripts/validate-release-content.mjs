import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync(new URL('../content/release-manifest.json', import.meta.url), 'utf8'),
);
assert.equal(manifest.schemaVersion, 1, 'Unsupported release manifest schema.');
assert.equal(manifest.release, 'focused-v1');
assert(
  Array.isArray(manifest.enabledProgramIds) && manifest.enabledProgramIds.length > 0,
  'Focused release requires approved enabled Shift IDs; the checked-in draft is deliberately blocked.',
);
assert(Array.isArray(manifest.enabledExerciseIds));
assert.equal(new Set(manifest.enabledProgramIds).size, manifest.enabledProgramIds.length);
assert.equal(new Set(manifest.enabledExerciseIds).size, manifest.enabledExerciseIds.length);
execFileSync(
  process.execPath,
  ['node_modules/jest/bin/jest.js', '--runInBand', '--ci', 'src/domain/focusedRelease.test.ts'],
  { stdio: 'inherit' },
);
console.log(
  'Release manifest and domain publication gate validated. Device/human evidence remains separate.',
);
