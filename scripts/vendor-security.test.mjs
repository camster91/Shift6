import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateVendorDirectory } from './vendor-inventory.mjs';
const require = createRequire(import.meta.url);
const braces = createRequire(require.resolve('micromatch/package.json'))('braces');
const expoRequire = createRequire(require.resolve('expo/package.json'));
const forge = createRequire(expoRequire.resolve('@expo/cli/package.json'))('node-forge');
const decoderRequire = createRequire(require.resolve('query-string/package.json'));
const decoderPath = decoderRequire.resolve('decode-uri-component');
const decode = decoderRequire('decode-uri-component');
const { sprintf } = createRequire(require.resolve('argparse/package.json'))('sprintf-js');
const splashRequire = createRequire(require.resolve('expo-splash-screen/package.json'));
const pluginsRequire = createRequire(splashRequire.resolve('@expo/config-plugins/package.json'));
const uuid = createRequire(pluginsRequire.resolve('xcode/package.json'))('uuid');

async function vendorFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'shift6-vendor-inventory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = {};
  for (const file of [
    'expo-speech-recognition/LICENSE',
    'expo-speech-recognition/build/index.js',
    'expo-speech-recognition/android/build.gradle',
    'expo-speech-recognition/src/index.ts',
  ]) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), file);
    files[file] = createHash('sha256').update(file).digest('hex');
  }
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ files }));
  return root;
}

test('vendor inventory tolerates only the native speech module Gradle output directories', async (t) => {
  const root = await vendorFixture(t);
  for (const directory of ['build/intermediates', '.gradle/cache']) {
    const target = path.join(root, 'expo-speech-recognition/android', directory);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, 'generated.bin'), 'generated');
  }
  assert.equal(await validateVendorDirectory(root), 4);
  await writeFile(path.join(root, 'expo-speech-recognition/build/index.js'), 'changed JS');
  await assert.rejects(validateVendorDirectory(root), /build\/index\.js/);
});

test('vendor inventory rejects unexpected files even in similarly named build paths', async (t) => {
  for (const file of [
    'expo-speech-recognition/src/build/unexpected.ts',
    'expo-speech-recognition/build/unexpected.js',
    'expo-speech-recognition/android/build-extra/unexpected.bin',
    'expo-speech-recognition/android/src/build/unexpected.kt',
    'other-module/android/build/unexpected.bin',
    'expo-speech-recognition/src/manifest.json',
  ]) {
    const root = await vendorFixture(t);
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), 'unexpected');
    await assert.rejects(
      validateVendorDirectory(root),
      /Expected values to be strictly deep-equal/,
    );
  }
});

test('native build exclusions do not suppress source, build.gradle or license hash checks', async (t) => {
  for (const file of [
    'expo-speech-recognition/src/index.ts',
    'expo-speech-recognition/android/build.gradle',
    'expo-speech-recognition/LICENSE',
  ]) {
    const root = await vendorFixture(t);
    await writeFile(path.join(root, file), 'modified source');
    await assert.rejects(validateVendorDirectory(root));
  }
});

test('braces supports ordinary patterns and rejects deep patterns and externally supplied ASTs', () => {
  assert.deepEqual(braces.expand('a{b,{c,d}}'), ['ab', 'ac', 'ad']);
  assert.throws(() => braces('{'.repeat(4000) + 'a,b' + '}'.repeat(4000)), /nesting/);
  const root = { type: 'root', nodes: [] };
  let cursor = root;
  for (let i = 0; i < 5000; i++) {
    const child = { nodes: [] };
    cursor.nodes.push(child);
    cursor = child;
  }
  for (const action of [braces.compile, braces.expand, braces.stringify])
    assert.throws(() => action(root), /resource limits/);
});

test('RSA accepts valid signatures and rejects unconsumed nested DigestAlgorithm children', () => {
  const pair = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 3 });
  const md = forge.md.sha256.create().update('Shift6 verification fixture');
  const digest = md.digest().getBytes();
  assert.equal(pair.publicKey.verify(digest, pair.privateKey.sign(md)), true);
  const asn1 = forge.asn1;
  for (const includeNull of [true, false]) {
    const algorithm = [
      asn1.create(
        asn1.Class.UNIVERSAL,
        asn1.Type.OID,
        false,
        asn1.oidToDer(forge.pki.oids.sha256).getBytes(),
      ),
    ];
    if (includeNull) algorithm.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ''));
    algorithm.push(
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, 'unconsumed garbage'),
    );
    const info = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, algorithm),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, digest),
    ]);
    const signature = pair.privateKey.sign(asn1.toDer(info).getBytes(), 'NONE');
    assert.throws(() => pair.publicKey.verify(digest, signature), /DigestInfo/);
  }
});

test('the CommonJS decoder preserves legacy API and query-string compatibility', () => {
  assert.equal(decode('a+b'), 'a b');
  assert.equal(decode('%F0%9F%92%AA%25'), '💪%');
  assert.equal(decode('%FF'), '%FF');
  assert.deepEqual(
    { ...require('query-string').parse('v=%F0%9F%92%AA&x=%25') },
    { v: '💪', x: '%' },
  );
  const result = spawnSync(
    process.execPath,
    ['-e', "require(process.argv[1])('%FF'.repeat(20000))", decoderPath],
    { cwd: process.cwd(), timeout: 2000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0);
});

test('sprintf bounds hostile precision without breaking ordinary formatting', () => {
  assert.equal(sprintf('%.2f', 1.234), '1.23');
  for (const format of ['%.100000000f', '%.100000000e', '%.100000000g', '%.0g']) {
    const output = sprintf(format, 1.234);
    assert.ok(output.length < 120);
  }
});

test('UUID v3 and v5 enforce caller-provided buffer bounds while Xcode v4 stays compatible', () => {
  for (const action of [uuid.v3, uuid.v5])
    assert.throws(() => action('x', uuid.v5.DNS, new Uint8Array(8), 4), RangeError);
  assert.match(uuid.v4().replaceAll('-', '').slice(0, 24).toUpperCase(), /^[0-9A-F]{24}$/);
});
