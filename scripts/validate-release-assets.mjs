import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), 'utf8'));
}

function resolveLocalPng(label, configuredPath) {
  assert(typeof configuredPath === 'string' && configuredPath.trim(), `${label} is required.`);
  const normalized = configuredPath.trim();
  assert(!/^https?:\/\//i.test(normalized), `${label} must be a repository-local release asset.`);
  assert(normalized.startsWith('./'), `${label} must use a repository-relative ./ path.`);
  assert(/\.png$/i.test(normalized), `${label} must reference a PNG file.`);
  assert(
    !/(?:draft|placeholder|temp|sample)/i.test(path.basename(normalized)),
    `${label} must not reference a draft/placeholder-named asset.`,
  );

  const absolute = path.resolve(repositoryRoot, normalized);
  const relative = path.relative(repositoryRoot, absolute);
  assert(
    relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    `${label} must stay inside the repository.`,
  );
  return absolute;
}

async function pngDimensions(label, configuredPath) {
  const absolute = resolveLocalPng(label, configuredPath);
  let buffer;
  try {
    buffer = await readFile(absolute);
  } catch {
    throw new Error(`${label} file does not exist: ${configuredPath}`);
  }

  assert(buffer.length >= 24, `${label} is not a valid PNG.`);
  assert(buffer.subarray(0, 8).equals(pngSignature), `${label} is not a valid PNG.`);
  assert(buffer.toString('ascii', 12, 16) === 'IHDR', `${label} PNG is missing IHDR.`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert(width > 0 && height > 0, `${label} PNG dimensions are invalid.`);
  return { width, height };
}

function assertHexColor(label, value) {
  assert(typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value), `${label} must be #RRGGBB.`);
}

function findPlugin(plugins, name) {
  return plugins.find((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name);
}

async function validate() {
  const appConfig = await readJson('app.json');
  const expo = appConfig.expo ?? {};

  const icon = await pngDimensions('expo.icon', expo.icon);
  assert(
    icon.width === 1024 && icon.height === 1024,
    `expo.icon must be 1024x1024 for the SHIFT6 release gate; found ${icon.width}x${icon.height}.`,
  );

  const adaptive = expo.android?.adaptiveIcon;
  assert(adaptive && typeof adaptive === 'object', 'android.adaptiveIcon is required for release.');
  const foreground = await pngDimensions(
    'android.adaptiveIcon.foregroundImage',
    adaptive.foregroundImage,
  );
  assert(
    foreground.width === foreground.height && foreground.width >= 512,
    'Android adaptive foreground must be a square PNG at least 512px.',
  );
  assertHexColor('android.adaptiveIcon.backgroundColor', adaptive.backgroundColor);

  if (adaptive.monochromeImage) {
    const monochrome = await pngDimensions(
      'android.adaptiveIcon.monochromeImage',
      adaptive.monochromeImage,
    );
    assert(
      monochrome.width === foreground.width && monochrome.height === foreground.height,
      'Android monochrome icon must match the adaptive foreground dimensions.',
    );
  } else {
    console.warn('Release warning: android.adaptiveIcon.monochromeImage is not configured.');
  }

  const splashPlugin = findPlugin(expo.plugins ?? [], 'expo-splash-screen');
  assert(Array.isArray(splashPlugin), 'expo-splash-screen must use configured plugin form for release.');
  const splashOptions = splashPlugin[1];
  assert(splashOptions && typeof splashOptions === 'object', 'expo-splash-screen release options are missing.');
  await pngDimensions('expo-splash-screen.image', splashOptions.image);
  assertHexColor('expo-splash-screen.backgroundColor', splashOptions.backgroundColor);

  console.log(
    'Validated final local PNG icon, Android adaptive icon, and configured splash-screen assets.',
  );
}

validate().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
