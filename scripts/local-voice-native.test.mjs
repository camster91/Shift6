import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
const fork = 'vendor/expo-speech-recognition';
test('retains licensed pinned private fork provenance and excludes lifecycle install code', async () => {
  const packageData = JSON.parse(await readFile(`${fork}/package.json`, 'utf8'));
  const provenance = await readFile(`${fork}/SHIFT6_PROVENANCE.md`, 'utf8');
  assert.equal(packageData.version, '57.1.1-shift6.1');
  assert.match(await readFile(`${fork}/LICENSE`, 'utf8'), /MIT License/);
  assert.match(
    provenance,
    /sha512-e1RalFEvc7yui9Jnf1NiEYHT0jSPeH4hbMTafj1yjvcKN7HhZ7VrQigGUhBDB9AnDNjtPugbyPuCIjwHBBOCyw==/,
  );
  assert.equal(packageData.scripts?.prepare, undefined);
  assert.equal(packageData.scripts?.prepublishOnly, undefined);
});
test('requested iOS locale is probed and unsupported local recognition fails before request preparation', async () => {
  const recognizer = await readFile(`${fork}/ios/ExpoSpeechRecognizer.swift`, 'utf8');
  const module = await readFile(`${fork}/ios/ExpoSpeechRecognitionModule.swift`, 'utf8');
  const guard = recognizer.indexOf(
    'if options.requiresOnDeviceRecognition && !recognizer.supportsOnDeviceRecognition',
  );
  assert.ok(guard > 0);
  const request = recognizer.indexOf('let request = Self.prepareRequest(', guard);
  assert.ok(request > guard);
  assert.match(
    recognizer.slice(guard, request),
    /errorHandler\(RecognizerError\.recognizerIsUnavailable\)[\s\S]*return/,
  );
  assert.match(
    module,
    /Function\("supportsOnDeviceRecognitionForLocale"\)[\s\S]*SFSpeechRecognizer\(locale: locale\)[\s\S]*recognizer\.supportsOnDeviceRecognition && recognizer\.isAvailable/,
  );
});
test('Android result callbacks cannot log raw transcript payloads', async () => {
  const service = await readFile(
    `${fork}/android/src/main/java/expo/modules/speechrecognition/ExpoSpeechService.kt`,
    'utf8',
  );
  for (const name of ['onResults', 'onPartialResults', 'onSegmentResults']) {
    const start = service.indexOf(`override fun ${name}(`);
    assert.ok(start > 0);
    const next = service.indexOf('override fun ', start + 1);
    const body = service.slice(start, next < 0 ? undefined : next);
    assert.doesNotMatch(body, /(?:Log\.[diwe]|log)\(/);
  }
  assert.match(
    service,
    /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.TIRAMISU && options\.requiresOnDeviceRecognition == true[\s\S]*SpeechRecognizer\.createOnDeviceSpeechRecognizer/,
  );
});
