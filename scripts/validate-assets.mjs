import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const assetRoot = path.join(repositoryRoot, 'assets');
const manifestPath = path.join(assetRoot, 'asset-manifest.json');
const allowedStatuses = new Set([
  'exploration',
  'fallback-implemented',
  'human-review-required',
  'approved',
]);

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Could not read JSON at ${path.relative(repositoryRoot, filePath)}: ${error.message}`,
      { cause: error },
    );
  }
}

async function validate() {
  const manifest = await readJson(manifestPath);
  assert(manifest && typeof manifest === 'object', 'Asset manifest must be an object.');
  assert(manifest.schemaVersion === 1, 'Asset manifest schemaVersion must be 1.');
  assert(manifest.sourceOfTruth === 'Figma', 'Asset manifest sourceOfTruth must be Figma.');
  assert(
    Array.isArray(manifest.families) && manifest.families.length > 0,
    'Asset manifest must define families.',
  );

  const familyIds = new Set();
  let sourceFileCount = 0;

  for (const family of manifest.families) {
    assert(family && typeof family === 'object', 'Every asset family must be an object.');
    assert(
      typeof family.id === 'string' && family.id.trim().length > 0,
      'Every asset family needs an id.',
    );
    assert(!familyIds.has(family.id), `Duplicate asset family id: ${family.id}`);
    familyIds.add(family.id);
    assert(
      allowedStatuses.has(family.status),
      `Unsupported status for ${family.id}: ${family.status}`,
    );
    assert(
      Array.isArray(family.requiredReview) && family.requiredReview.length > 0,
      `Asset family ${family.id} must list required review gates.`,
    );

    const sourceFiles = family.sourceFiles ?? [];
    assert(Array.isArray(sourceFiles), `sourceFiles for ${family.id} must be an array.`);
    for (const sourceFile of sourceFiles) {
      assert(
        typeof sourceFile === 'string' && sourceFile.trim().length > 0,
        `Invalid source file for ${family.id}.`,
      );
      const resolvedPath = path.resolve(assetRoot, sourceFile);
      assert(isPathInside(assetRoot, resolvedPath), `Source file escapes assets/: ${sourceFile}`);
      const contents = await readFile(resolvedPath, 'utf8');
      if (path.extname(sourceFile).toLowerCase() === '.svg') {
        assert(
          /<svg(?:\s|>)/i.test(contents),
          `SVG source is missing an <svg> root: ${sourceFile}`,
        );
        assert(
          /viewBox\s*=\s*["'][^"']+["']/i.test(contents),
          `SVG source needs a viewBox: ${sourceFile}`,
        );
      }
      sourceFileCount += 1;
    }

    if (family.implementation !== undefined) {
      assert(
        typeof family.implementation === 'string' && family.implementation.trim().length > 0,
        `Invalid implementation for ${family.id}.`,
      );
      const implementationPath = path.resolve(repositoryRoot, family.implementation);
      assert(
        isPathInside(repositoryRoot, implementationPath),
        `Implementation path escapes the repository: ${family.implementation}`,
      );
      await readFile(implementationPath, 'utf8');
    }
  }

  console.log(`Validated ${familyIds.size} asset families and ${sourceFileCount} source files.`);
}

validate().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
